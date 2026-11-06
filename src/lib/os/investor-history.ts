/**
 * Everything one person is doing with Backfield, across Fund I and SPVs:
 * their fund commitment, where they sit in the LP pipeline, and each SPV
 * allocation. Matched by CRM id first, then by exact name.
 */
import { CONFIDENCE_LABEL, STAGE_LABEL, type Pipeline } from "./lp-pipeline";
import type { RaiseLedger } from "./raise-model";
import { ALLOC_LABEL, SPV_STATUS_LABEL, type SpvBook } from "./spv";

export type HistoryRow = { kind: "fund" | "pipeline" | "spv"; label: string; detail: string; amount: number | null; spvId?: string };

export function investorHistory(person: { id: string; name: string }, ledger: RaiseLedger, pipeline: Pipeline, spvs: SpvBook): { rows: HistoryRow[]; committed: number; soft: number } {
  const name = person.name.trim().toLowerCase();
  const same = (id: string | null, other: string) => (id ? id === person.id : other.trim().toLowerCase() === name);
  const rows: HistoryRow[] = [];
  let committed = 0;
  let soft = 0;

  const fund = ledger.commitments.find((row) => same(row.person_id, row.name));
  if (fund) {
    rows.push({ kind: "fund", label: ledger.fund || "Fund I", detail: STAGE_LABEL[fund.status], amount: fund.amount_usd });
    if (fund.status === "soft") soft += fund.amount_usd;
    else committed += fund.amount_usd;
  } else {
    const entry = pipeline.entries[person.id];
    if (entry && (entry.stage || entry.expected_usd || entry.confidence)) {
      const bits = [entry.stage ? STAGE_LABEL[entry.stage] : null, entry.confidence ? `${CONFIDENCE_LABEL[entry.confidence]} confidence` : null].filter(Boolean);
      rows.push({ kind: "pipeline", label: `${ledger.fund || "Fund I"} pipeline`, detail: bits.join(" · ") || "In the pipeline", amount: entry.expected_usd });
    }
  }

  for (const spv of spvs.spvs) {
    if (spv.status === "cancelled") continue;
    for (const alloc of spv.allocations) {
      if (!same(alloc.person_id, alloc.name)) continue;
      rows.push({ kind: "spv", label: spv.name, detail: `${ALLOC_LABEL[alloc.status]} · SPV ${SPV_STATUS_LABEL[spv.status].toLowerCase()}`, amount: alloc.amount_usd, spvId: spv.id });
      if (alloc.status === "soft") soft += alloc.amount_usd;
      else committed += alloc.amount_usd;
    }
  }
  return { rows, committed, soft };
}
