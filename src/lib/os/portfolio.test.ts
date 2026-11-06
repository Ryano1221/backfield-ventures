import assert from "node:assert/strict";
import test from "node:test";
import { blankMemo, type MemoBook } from "./deal-memo";
import { buildPortfolio } from "./portfolio";
import type { Spv, SpvBook } from "./spv";

const NOW = "2026-11-06T15:00:00.000Z";

function spv(over: Partial<Spv>): Spv {
  return { id: "s", name: "Backfield X SPV", company: "X", deal_id: null, status: "forming", target_usd: null, min_check_usd: null, carry_pct: null, fee_pct: null, close_date: null, steps: [], notes: "", next_action: "", allocations: [], created_at: NOW, updated_at: NOW, ...over };
}

const memos: MemoBook = {
  version: 1,
  deals: {
    d_north: { ...blankMemo(NOW), decision: "invest", reason: "Great team", decided_at: "2026-10-01T00:00:00.000Z" },
    d_cedar: { ...blankMemo(NOW), decision: "invest", reason: "Fast growth", decided_at: "2026-10-05T00:00:00.000Z" },
    d_pass: { ...blankMemo(NOW), decision: "pass", reason: "No", decided_at: NOW },
  },
};

const book: SpvBook = {
  version: 1,
  spvs: [
    spv({ id: "s1", company: "Northwind", name: "Backfield Northwind SPV", deal_id: "d_north", status: "raising", allocations: [
      { id: "a", name: "Ada", person_id: null, amount_usd: 50000, status: "committed", note: "", updated_at: NOW },
      { id: "b", name: "Bea", person_id: null, amount_usd: 9000, status: "soft", note: "", updated_at: NOW },
    ] }),
    spv({ id: "s2", company: "Oak", name: "Backfield Oak SPV", status: "closed", allocations: [{ id: "c", name: "Cy", person_id: null, amount_usd: 200000, status: "wired", note: "", updated_at: NOW }] }),
    spv({ id: "s3", company: "Gone", status: "cancelled" }),
    spv({ id: "s4", company: "Early", status: "forming" }),
  ],
};

test("closed SPVs are investments, linked SPVs replace their memo, and plain invest decisions still show", () => {
  const p = buildPortfolio(memos, book, (id) => (id === "d_cedar" ? "Cedar" : null), Date.parse(NOW));
  assert.deepEqual(p.rows.map((r) => [r.company, r.stage]), [["Oak", "invested"], ["Northwind", "raising"], ["Cedar", "decided"]]);
  assert.equal(p.invested, 1);
  assert.equal(p.deployed, 200000);
  assert.equal(p.decided, 2);
  assert.equal(p.rows[1].amount, 50000);
  assert.equal(p.rows[1].investors, 1);
  assert.equal(p.rows[1].reason, "Great team");
  assert.equal(p.rows[1].label, "SPV raising");
});

test("forming SPVs with no invest decision and passed deals stay out", () => {
  const p = buildPortfolio(memos, book, () => null, Date.parse(NOW));
  assert.ok(!p.rows.some((r) => r.company === "Early" || r.company === "Gone" || r.dealId === "d_pass"));
});
