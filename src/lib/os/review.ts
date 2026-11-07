/**
 * The weekly review: one checklist across the whole firm, built from what the
 * OS already knows. Each check says how many things need Ryan and where to go.
 * A check with nothing in it reads as clear, so the page doubles as proof
 * that nothing is slipping.
 */
import { viewHolding, type HoldingBook } from "./holdings";
import { usd } from "./raise-model";
import { summarizeSpv, type SpvBook } from "./spv";

export type ReviewArea = "money" | "portfolio" | "people" | "deals" | "office";
export const AREA_LABEL: Record<ReviewArea, string> = { money: "Money", portfolio: "Portfolio", people: "People", deals: "Deals", office: "The office" };

export type ReviewItem = {
  key: string;
  area: ReviewArea;
  title: string;
  count: number;
  /** One line on what is open, or why it's clear. */
  detail: string;
  /** Key into osHrefs. */
  href: "spv" | "raise" | "portfolio" | "people" | "deals" | "today" | "studio" | "leads";
};

export type ReviewInputs = {
  spvs: SpvBook;
  holdings: HoldingBook;
  fund: { target: number | null; hard: number; daysLeft: number | null };
  goingCold: { name: string; days: number | null }[];
  overdue: { name: string; what: string }[];
  unratedPitches: number;
  decisionsWaiting: number;
  contentWaiting: number;
  /** People who said yes and haven't been asked for two names. */
  introAsks?: string[];
  /** Leads still "to reach" after a week. */
  staleLeads?: string[];
  /** Outreach: replies waiting on Ryan, strong new leads to triage, and why autopilot paused itself. */
  outreach?: { replies: string[]; toReview: string[]; paused: string | null };
  now: number;
};

const STALE_MARK_DAYS = 180;

function list(names: string[], max = 3): string {
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")} and ${names.length - max} more`;
}

export function weeklyReview(input: ReviewInputs): ReviewItem[] {
  const items: ReviewItem[] = [];
  const day = 86_400_000;

  // Money: wires promised but not in, on SPVs still open.
  const wires = input.spvs.spvs
    .filter((spv) => spv.status !== "cancelled" && spv.status !== "closed")
    .map((spv) => ({ spv, committed: summarizeSpv(spv, input.now).committed }))
    .filter((row) => row.committed > 0);
  const owed = wires.reduce((sum, row) => sum + row.committed, 0);
  items.push({
    key: "wires",
    area: "money",
    title: "Wires to collect",
    count: wires.length,
    detail: wires.length ? `${usd(owed)} committed but not wired on ${list(wires.map((row) => row.spv.company))}.` : "Every committed SPV dollar is wired.",
    href: "spv",
  });

  const closing = input.spvs.spvs.filter((spv) => (spv.status === "raising" || spv.status === "closing") && summarizeSpv(spv, input.now).daysLeft != null && (summarizeSpv(spv, input.now).daysLeft ?? 99) <= 14);
  items.push({
    key: "closing",
    area: "money",
    title: "SPVs closing in two weeks",
    count: closing.length,
    detail: closing.length ? list(closing.map((spv) => `${spv.company} (${summarizeSpv(spv, input.now).daysLeft} days)`)) : "Nothing closes in the next two weeks.",
    href: "spv",
  });

  if (input.fund.target) {
    const left = Math.max(0, input.fund.target - input.fund.hard);
    items.push({
      key: "fund",
      area: "money",
      title: "Fund I",
      // Only flagged near the close; the rest of the raise lives on Fundraising.
      count: left > 0 && input.fund.daysLeft != null && input.fund.daysLeft <= 60 ? 1 : 0,
      detail: left > 0 ? `${usd(left)} left to raise${input.fund.daysLeft != null ? ` in ${input.fund.daysLeft} days` : ""}.` : "Target reached.",
      href: "raise",
    });
  }

  // Portfolio: closed SPVs with money in but no holding, and marks gone stale.
  const booked = new Set(input.holdings.holdings.map((h) => h.spv_id).filter(Boolean));
  const unbooked = input.spvs.spvs.filter((spv) => spv.status === "closed" && !booked.has(spv.id) && summarizeSpv(spv, input.now).hard > 0);
  items.push({
    key: "unbooked",
    area: "portfolio",
    title: "Closed SPVs not on the books",
    count: unbooked.length,
    detail: unbooked.length ? `Record ${list(unbooked.map((spv) => spv.company))} as holdings.` : "Every closed SPV is a holding.",
    href: "portfolio",
  });

  const stale = input.holdings.holdings.filter((h) => {
    if (h.status !== "active") return false;
    const last = viewHolding(h).markedAt ?? h.date;
    return input.now - Date.parse(`${last}T12:00:00Z`) > STALE_MARK_DAYS * day;
  });
  items.push({
    key: "marks",
    area: "portfolio",
    title: "Marks older than six months",
    count: stale.length,
    detail: stale.length ? `Ask for an update from ${list(stale.map((h) => h.company))}.` : "Every active holding has a recent mark.",
    href: "portfolio",
  });

  // People.
  items.push({
    key: "overdue",
    area: "people",
    title: "Follow-ups overdue",
    count: input.overdue.length,
    detail: input.overdue.length ? list(input.overdue.map((row) => row.name)) : "Nothing overdue.",
    href: "today",
  });
  items.push({
    key: "cold",
    area: "people",
    title: "Going cold",
    count: input.goingCold.length,
    detail: input.goingCold.length ? `${list(input.goingCold.map((row) => row.name))}: engaged, but quiet three weeks or more.` : "Everyone engaged has heard from you recently.",
    href: "people",
  });

  if (input.introAsks) {
    items.push({
      key: "intros",
      area: "people",
      title: "Ask for two names",
      count: input.introAsks.length,
      detail: input.introAsks.length ? `${list(input.introAsks)} said yes but ${input.introAsks.length === 1 ? "hasn't" : "haven't"} been asked for intros.` : "Everyone who said yes has been asked for intros.",
      href: "raise",
    });
  }
  if (input.staleLeads) {
    items.push({
      key: "leads",
      area: "people",
      title: "Warm leads not reached",
      count: input.staleLeads.length,
      detail: input.staleLeads.length ? `${list(input.staleLeads)}: added over a week ago, still not contacted.` : "Every warm lead has been contacted.",
      href: "raise",
    });
  }

  // Deals and the office.
  items.push({
    key: "unrated",
    area: "deals",
    title: "Pitches without your rating",
    count: input.unratedPitches,
    detail: input.unratedPitches ? `${input.unratedPitches} open ${input.unratedPitches === 1 ? "pitch needs" : "pitches need"} great, good, maybe or no.` : "Every open pitch is rated.",
    href: "deals",
  });
  items.push({
    key: "decisions",
    area: "office",
    title: "Decisions waiting on you",
    count: input.decisionsWaiting,
    detail: input.decisionsWaiting ? `${input.decisionsWaiting} on Today.` : "None waiting.",
    href: "today",
  });
  items.push({
    key: "content",
    area: "office",
    title: "Content to approve",
    count: input.contentWaiting,
    detail: input.contentWaiting ? `${input.contentWaiting} ${input.contentWaiting === 1 ? "draft is" : "drafts are"} in review.` : "Nothing in review.",
    href: "studio",
  });
  if (input.outreach) {
    const o = input.outreach;
    items.push({
      key: "outreach-replies",
      area: "people",
      title: "Outreach replies to answer",
      count: o.replies.length,
      detail: o.replies.length ? `${list(o.replies)} replied and are waiting on you.` : "Every reply to outreach has an answer.",
      href: "leads",
    });
    items.push({
      key: "outreach-leads",
      area: "deals",
      title: "New leads to review",
      count: o.toReview.length,
      detail: o.toReview.length ? `Strongest: ${list(o.toReview)}.` : "No strong new leads waiting on a decision.",
      href: "leads",
    });
    if (o.paused) items.push({ key: "autopilot", area: "office", title: "Autopilot paused", count: 1, detail: o.paused, href: "leads" });
  }
  return items;
}
