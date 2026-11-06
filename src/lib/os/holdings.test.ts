import assert from "node:assert/strict";
import test from "node:test";
import { applyHoldingOp, bookMetrics, EMPTY_HOLDINGS, money, ownershipOf, parseHoldings, viewHolding, xirr, type HoldingBook } from "./holdings";

const NOW = "2026-11-06T15:00:00.000Z";

function step(book: HoldingBook, op: Record<string, unknown>): HoldingBook {
  let n = 0;
  const r = applyHoldingOp(book, op, NOW, (p) => `${p}_${++n}_${book.holdings.length}`);
  if (!r.ok) throw new Error(r.error);
  return r.book;
}

test("money reads the ways people type it", () => {
  assert.equal(money("$250K"), 250000);
  assert.equal(money("1.5M"), 1500000);
  assert.equal(money("250,000"), 250000);
  assert.equal(money("lots"), null);
});

test("a check on a $10M cap owns 1%; a new round at $40M marks it to 4x", () => {
  let book = step(EMPTY_HOLDINGS, { op: "create", company: "Northwind", invested_usd: "$100K", valuation_usd: "$10M", date: "2025-01-15", vehicle: "spv", instrument: "safe" });
  const id = book.holdings[0].id;
  assert.equal(ownershipOf(book.holdings[0]), 1);
  assert.equal(viewHolding(book.holdings[0]).atCost, true);
  book = step(book, { op: "mark", id, date: "2026-06-01", round_valuation_usd: "$40M", note: "Series A" });
  const v = viewHolding(book.holdings[0]);
  assert.equal(v.value, 400000);
  assert.equal(v.moic, 4);
  assert.equal(v.atCost, false);
});

test("fund metrics: TVPI counts what is left plus what came back; DPI only what came back", () => {
  let book = step(EMPTY_HOLDINGS, { op: "create", company: "A", invested_usd: 100000, date: "2024-01-01" });
  book = step(book, { op: "create", company: "B", invested_usd: 100000, date: "2024-01-01" });
  const a = book.holdings.find((h) => h.company === "A")!.id;
  const b = book.holdings.find((h) => h.company === "B")!.id;
  book = step(book, { op: "mark", id: a, value_usd: 300000, date: "2026-01-01" });
  book = step(book, { op: "distribute", id: b, amount_usd: 50000, date: "2025-06-01" });
  book = step(book, { op: "update", id: b, status: "written_off" });
  const m = bookMetrics(book.holdings, NOW);
  assert.equal(m.invested, 200000);
  assert.equal(m.value, 300000);
  assert.equal(m.realized, 50000);
  assert.equal(m.tvpi, 1.75);
  assert.equal(m.dpi, 0.25);
  assert.ok(m.irr != null && m.irr > 0.2 && m.irr < 0.3, `irr ${m.irr}`);
});

test("IRR: doubling in exactly one year is 100%; too short a history gives none", () => {
  const r = xirr([{ date: "2025-01-01", amount: -100 }, { date: "2026-01-01", amount: 200 }]);
  assert.ok(r != null && Math.abs(r - 1) < 0.01);
  assert.equal(xirr([{ date: "2026-10-01", amount: -100 }, { date: "2026-11-01", amount: 200 }]), null);
});

test("bad input is refused, and junk storage reads as empty", () => {
  assert.equal(applyHoldingOp(EMPTY_HOLDINGS, { op: "create", company: "A" }).ok, false);
  assert.equal(applyHoldingOp(EMPTY_HOLDINGS, { op: "create", company: "A", invested_usd: 1, ownership_pct: 140 }).ok, false);
  const book = step(EMPTY_HOLDINGS, { op: "create", company: "A", invested_usd: 1000 });
  assert.equal(applyHoldingOp(book, { op: "mark", id: book.holdings[0].id, round_valuation_usd: "$5M" }).ok, false, "no ownership, no round-based mark");
  assert.deepEqual(parseHoldings("{").holdings, []);
});
