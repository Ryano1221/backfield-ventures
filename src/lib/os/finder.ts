import { decisionKey } from "./decision-id";
import { shortTitle } from "./present";
import { blankToNull } from "./present";
import type { Snapshot } from "./types";

export type FinderItem = {
  kind: "person" | "company" | "bot" | "decision";
  id: string;
  title: string;
  hint: string;
};

export function buildFinder(snapshot: Snapshot | null): FinderItem[] {
  if (!snapshot) return [];
  const items: FinderItem[] = [];
  for (const person of snapshot.crm.people) {
    items.push({
      kind: "person",
      id: person.id,
      title: person.name,
      hint: [person.firm, person.stage].filter(Boolean).join(" · "),
    });
  }
  for (const pitch of snapshot.pitches) {
    items.push({
      kind: "company",
      id: `pitch:${pitch.company}`,
      title: pitch.company,
      hint: [blankToNull(pitch.sector), blankToNull(pitch.stage)].filter(Boolean).join(" · "),
    });
  }
  for (const bot of snapshot.bots.bots) {
    items.push({ kind: "bot", id: bot.name, title: bot.name, hint: bot.status });
  }
  for (const decision of snapshot.decisions) {
    items.push({ kind: "decision", id: decisionKey(decision), title: shortTitle(decision.title), hint: "Decision" });
  }
  return items;
}
