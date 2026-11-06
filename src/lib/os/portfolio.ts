import type { MemoBook } from "./deal-memo";
import { summarizeSpv, type SpvBook } from "./spv";

/**
 * Every company Backfield has decided to back, in one list. A company comes
 * in through a closed SPV, an SPV still raising, or an invest decision on a
 * deal. One row per company: an SPV wins over the memo it came from.
 */
export type PortfolioStage = "invested" | "raising" | "decided";

export const PORTFOLIO_STAGE_LABEL: Record<PortfolioStage, string> = {
  invested: "Invested",
  raising: "SPV raising",
  decided: "Decided to invest",
};

export type PortfolioRow = {
  key: string;
  company: string;
  stage: PortfolioStage;
  label: string;
  /** Only when it adds something: a custom SPV name, or how a decided deal will be funded. */
  vehicle: string | null;
  amount: number | null;
  investors: number | null;
  since: string | null;
  spvId: string | null;
  dealId: string | null;
  reason: string;
};

export type Portfolio = { rows: PortfolioRow[]; invested: number; deployed: number; decided: number };

const ORDER: Record<PortfolioStage, number> = { invested: 0, raising: 1, decided: 2 };

export function buildPortfolio(memos: MemoBook, spvs: SpvBook, companyOf: (dealId: string) => string | null, now = Date.now()): Portfolio {
  const rows: PortfolioRow[] = [];
  const claimedDeals = new Set<string>();
  for (const spv of spvs.spvs) {
    if (spv.status === "cancelled") continue;
    const memo = spv.deal_id ? memos.deals[spv.deal_id] : undefined;
    const backed = spv.status === "closed" || spv.status === "closing" || memo?.decision === "invest";
    if (!backed) continue;
    if (spv.deal_id) claimedDeals.add(spv.deal_id);
    const s = summarizeSpv(spv, now);
    rows.push({
      key: `spv:${spv.id}`,
      company: spv.company,
      stage: spv.status === "closed" ? "invested" : "raising",
      label: spv.status === "closed" ? "Invested through an SPV" : `SPV ${spv.status}`,
      vehicle: spv.name === `Backfield ${spv.company} SPV` ? null : spv.name,
      amount: spv.status === "closed" ? s.wired || s.hard : s.hard,
      investors: spv.allocations.filter((row) => row.status !== "soft").length,
      since: spv.status === "closed" ? spv.updated_at : memo?.decided_at ?? spv.created_at,
      spvId: spv.id,
      dealId: spv.deal_id,
      reason: memo?.reason ?? "",
    });
  }
  for (const [dealId, memo] of Object.entries(memos.deals)) {
    if (memo.decision !== "invest" || claimedDeals.has(dealId)) continue;
    rows.push({
      key: `deal:${dealId}`,
      company: companyOf(dealId) ?? dealId,
      stage: "decided",
      label: PORTFOLIO_STAGE_LABEL.decided,
      vehicle: "no SPV set up yet",
      amount: null,
      investors: null,
      since: memo.decided_at,
      spvId: null,
      dealId,
      reason: memo.reason,
    });
  }
  rows.sort((a, b) => ORDER[a.stage] - ORDER[b.stage] || (b.since ?? "").localeCompare(a.since ?? "") || a.company.localeCompare(b.company));
  const invested = rows.filter((row) => row.stage === "invested");
  return {
    rows,
    invested: invested.length,
    deployed: invested.reduce((sum, row) => sum + (row.amount ?? 0), 0),
    decided: rows.filter((row) => row.stage !== "invested").length,
  };
}
