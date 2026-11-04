import { sha256 } from "./sha256";
import type { OsAction } from "./types";

export type AnswerLabel = "Approved" | "Edited" | "Not now" | "Swap" | "Reply";

export type StoredAnswer = {
  id: string;
  label: AnswerLabel;
  at: string;
};

export type DecisionDraft = {
  /** Exact draft text on the decision in the snapshot. */
  exact?: string | null;
};

const NOT_NOW = new Set(["not_now", "skip", "later", "hold", "no"]);

export function answerLabel(action: Pick<OsAction, "type" | "payload">): AnswerLabel {
  if (action.type === "snooze") return "Not now";
  const choice = typeof action.payload.choice === "string" ? action.payload.choice.trim().toLowerCase() : "";
  if (choice === "swap") return "Swap";
  if (choice === "reply") return "Reply";
  const edited = action.payload.edited_message;
  if (typeof edited === "string" && edited.trim()) return "Edited";
  if (choice === "edit") return "Edited";
  if (NOT_NOW.has(choice)) return "Not now";
  return "Approved";
}

/**
 * The answer store wins over the snapshot, acked or not.
 * A snapshot whose exact draft hashes to something other than the saved draft is a new revision and stays open.
 */
export function storedDecisionAnswer(
  actions: OsAction[],
  decisionId: string,
  now = Date.now(),
  draft?: DecisionDraft,
): StoredAnswer | null {
  void now;
  const decide = latest(actions, "decide", decisionId);
  if (decide && decide.status !== "failed") {
    if (!coversDraft(decide, draft)) return null;
    return { id: decisionId, label: answerLabel(decide), at: decide.created_at };
  }
  const snooze = latest(actions, "snooze", decisionId);
  if (!snooze || snooze.status === "failed") return null;
  if (!coversDraft(snooze, draft)) return null;
  return { id: decisionId, label: "Not now", at: snooze.created_at };
}

export function draftHash(text: string | null | undefined): string | null {
  const value = typeof text === "string" ? text.trim() : "";
  return value ? sha256(value) : null;
}

function coversDraft(action: OsAction, draft?: DecisionDraft): boolean {
  if (!draft) return true;
  const current = draftHash(draft.exact);
  if (!current) return true;
  const stored = hashOf(action.payload.exact_message_hash);
  const prior = hashOf(action.payload.prior_message_hash);
  const edited = typeof action.payload.edited_message === "string" && action.payload.edited_message.trim();
  if (!stored && !edited) return true;
  if (stored && current === stored) return true;
  if (edited && prior && current === prior) return true;
  if (edited && !prior) return true;
  if (stored && current !== stored) return false;
  return true;
}

function hashOf(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function latest(actions: OsAction[], type: OsAction["type"], decisionId: string): OsAction | null {
  let found: OsAction | null = null;
  for (const action of actions) {
    if (action.type === type && action.target_id === decisionId) found = action;
  }
  return found;
}
