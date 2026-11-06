import assert from "node:assert/strict";
import test from "node:test";
import { investorHistory } from "./investor-history";
import { EMPTY_PIPELINE } from "./lp-pipeline";
import { EMPTY_LEDGER } from "./raise-model";
import type { SpvBook } from "./spv";

const NOW = "2026-11-06T15:00:00.000Z";
const spvs: SpvBook = {
  version: 1,
  spvs: [
    { id: "s1", name: "Backfield Northwind SPV", company: "Northwind", deal_id: null, status: "raising", target_usd: 500000, min_check_usd: null, carry_pct: 20, fee_pct: 0, close_date: null, steps: [], notes: "", next_action: "", created_at: NOW, updated_at: NOW,
      allocations: [
        { id: "a1", name: "Ada North", person_id: "p1", amount_usd: 50000, status: "wired", note: "", updated_at: NOW },
        { id: "a2", name: "Someone Else", person_id: "p9", amount_usd: 20000, status: "soft", note: "", updated_at: NOW },
      ] },
    { id: "s2", name: "Backfield Cedar SPV", company: "Cedar", deal_id: null, status: "cancelled", target_usd: null, min_check_usd: null, carry_pct: null, fee_pct: null, close_date: null, steps: [], notes: "", next_action: "", created_at: NOW, updated_at: NOW,
      allocations: [{ id: "a3", name: "Ada North", person_id: "p1", amount_usd: 10000, status: "committed", note: "", updated_at: NOW }] },
  ],
};

test("an investor's fund commitment and SPV allocations come together; cancelled SPVs are left out", () => {
  const ledger = { ...EMPTY_LEDGER, commitments: [{ id: "c1", name: "ada north", firm: null, amount_usd: 250000, status: "soft" as const, person_id: null, note: null, updated_at: NOW }] };
  const h = investorHistory({ id: "p1", name: "Ada North" }, ledger, EMPTY_PIPELINE, spvs);
  assert.deepEqual(h.rows.map((r) => r.kind), ["fund", "spv"]);
  assert.equal(h.committed, 50000);
  assert.equal(h.soft, 250000);
});

test("without a fund commitment, the pipeline entry shows instead", () => {
  const pipeline = { version: 1 as const, entries: { p1: { stage: "interested" as const, expected_usd: 100000, confidence: "high" as const, next_action: "", next_due: null, updated_at: NOW } } };
  const h = investorHistory({ id: "p1", name: "Ada North" }, EMPTY_LEDGER, pipeline, spvs);
  assert.equal(h.rows[0].kind, "pipeline");
  assert.equal(h.rows[0].detail, "Interested · High (80%) confidence");
  assert.equal(h.rows[0].amount, 100000);
});

test("an SPV investor's stake is valued from the SPV's holding, and the statement reads plainly", async () => {
  const { investorStatement } = await import("./investor-history");
  const holdings = {
    version: 1 as const,
    holdings: [
      { id: "h1", company: "Northwind", deal_id: null, spv_id: "s1", vehicle: "spv" as const, instrument: "safe" as const, invested_usd: 500000, date: "2025-01-01", valuation_usd: 10000000, ownership_pct: null, status: "active" as const, marks: [{ id: "m", date: "2026-06-01", value_usd: 1500000, note: "" }], distributions: [], notes: "", created_at: NOW, updated_at: NOW },
    ],
  };
  const h = investorHistory({ id: "p1", name: "Ada North" }, EMPTY_LEDGER, EMPTY_PIPELINE, spvs, holdings);
  const row = h.rows.find((r) => r.kind === "spv")!;
  assert.equal(row.moic, 3);
  assert.equal(row.value, 150000);
  assert.equal(h.valueNow, 150000);
  const text = investorStatement("Ada North", h.rows, "2026-11-06");
  assert.match(text, /^Hi Ada,/);
  assert.match(text, /as of November 6, 2026/);
  assert.match(text, /Northwind SPV: \$50K in, marked at \$150K \(3\.00x\)\./);
  assert.match(text, /before carry and fees/);
  assert.doesNotMatch(text, /Someone Else/);
});
