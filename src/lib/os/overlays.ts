import type { ActionType, CrmPerson, OsAction, Pitch, PitchStatus } from "./types";
import { PITCH_STATUSES } from "./types";

export type Badge = "Pending" | "Done" | "Failed" | null;

export type PitchView = Pitch & {
  target: string;
  badge: Badge;
  badgeNote: string;
  intent: string | null;
  snoozed: boolean;
};

export type PersonView = CrmPerson & {
  badge: Badge;
  badgeNote: string;
  held: boolean;
  dnc: boolean;
  snoozed: boolean;
};

const PITCH_INTENTS = new Set(["take_call", "watch", "pass", "ask_memo"]);

export function viewPitches<T extends Pitch>(pitches: T[], actions: OsAction[], now = Date.now()): (T & PitchView)[] {
  return pitches.map((pitch) => {
    const target = `pitch:${pitch.company}`;
    const action = latest(actions, ["pitch_status"], target);
    const failed = action?.status === "failed";
    const next = { ...pitch };
    let intent: string | null = null;
    if (action && !failed) {
      const stage = text(action.payload.stage);
      const status = pitchStatus(action.payload.status);
      intent = text(action.payload.intent);
      if (stage && stage !== pitch.stage) next.stage = stage;
      if (!stage && action.payload.stage === "") next.stage = null;
      if (status && status !== pitch.status) next.status = status;
      if (intent && !PITCH_INTENTS.has(intent)) intent = null;
      if (stage && stage === pitch.stage && (!status || status === pitch.status)) {
        // Snapshot already shows this move.
      }
    }
    return {
      ...next,
      target,
      intent,
      snoozed: isSnoozed(target, actions, now),
      ...badgeOf(actions, target, action && !failed && snapshotMatchesPitch(pitch, action) ? null : action),
    };
  });
}

export function viewPeople(people: CrmPerson[], actions: OsAction[], now = Date.now()): PersonView[] {
  return people.map((person) => {
    const stageAction = latest(actions, ["crm_stage"], person.id);
    const stepAction = latest(actions, ["crm_next_step"], person.id);
    const noteAction = latest(actions, ["crm_note"], person.id);
    const holdAction = latest(actions, ["crm_hold"], person.id);
    const dncAction = latest(actions, ["crm_dnc"], person.id);
    const next = { ...person };
    if (stageAction && stageAction.status !== "failed") {
      const stage = text(stageAction.payload.stage);
      if (stageAction.payload.stage === "" || stageAction.payload.stage === null) next.stage = null;
      else if (stage && stage !== person.stage) next.stage = stage;
    }
    if (stepAction && stepAction.status !== "failed") {
      if ("next_step" in stepAction.payload) next.next_step = text(stepAction.payload.next_step);
      if ("next_step_due" in stepAction.payload) next.next_step_due = text(stepAction.payload.next_step_due);
    }
    if (noteAction && noteAction.status !== "failed") {
      const note = text(noteAction.payload.note);
      if (note && !(person.notes || "").includes(note)) next.notes = person.notes ? `${person.notes}\n${note}` : note;
    }
    const held = Boolean(holdAction && holdAction.status !== "failed");
    const dnc = Boolean(dncAction && dncAction.status !== "failed");
    const recent = latest(
      actions,
      ["crm_stage", "crm_next_step", "crm_note", "crm_hold", "crm_dnc", "draft_followup"],
      person.id,
    );
    const confirmed =
      recent?.type === "crm_stage" && text(recent.payload.stage) === person.stage ? null : recent;
    return {
      ...next,
      held,
      dnc,
      snoozed: isSnoozed(person.id, actions, now),
      ...badgeOf(actions, person.id, confirmed),
    };
  });
}

export function botPaused(name: string, actions: OsAction[]): boolean {
  const action = latest(actions, ["bot_pause", "bot_resume"], name);
  return action?.type === "bot_pause" && action.status !== "failed";
}

export function isSnoozed(target: string, actions: OsAction[], now = Date.now()): boolean {
  const action = latest(actions, ["snooze"], target);
  if (!action || action.status === "failed") return false;
  const until = Date.parse(String(action.payload.until || ""));
  return Number.isFinite(until) && until > now;
}

export function badgeFor(actions: OsAction[], target: string): { badge: Badge; badgeNote: string } {
  return badgeOf(actions, target, latest(actions, ACTION_GROUPS, target));
}

function snapshotMatchesPitch(pitch: Pitch, action: OsAction): boolean {
  const stage = text(action.payload.stage);
  const status = pitchStatus(action.payload.status);
  const stageOk = !stage || stage === pitch.stage;
  const statusOk = !status || status === pitch.status;
  const intent = text(action.payload.intent);
  if (intent === "ask_memo") return false;
  return stageOk && statusOk && action.status === "done";
}

function badgeOf(
  actions: OsAction[],
  target: string,
  action: OsAction | null,
): { badge: Badge; badgeNote: string } {
  const relevant = actions.filter((item) => item.target_id === target);
  const newest = relevant.at(-1) ?? action;
  if (!newest) return { badge: null, badgeNote: "" };
  if (newest.status === "failed") return { badge: "Failed", badgeNote: newest.result || "" };
  if (!newest.acked_at) return { badge: "Pending", badgeNote: "" };
  if (action && action.status !== "failed" && !snapshotQuiet(action)) return { badge: "Done", badgeNote: newest.result || "" };
  return { badge: null, badgeNote: "" };
}

function snapshotQuiet(action: OsAction): boolean {
  return action.status === "done" && (action.type === "snooze" || action.type === "free_text" || action.type === "bot_request");
}

const ACTION_GROUPS: ActionType[] = [
  "decide",
  "pitch_status",
  "crm_stage",
  "crm_next_step",
  "crm_note",
  "crm_hold",
  "crm_dnc",
  "draft_followup",
  "bot_request",
  "bot_pause",
  "bot_resume",
  "snooze",
  "free_text",
];

function latest(actions: OsAction[], types: ActionType[], target: string): OsAction | null {
  const wanted = new Set(types);
  let found: OsAction | null = null;
  for (const action of actions) {
    if (action.target_id === target && wanted.has(action.type)) found = action;
  }
  return found;
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function pitchStatus(value: unknown): PitchStatus | null {
  if (typeof value !== "string") return null;
  const status = value.trim().toLowerCase();
  return (PITCH_STATUSES as readonly string[]).includes(status) ? (status as PitchStatus) : null;
}
