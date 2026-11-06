import assert from "node:assert/strict";
import test from "node:test";
import { applyPipelineOp, buildPipeline, EMPTY_PIPELINE, parsePipeline, parseUsd, stageFromCrm, type Pipeline } from "./lp-pipeline";
import { EMPTY_LEDGER, type RaiseLedger } from "./raise-model";

const NOW = "2026-11-06T15:00:00.000Z";
const people = [
  { id: "a", name: "Ada", firm: "Harbor", stage: "replied" },
  { id: "b", name: "Bea", firm: null, stage: "call_booked" },
  { id: "c", name: "Cy", firm: null, stage: null },
];

function set(pipeline: Pipeline, op: Record<string, unknown>): Pipeline {
  const result = applyPipelineOp(pipeline, { op: "set", ...op }, NOW);
  if (!result.ok) throw new Error(result.error);
  return result.pipeline;
}

test("CRM stage seeds the pipeline stage until Ryan sets one", () => {
  assert.equal(stageFromCrm("call_held"), "call_booked");
  assert.equal(stageFromCrm("queued", true), "interested");
  assert.equal(stageFromCrm(null), "reached");
  const built = buildPipeline(people, EMPTY_PIPELINE, EMPTY_LEDGER, "2026-11-06");
  assert.equal(built.rows.find((r) => r.id === "a")?.stage, "replied");
  assert.equal(built.rows.find((r) => r.id === "a")?.stageSet, "crm");
});

test("expected checks are weighted by confidence; ledger money is not counted twice", () => {
  let pipe = set(EMPTY_PIPELINE, { person_id: "a", stage: "interested", expected_usd: "$250K", confidence: "high" });
  pipe = set(pipe, { person_id: "b", expected_usd: 100000, confidence: "low" });
  const ledger: RaiseLedger = { ...EMPTY_LEDGER, commitments: [{ id: "x", name: "Cy", firm: null, amount_usd: 500000, status: "committed", person_id: "c", note: null, updated_at: NOW }] };
  const built = buildPipeline(people, pipe, ledger, "2026-11-06");
  const cy = built.rows.find((r) => r.id === "c")!;
  assert.equal(cy.stage, "committed");
  assert.equal(cy.stageSet, "ledger");
  assert.equal(built.weighted, 200000 + 20000 + 500000);
  assert.equal(built.rows[0].id, "c");
});

test("overdue next actions sort first", () => {
  const pipe = set(EMPTY_PIPELINE, { person_id: "c", next_action: "Send the deck", next_due: "2026-11-01" });
  const built = buildPipeline(people, pipe, EMPTY_LEDGER, "2026-11-06");
  assert.equal(built.rows[0].id, "c");
  assert.equal(built.rows[0].overdue, true);
});

test("the CRM due date counts until Ryan sets his own next action", () => {
  const crm = [{ id: "a", name: "Ada", firm: null, stage: "replied", next_step: "Send deck", next_step_due: "2026-11-01" }];
  assert.equal(buildPipeline(crm, EMPTY_PIPELINE, EMPTY_LEDGER, "2026-11-06").rows[0].overdue, true);
  const mine = set(EMPTY_PIPELINE, { person_id: "a", next_action: "Wait for their partner meeting" });
  assert.equal(buildPipeline(crm, mine, EMPTY_LEDGER, "2026-11-06").rows[0].overdue, false);
});

test("bad input is refused with a readable error", () => {
  assert.equal(applyPipelineOp(EMPTY_PIPELINE, { op: "set", person_id: "a", expected_usd: "lots" }).ok, false);
  assert.equal(applyPipelineOp(EMPTY_PIPELINE, { op: "set", person_id: "a", confidence: "certain" }).ok, false);
  assert.equal(applyPipelineOp(EMPTY_PIPELINE, { op: "set", person_id: "a", stage: "wired" }).ok, false);
  assert.equal(parseUsd("1.5m"), 1_500_000);
  assert.deepEqual(parsePipeline("junk").entries, {});
});
