import type { OsAction } from "./types";

export type AnswerLabel = "Approved" | "Edited" | "Not now";

export type StoredAnswer = {
  id: string;
  label: AnswerLabel;
  at: string;
};

const NOT_NOW = new Set(["not_now", "skip", "later", "hold", "no"]);

export function answerLabel(action: Pick<OsAction, "type" | "payload">): AnswerLabel {
  if (action.type === "snooze") return "Not now";
  const edited = action.payload.edited_message;
  if (typeof edited === "string" && edited.trim()) return "Edited";
  const choice = typeof action.payload.choice === "string" ? action.payload.choice.trim().toLowerCase() : "";
  if (choice === "edit") return "Edited";
  if (NOT_NOW.has(choice)) return "Not now";
  return "Approved";
}

/** Unacked decide or snooze wins over a snapshot that still lists the decision as open. An ack, or a failed write, lets the snapshot win. */
export function storedDecisionAnswer(actions: OsAction[], decisionId: string, now = Date.now()): StoredAnswer | null {
  const decide = latest(actions, "decide", decisionId);
  if (decide && decide.status !== "failed" && !decide.acked_at) {
    return { id: decisionId, label: answerLabel(decide), at: decide.created_at };
  }
  const snooze = latest(actions, "snooze", decisionId);
  if (!snooze || snooze.status === "failed" || snooze.acked_at) return null;
  const until = Date.parse(String(snooze.payload.until || ""));
  if (!Number.isFinite(until) || until <= now) return null;
  return { id: decisionId, label: "Not now", at: snooze.created_at };
}

function latest(actions: OsAction[], type: OsAction["type"], decisionId: string): OsAction | null {
  let found: OsAction | null = null;
  for (const action of actions) {
    if (action.type === type && action.target_id === decisionId) found = action;
  }
  return found;
}
