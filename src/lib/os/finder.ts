import { trackedCompanies } from "./companies";
import { decisionKey } from "./decision-id";
import { stageLabel } from "./night";
import { pitchTarget } from "./pitch-rate";
import { shortTitle } from "./present";
import { blankToNull } from "./present";
import type { Snapshot } from "./types";

export type FinderItem = {
  kind: "person" | "company" | "bot" | "decision" | "page";
  id: string;
  title: string;
  hint: string;
};

// Pages come first so "fund", "raise" or "deals" jumps straight there.
export const PAGE_ITEMS: FinderItem[] = [
  { kind: "page", id: "today", title: "Today", hint: "Page" },
  { kind: "page", id: "raise", title: "Fundraising", hint: "Fund I · commitments, LP funnel" },
  { kind: "page", id: "spv", title: "SPVs", hint: "Fundraising · deal-by-deal vehicles" },
  { kind: "page", id: "deals", title: "Investments", hint: "Deals · pipeline" },
  { kind: "page", id: "people", title: "Relationships", hint: "People · CRM" },
  { kind: "page", id: "bots", title: "Bots", hint: "Operations · the office" },
  { kind: "page", id: "studio", title: "Content studio", hint: "Audience Growth · ideas, drafts, approvals" },
  { kind: "page", id: "email", title: "Email tools", hint: "Audience Growth · subscribers, templates, lead magnets" },
];

export function buildFinder(snapshot: Snapshot | null): FinderItem[] {
  if (!snapshot) return [...PAGE_ITEMS];
  const items: FinderItem[] = [...PAGE_ITEMS];
  for (const person of snapshot.crm.people) {
    items.push({
      kind: "person",
      id: person.id,
      title: person.name,
      hint: [person.firm, stageLabel(person.stage)].filter(Boolean).join(" · "),
    });
  }
  for (const pitch of snapshot.pitches) {
    items.push({
      kind: "company",
      id: pitchTarget(pitch),
      title: pitch.company,
      hint: [blankToNull(pitch.sector), blankToNull(pitch.stage)].filter(Boolean).join(" · "),
    });
  }
  for (const company of trackedCompanies(snapshot, snapshot.pitches.map((pitch) => ({ company: pitch.company, domain: pitch.domain || null })))) {
    items.push({ kind: "company", id: company.id, title: company.company, hint: ["Tracking", company.source].filter(Boolean).join(" · ") });
  }
  for (const bot of snapshot.bots.bots) {
    items.push({ kind: "bot", id: bot.name, title: bot.name, hint: bot.status });
  }
  for (const decision of snapshot.decisions) {
    items.push({ kind: "decision", id: decisionKey(decision), title: shortTitle(decision.title), hint: "Decision" });
  }
  return items;
}
