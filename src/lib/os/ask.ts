import type { ActionPayload, OsAction } from "./types";

export type AskRoute = {
  type: "free_text" | "bot_request";
  target_id: string;
  payload: ActionPayload;
};

/** Route a typed ask. The words are stored as text. They are never turned into a yes or a swap. */
export function routeAsk(input: {
  text: string;
  page: string;
  about?: string | null;
  botName?: string | null;
  requestedBy?: string | null;
}): AskRoute {
  const text = input.text.trim().slice(0, 2000);
  const page = (input.page || "/os").slice(0, 200);
  const about = input.about?.trim().slice(0, 200) || "";
  const payload: ActionPayload = { text, page };
  if (about) payload.about = about;
  const bot = input.botName?.trim() || "";
  if (bot) return { type: "bot_request", target_id: bot, payload };
  return { type: "free_text", target_id: input.requestedBy?.trim() || "executive", payload };
}

export function normalizeAskPayload(payload: ActionPayload): { ok: true; payload: ActionPayload } | { ok: false; error: string } {
  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  if (!text) return { ok: false, error: "Ask needs a note" };
  if (text.length > 2000) return { ok: false, error: "Ask is too long" };
  const page = typeof payload.page === "string" ? payload.page.trim().slice(0, 200) : "";
  const about = typeof payload.about === "string" ? payload.about.trim().slice(0, 200) : "";
  const next: ActionPayload = { text };
  if (page) next.page = page;
  if (about) next.about = about;
  return { ok: true, payload: next };
}

export function whoLabel(target: string | null | undefined): string {
  const value = target?.trim() || "";
  const known: Record<string, string> = {
    executive: "Executive",
    investment: "Investment",
    intelligence: "Intelligence",
    network: "Network",
    growth: "Growth",
    firm_os: "Firm OS",
    ryan: "Ryan",
  };
  if (!value || value === "the office") return "the office";
  return known[value] || value;
}

export function officeStatus(
  action: Pick<OsAction, "acked_at" | "status" | "result"> | null,
  who: string,
): { line: string; note: string | null; retry: boolean } | null {
  if (!action) return null;
  const note = typeof action.result === "string" && action.result.trim() ? action.result.trim() : null;
  if (action.status === "failed") return { line: "Did not land.", note, retry: true };
  if (!action.acked_at) return { line: `With ${who}. Not picked up.`, note: null, retry: false };
  return { line: "Picked up.", note, retry: false };
}

export function latestAction(actions: OsAction[], type: OsAction["type"], targetId: string): OsAction | null {
  let found: OsAction | null = null;
  for (const action of actions) {
    if (action.type === type && action.target_id === targetId) found = action;
  }
  return found;
}

export function askActions(actions: OsAction[]): OsAction[] {
  return actions.filter((action) => action.type === "free_text" || action.type === "bot_request").reverse();
}
