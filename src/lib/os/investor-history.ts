/**
 * Everything one person is doing with Backfield, across Fund I and SPVs:
 * their fund commitment, where they sit in the LP pipeline, and each SPV
 * allocation. Matched by CRM id first, then by exact name.
 */
import { CONFIDENCE_LABEL, STAGE_LABEL, type Pipeline } from "./lp-pipeline";
import { viewHolding, type HoldingBook } from "./holdings";
import { usd, type RaiseLedger } from "./raise-model";
import { ALLOC_LABEL, SPV_STATUS_LABEL, type SpvBook } from "./spv";

export type HistoryRow = {
  kind: "fund" | "pipeline" | "spv";
  label: string;
  detail: string;
  amount: number | null;
  spvId?: string;
  /** What their share is worth now, from the SPV's holding marks, before carry and fees. */
  value?: number | null;
  moic?: number | null;
  company?: string;
};

export function investorHistory(person: { id: string; name: string }, ledger: RaiseLedger, pipeline: Pipeline, spvs: SpvBook, holdings?: HoldingBook): { rows: HistoryRow[]; committed: number; soft: number; valueNow: number | null } {
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
      const holding = alloc.status === "soft" ? undefined : holdings?.holdings.find((h) => h.spv_id === spv.id);
      const moic = holding ? viewHolding(holding).moic : null;
      rows.push({
        kind: "spv",
        label: spv.name,
        detail: `${ALLOC_LABEL[alloc.status]} · SPV ${SPV_STATUS_LABEL[spv.status].toLowerCase()}`,
        amount: alloc.amount_usd,
        spvId: spv.id,
        company: spv.company,
        moic,
        value: moic == null ? null : Math.round(alloc.amount_usd * moic),
      });
      if (alloc.status === "soft") soft += alloc.amount_usd;
      else committed += alloc.amount_usd;
    }
  }
  const valued = rows.filter((row) => row.value != null);
  return { rows, committed, soft, valueNow: valued.length ? valued.reduce((sum, row) => sum + (row.value ?? 0), 0) : null };
}

/**
 * A plain capital account note for one investor, to paste into an email.
 * Built only from the OS's own records. Values are before carry and fees.
 */
export function investorStatement(name: string, rows: HistoryRow[], asOf: string, fund = "Fund I"): string {
  const first = name.trim().split(/\s+/)[0] || name;
  const date = new Date(`${asOf.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  const lines = [`Hi ${first},`, "", `Here is where you stand with Backfield as of ${date}.`, ""];
  const fundRow = rows.find((row) => row.kind === "fund");
  if (fundRow && fundRow.amount) lines.push(`${fund}: ${usd(fundRow.amount)} (${fundRow.detail.toLowerCase()}).`);
  const spvRows = rows.filter((row) => row.kind === "spv" && !row.detail.startsWith("Soft"));
  for (const row of spvRows) {
    const worth = row.value != null && row.moic != null ? `, marked at ${usd(row.value)} (${row.moic.toFixed(2)}x)` : ", held at cost until the next round";
    lines.push(`${row.company ?? row.label} SPV: ${usd(row.amount ?? 0)} in${worth}.`);
  }
  if (!fundRow && !spvRows.length) lines.push("Nothing committed yet.");
  if (spvRows.some((row) => row.value != null)) lines.push("", "Marks are from the latest priced round or update, before carry and fees.");
  lines.push("", "Happy to walk through any of it.", "", "Ryan");
  return lines.join("\n");
}
