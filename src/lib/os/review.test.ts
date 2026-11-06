import assert from "node:assert/strict";
import test from "node:test";
import { EMPTY_HOLDINGS, type HoldingBook } from "./holdings";
import { weeklyReview, type ReviewInputs } from "./review";
import { EMPTY_SPVS, type Spv, type SpvBook } from "./spv";

const NOW_ISO = "2026-11-06T15:00:00.000Z";
const NOW = Date.parse(NOW_ISO);

function spv(over: Partial<Spv>): Spv {
  return { id: "s", name: "S", company: "Co", deal_id: null, status: "raising", target_usd: 500000, min_check_usd: null, carry_pct: null, fee_pct: null, close_date: null, steps: [], notes: "", next_action: "", allocations: [], created_at: NOW_ISO, updated_at: NOW_ISO, ...over };
}

const base: ReviewInputs = { spvs: EMPTY_SPVS, holdings: EMPTY_HOLDINGS, fund: { target: null, hard: 0, daysLeft: null }, goingCold: [], overdue: [], unratedPitches: 0, decisionsWaiting: 0, contentWaiting: 0, now: NOW };

test("an empty firm reads all clear", () => {
  const items = weeklyReview(base);
  assert.ok(items.every((item) => item.count === 0));
  assert.equal(items.find((i) => i.key === "wires")?.detail, "Every committed SPV dollar is wired.");
  assert.equal(items.some((i) => i.key === "fund"), false, "no Fund I check without a target");
});

test("wires, closings, unbooked SPVs and stale marks are all caught", () => {
  const spvs: SpvBook = {
    version: 1,
    spvs: [
      spv({ id: "a", company: "Northwind", close_date: "2026-11-12", allocations: [{ id: "x", name: "Ada", person_id: null, amount_usd: 60000, status: "committed", note: "", updated_at: NOW_ISO }] }),
      spv({ id: "b", company: "Oak", status: "closed", allocations: [{ id: "y", name: "Bo", person_id: null, amount_usd: 90000, status: "wired", note: "", updated_at: NOW_ISO }] }),
    ],
  };
  const holdings: HoldingBook = {
    version: 1,
    holdings: [{ id: "h", company: "Pine", deal_id: null, spv_id: null, vehicle: "fund", instrument: "safe", invested_usd: 1, date: "2025-01-01", valuation_usd: null, ownership_pct: null, status: "active", marks: [], distributions: [], notes: "", created_at: NOW_ISO, updated_at: NOW_ISO }],
  };
  const items = weeklyReview({ ...base, spvs, holdings, fund: { target: 10_000_000, hard: 2_500_000, daysLeft: 200 }, goingCold: [{ name: "Cy", days: 30 }] });
  const get = (key: string) => items.find((i) => i.key === key)!;
  assert.equal(get("wires").detail, "$60K committed but not wired on Northwind.");
  assert.equal(get("closing").count, 1);
  assert.equal(get("unbooked").detail, "Record Oak as holdings.");
  assert.equal(get("marks").detail, "Ask for an update from Pine.");
  assert.equal(get("fund").detail, "$7.5M left to raise in 200 days.");
  assert.equal(get("fund").count, 0, "far from the close, Fund I is not an action item");
  assert.equal(get("cold").count, 1);
});
