import type { OsAction } from "./types";

const SAVED_CHOICES = new Set(["yes", "no", "reply", "swap", "approve", "not_now", "skip", "later", "hold"]);

export function isUnacked(action: OsAction): boolean {
  return !action.acked_at && action.status !== "failed";
}

export function waitingActions(actions: OsAction[]): OsAction[] {
  return actions.filter(isUnacked);
}

export function decisionNeedsPickup(actions: OsAction[], decisionId: string): boolean {
  const row = [...actions].reverse().find((action) => action.type === "decide" && action.target_id === decisionId && action.status !== "failed");
  if (!row || row.acked_at) return false;
  const choice = typeof row.payload.choice === "string" ? row.payload.choice.trim().toLowerCase() : "";
  return SAVED_CHOICES.has(choice);
}

export function ratingNeedsPickup(actions: OsAction[], pitchId: string): boolean {
  const row = [...actions].reverse().find((action) => action.type === "rate" && action.target_id === pitchId && action.status !== "failed");
  return Boolean(row && !row.acked_at);
}

export const PICKUP_LINE = "Saved. The office has not picked this up yet.";

export function waitingTitle(action: OsAction): string {
  const choice = typeof action.payload.choice === "string" ? action.payload.choice : "";
  const rating = typeof action.payload.rating === "string" ? action.payload.rating : "";
  const text = typeof action.payload.text === "string" ? action.payload.text : "";
  if (action.type === "decide") return choice ? `Decision · ${choice}` : "Decision";
  if (action.type === "rate") return rating ? `Rating · ${rating}` : "Rating";
  if (action.type === "free_text" || action.type === "bot_request") return text ? text.slice(0, 140) : "Ask";
  return action.type.replace(/_/g, " ");
}
