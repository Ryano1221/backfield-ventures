import type { Decision } from "./types";

export function decisionKey(decision: Pick<Decision, "id" | "title" | "since">): string {
  if (decision.id) return decision.id;
  return `t:${decision.title}\n${decision.since}`;
}
