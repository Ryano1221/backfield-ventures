import assert from "node:assert/strict";
import test from "node:test";
import { applyMemoOp, EMPTY_MEMOS, parseMemos } from "./deal-memo";

const NOW = "2026-11-06T15:00:00.000Z";

test("invest or pass needs a written reason", () => {
  assert.equal(applyMemoOp(EMPTY_MEMOS, { op: "set", deal_id: "p1", decision: "pass" }, NOW).ok, false);
  const ok = applyMemoOp(EMPTY_MEMOS, { op: "set", deal_id: "p1", reason: "Too early for us.", decision: "pass" }, NOW);
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.book.deals.p1.decision, "pass");
    assert.equal(ok.book.deals.p1.decided_at, NOW);
  }
});

test("diligence needs no reason, and the checklist keeps only known items", () => {
  const result = applyMemoOp(EMPTY_MEMOS, { op: "set", deal_id: "p1", decision: "diligence", checks: ["Team", "Vibes", "Market"] }, NOW);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.book.deals.p1.checks, ["Team", "Market"]);
    assert.equal(result.book.deals.p1.decided_at, null);
    assert.equal(result.book.deals.p1.owner, "Ryan");
  }
});

test("bad input is refused and junk storage parses to empty", () => {
  assert.equal(applyMemoOp(EMPTY_MEMOS, { op: "set", deal_id: "p1", decision: "maybe" }).ok, false);
  assert.equal(applyMemoOp(EMPTY_MEMOS, { op: "set", deal_id: "p1", next_due: "soon" }).ok, false);
  assert.deepEqual(parseMemos("nope").deals, {});
});
