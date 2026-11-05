import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildCommand } from "./command";
import { applyRaiseOp, EMPTY_LEDGER, parseLedger, parseMoney, summarizeRaise, usd, type RaiseLedger } from "./raise-model";
import type { Snapshot } from "./types";

const NOW = Date.parse("2026-11-05T17:00:00.000Z");
const at = new Date(NOW);

function ledger(): RaiseLedger {
  let next: RaiseLedger = { ...EMPTY_LEDGER };
  for (const op of [
    { op: "settings", target_usd: "$10m", close_date: "2027-03-31" },
    { op: "upsert", commitment: { name: "Example LP One", amount_usd: "$250k", status: "committed" } },
    { op: "upsert", commitment: { name: "Example LP Two", amount_usd: "1,000,000", status: "wired" } },
    { op: "upsert", commitment: { name: "Example LP Three", amount_usd: "500000", status: "soft" } },
  ]) {
    const result = applyRaiseOp(next, op, at);
    assert.equal(result.ok, true, JSON.stringify(op));
    if (result.ok) next = result.ledger;
  }
  return next;
}

test("money parses the ways people type it", () => {
  assert.equal(parseMoney("$250k"), 250_000);
  assert.equal(parseMoney("1.5m"), 1_500_000);
  assert.equal(parseMoney("1,000,000"), 1_000_000);
  assert.ok(Number.isNaN(parseMoney("lots")));
  assert.equal(usd(1_250_000), "$1.25M");
  assert.equal(usd(250_000), "$250K");
  assert.equal(usd(10_000_000), "$10M");
});

test("the raise summary adds hard and soft money and the pace", () => {
  const summary = summarizeRaise(ledger(), NOW);
  assert.equal(summary.target, 10_000_000);
  assert.equal(summary.hard, 1_250_000);
  assert.equal(summary.soft, 500_000);
  assert.equal(summary.lpCount, 2);
  assert.equal(summary.softCount, 1);
  assert.equal(Math.round(summary.pctHard ?? 0), 13);
  assert.equal(summary.remaining, 8_750_000);
  assert.ok((summary.daysLeft ?? 0) > 140 && (summary.daysLeft ?? 0) < 150);
  assert.ok((summary.perWeekNeeded ?? 0) > 400_000);
});

test("bad input is refused with a plain reason", () => {
  assert.deepEqual(applyRaiseOp(EMPTY_LEDGER, { op: "upsert", commitment: { name: "", amount_usd: "5" } }, at), { ok: false, error: "Add the LP's name" });
  assert.deepEqual(applyRaiseOp(EMPTY_LEDGER, { op: "upsert", commitment: { name: "X", amount_usd: "lots" } }, at), { ok: false, error: "Add an amount in dollars" });
  assert.deepEqual(applyRaiseOp(EMPTY_LEDGER, { op: "settings", close_date: "next spring" }, at), { ok: false, error: "Close date must look like 2027-03-31" });
  assert.deepEqual(applyRaiseOp(EMPTY_LEDGER, { op: "remove", id: "nope" }, at), { ok: false, error: "That commitment is gone" });
});

test("edits replace a row and removes drop it", () => {
  const base = ledger();
  const row = base.commitments.find((item) => item.name === "Example LP Three")!;
  const edited = applyRaiseOp(base, { op: "upsert", commitment: { ...row, status: "committed" } }, at);
  assert.equal(edited.ok, true);
  if (!edited.ok) return;
  assert.equal(edited.ledger.commitments.length, 3);
  assert.equal(summarizeRaise(edited.ledger, NOW).hard, 1_750_000);
  const removed = applyRaiseOp(edited.ledger, { op: "remove", id: row.id }, at);
  assert.equal(removed.ok && removed.ledger.commitments.length, 2);
  assert.deepEqual(parseLedger(JSON.stringify(base)), base);
  assert.deepEqual(parseLedger("not json"), EMPTY_LEDGER);
});

test("the command strip chases LPs and skips ones already in", () => {
  const snapshot: Snapshot = JSON.parse(readFileSync(path.join(process.cwd(), "src/fixtures/os-dashboard.sample.json"), "utf8"));
  const people = snapshot.crm.people.map((person, index) => ({ ...person, lp: index < 3, next_step_due: index === 0 ? "2026-11-01" : person.next_step_due ?? null }));
  const lpName = people[1]!.name;
  const book = { ...ledger(), commitments: [...ledger().commitments, { id: "c-test-1", name: lpName, firm: null, amount_usd: 100_000, status: "committed" as const, person_id: null, note: null, updated_at: at.toISOString() }] };
  const model = buildCommand({ ...snapshot, crm: { ...snapshot.crm, people } }, book, null, NOW);
  assert.equal(model.chase.some((row) => row.name === lpName), false);
  assert.equal(model.chase[0]?.overdue, true);
  assert.ok(model.due.some((row) => row.id === people[0]!.id));
  assert.equal(model.raise.hard, 1_350_000);
  assert.ok(model.deals.reviewing >= 0);
});

test("next steps read as one short action", async () => {
  const { shortStep } = await import("./command");
  assert.equal(
    shortStep("Nudge with 3 open slots + link sent 10/27 12:27pm CT (approved). Await pick; bring any time back first. Day-12 nudge if no reply."),
    "Nudge with 3 open slots + link sent 10/27",
  );
  assert.equal(shortStep("Send the sample one-pager"), "Send the sample one-pager");
  assert.ok(shortStep("word ".repeat(40)).length <= 80);
});

test("the LP funnel is cumulative and counts ledger commitments", async () => {
  const { lpFunnel } = await import("./command");
  const snapshot: Snapshot = JSON.parse(readFileSync(path.join(process.cwd(), "src/fixtures/os-dashboard.sample.json"), "utf8"));
  const base = snapshot.crm.people[0]!;
  const people = ["contacted", "replied", "call_held", "data_room", "soft_circle"].map((stage, index) => ({ ...base, id: `lp-${index}`, name: `Example LP ${index}`, lp: true, im_in: false, stage }));
  const steps = lpFunnel({ ...snapshot, crm: { ...snapshot.crm, people } }, ledger());
  assert.deepEqual(
    steps.map((step) => step.count),
    [5, 4, 3, 3, 3, 2],
  );
});
