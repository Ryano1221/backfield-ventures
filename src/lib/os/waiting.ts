import type { OsAction, Snapshot } from "./types";

const SAVED_CHOICES = new Set(["yes", "no", "reply", "swap", "approve", "not_now", "skip", "later", "hold"]);

export function isUnacked(action: OsAction): boolean {
  return !action.acked_at && action.status !== "failed";
}

export function waitingActions(actions: OsAction[]): OsAction[] {
  return actions.filter((action) => isUnacked(action) && !action.action_id.startsWith("local:"));
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

const WAITING_LABEL: Record<string, string> = {
  decide: "Decision",
  rate: "Rating",
  snooze: "Not now",
  crm_stage: "Stage",
  crm_hold: "Hold",
  crm_dnc: "Do not contact",
  crm_note: "Note",
  crm_next_step: "Next step",
  draft_followup: "Follow-up",
  bot_pause: "Pause",
  bot_resume: "Resume",
  free_text: "Ask",
  bot_request: "Ask",
  pitch_status: "Deal status",
};

export function waitingTitle(action: OsAction): string {
  const choice = typeof action.payload.choice === "string" ? action.payload.choice.trim().toLowerCase() : "";
  const rating = typeof action.payload.rating === "string" ? action.payload.rating : "";
  const text = typeof action.payload.text === "string" ? action.payload.text : "";
  if (action.type === "decide") {
    if (choice === "approve" || choice === "yes") return "Approved";
    if (choice === "not_now" || choice === "skip" || choice === "later" || choice === "no") return "Not now";
    if (choice === "edit") return "Edit";
    return "Decision";
  }
  if (action.type === "rate") return rating ? `Rated ${rating}` : "Rating";
  if ((action.type === "free_text" || action.type === "bot_request") && text) return text.slice(0, 140);
  return WAITING_LABEL[action.type] || "Saved";
}

export function waitingWho(action: OsAction, snapshot: Snapshot | null): string | null {
  if (!snapshot) return null;
  const id = action.target_id;
  const person = snapshot.crm.people.find((row) => row.id === id);
  if (person?.name) return person.name;
  const pitch = snapshot.pitches.find((row) => row.id === id);
  if (pitch?.company) return pitch.company;
  const decision = snapshot.decisions.find((row) => row.id === id);
  if (decision?.person?.name) return decision.person.name;
  if (decision?.title) {
    const titled = decision.title.replace(/\s+/g, " ").trim();
    if (titled && !titled.includes("_") && titled.length < 80) return titled;
  }
  return null;
}
