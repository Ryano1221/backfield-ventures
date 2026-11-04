import { decisionKey } from "@/lib/os/decision-id";
import { isActionType, normalizeDecidePayload, recordAction, sanitizePayload } from "@/lib/os/actions";
import { sameOriginRequest } from "@/lib/os/answers";
import { isOsAuthed } from "@/lib/os/current";
import { normalizeAskPayload } from "@/lib/os/ask";
import { isPitchRating, pitchTarget } from "@/lib/os/pitch-rate";
import { osJson } from "@/lib/os/response";
import { readSnapshot, SnapshotStoreError } from "@/lib/os/store";
import type { ActionType, Snapshot } from "@/lib/os/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!sameOriginRequest(req)) return osJson({ error: "Forbidden" }, 403);
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);

  let body: { type?: unknown; target_id?: unknown; payload?: unknown; idempotency_key?: unknown };
  try {
    body = await req.json();
  } catch {
    return osJson({ error: "Invalid JSON" }, 400);
  }
  const type = typeof body.type === "string" ? body.type : "";
  const target = typeof body.target_id === "string" ? body.target_id.trim() : "";
  const key = typeof body.idempotency_key === "string" ? body.idempotency_key.trim() : "";
  if (!isActionType(type) || !target || target.length > 2000 || !/^[A-Za-z0-9:_-]{8,120}$/.test(key)) {
    return osJson({ error: "Invalid action" }, 400);
  }
  const payload = sanitizePayload(body.payload);
  if (!payload) return osJson({ error: "Payload is too large" }, 400);

  const snapshot = await readSnapshot();
  if (!targetAllowed(type, target, snapshot)) return osJson({ error: "Unknown target" }, 404);

  let storedPayload = payload;
  if (type === "decide") {
    const decision = snapshot?.decisions.find((item) => decisionKey(item) === target);
    if (!decision) return osJson({ error: "Decision not found" }, 404);
    const normalized = normalizeDecidePayload(decision, payload);
    if (!normalized.ok) return osJson({ error: normalized.error }, 400);
    storedPayload = normalized.payload;
  }
  if (type === "rate") {
    if (!isPitchRating(payload.rating)) return osJson({ error: "That rating is not offered" }, 400);
    storedPayload = { rating: payload.rating };
  }
  if (type === "free_text" || type === "bot_request") {
    const normalized = normalizeAskPayload(payload);
    if (!normalized.ok) return osJson({ error: normalized.error }, 400);
    storedPayload = normalized.payload;
  }

  try {
    const result = await recordAction({ type, target_id: target, payload: storedPayload, idempotency_key: key });
    if (result.conflict) return osJson({ ok: true, created: false, action: result.action });
    return osJson({ ok: true, created: result.created, action: result.action });
  } catch (error) {
    if (error instanceof SnapshotStoreError && error.code === "unconfigured") {
      return osJson({ error: "Action store is not configured" }, 503);
    }
    console.error("os action failed");
    return osJson({ error: "Could not store the action" }, 500);
  }
}

function targetAllowed(type: ActionType, target: string, snapshot: Snapshot | null): boolean {
  if (type === "free_text") return true;
  if (!snapshot) return false;
  if (type === "decide" || (type === "snooze" && !target.startsWith("pitch:"))) {
    if (snapshot.decisions.some((item) => decisionKey(item) === target)) return true;
    if (type === "snooze" && snapshot.crm.people.some((person) => person.id === target)) return true;
    if (type !== "snooze") return false;
  }
  if (type === "rate") return snapshot.pitches.some((pitch) => pitchTarget(pitch) === target);
  if (type === "pitch_status" || target.startsWith("pitch:")) {
    return snapshot.pitches.some((pitch) => pitchTarget(pitch) === target || `pitch:${pitch.company}` === target);
  }
  if (type.startsWith("crm_") || type === "draft_followup") {
    return snapshot.crm.people.some((person) => person.id === target);
  }
  if (type.startsWith("bot_")) return snapshot.bots.bots.some((bot) => bot.name === target);
  return false;
}
