import assert from "node:assert/strict";
import test from "node:test";
import { applySpvOp, EMPTY_SPVS, parseSpvs, spvNext, summarizeSpv, SPV_STEPS, type SpvBook } from "./spv";

const NOW = "2026-11-06T15:00:00.000Z";
const NOW_MS = Date.parse(NOW);

function step(book: SpvBook, op: Record<string, unknown>): SpvBook {
  let n = 0;
  const result = applySpvOp(book, op, NOW, (prefix) => `${prefix}_${++n}`);
  if (!result.ok) throw new Error(result.error);
  return result.book;
}

function make(): SpvBook {
  return step(EMPTY_SPVS, { op: "create", company: "Northwind", deal_id: "pitch_northwind" });
}

test("an SPV starts forming, named after the company and linked to its deal", () => {
  const spv = make().spvs[0];
  assert.equal(spv.name, "Backfield Northwind SPV");
  assert.equal(spv.deal_id, "pitch_northwind");
  assert.equal(spv.status, "forming");
  assert.equal(spvNext(spv, NOW_MS), "Set the target and terms.");
});

test("allocations roll up: soft separate from hard, progress against target, below-minimum flagged", () => {
  let book = make();
  const id = book.spvs[0].id;
  book = step(book, { op: "update", id, target_usd: "$500K", min_check_usd: "$10K", carry_pct: "20", fee_pct: 0, close_date: "2026-11-20" });
  book = step(book, { op: "allocate", id, name: "Ada", amount_usd: "$100K", status: "committed" });
  book = step(book, { op: "allocate", id, name: "Bea", amount_usd: 50000, status: "wired" });
  book = step(book, { op: "allocate", id, name: "Cy", amount_usd: "$5K", status: "soft" });
  const s = summarizeSpv(book.spvs[0], NOW_MS);
  assert.equal(s.hard, 150000);
  assert.equal(s.soft, 5000);
  assert.equal(s.pctHard, 30);
  assert.equal(s.remaining, 350000);
  assert.deepEqual(s.belowMin, ["Cy"]);
  assert.equal(s.daysLeft, 15);
  assert.equal(spvNext(book.spvs[0], NOW_MS), "Raise $350K more in 15 days.");
});

test("the checklist keeps known steps in order and names the next one", () => {
  let book = make();
  const id = book.spvs[0].id;
  book = step(book, { op: "update", id, target_usd: 100000, steps: ["Entity formed", "Terms confirmed with the company", "Made up step"] });
  book = step(book, { op: "allocate", id, name: "Ada", amount_usd: 100000, status: "wired" });
  const s = summarizeSpv(book.spvs[0], NOW_MS);
  assert.equal(s.stepsDone, 2);
  assert.equal(s.nextStep, SPV_STEPS[1]);
  assert.equal(spvNext(book.spvs[0], NOW_MS), "Next: allocation confirmed.");
});

test("bad input is refused with a readable error", () => {
  const book = make();
  const id = book.spvs[0].id;
  assert.equal(applySpvOp(EMPTY_SPVS, { op: "create", company: " " }).ok, false);
  assert.equal(applySpvOp(book, { op: "update", id, carry_pct: 120 }).ok, false);
  assert.equal(applySpvOp(book, { op: "allocate", id, name: "Ada", amount_usd: "lots", status: "soft" }).ok, false);
  assert.equal(applySpvOp(book, { op: "allocate", id, name: "Ada", amount_usd: 1000, status: "maybe" }).ok, false);
  assert.deepEqual(parseSpvs("junk").spvs, []);
});

test("Today shows open SPVs closing within two weeks, soonest first", async () => {
  const { spvsForToday } = await import("./spv");
  let book = make();
  const a = book.spvs[0].id;
  book = step(book, { op: "update", id: a, target_usd: 100000, close_date: "2026-11-08" });
  book = step(book, { op: "create", company: "Far Co" });
  const far = book.spvs[0].id;
  book = step(book, { op: "update", id: far, close_date: "2027-01-30" });
  const rows = spvsForToday(book, NOW_MS);
  assert.deepEqual(rows.map((r) => r.id), [a]);
  assert.equal(rows[0].urgent, true);
});

test("once the money is promised, the next step is collecting wires", () => {
  let book = make();
  const id = book.spvs[0].id;
  book = step(book, { op: "update", id, target_usd: 100000 });
  book = step(book, { op: "allocate", id, name: "Ada", amount_usd: 60000, status: "committed" });
  book = step(book, { op: "allocate", id, name: "Bea", amount_usd: 40000, status: "wired" });
  assert.equal(spvNext(book.spvs[0], NOW_MS), "Collect $60K in wires from 1 investor.");
});
