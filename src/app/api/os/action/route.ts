import { decisionKey } from "@/lib/os/decision-id";
import { isActionType, normalizeDecidePayload, recordAction, sanitizePayload } from "@/lib/os/actions";
import { botQuestionId } from "@/lib/os/drive";
import { normalizeBriefApprove, normalizeDriveApprove, normalizeDriveEdit, normalizeDriveSkip } from "@/lib/os/drive-actions";
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
  if (type === "drive_approve" || type === "drive_edit" || type === "drive_skip") {
    if (type === "drive_skip") {
      const normalized = normalizeDriveSkip(body.payload, target);
      if (!normalized.ok) return osJson({ error: normalized.error }, 400);
      storedPayload = normalized.payload;
    } else {
      const decision = snapshot?.decisions.find((item) => decisionKey(item) === target);
      const brief = snapshot?.drive?.find((item) => item.id === target);
      if (!decision && !(type === "drive_approve" && brief)) return osJson({ error: "Decision not found" }, 404);
      const normalized = decision
        ? type === "drive_approve"
          ? normalizeDriveApprove(decision, body.payload)
          : normalizeDriveEdit(decision, body.payload)
        : normalizeBriefApprove(brief!, body.payload);
      if (!normalized.ok) return osJson({ error: normalized.error }, 400);
      if (JSON.stringify(normalized.payload).length > 24000) return osJson({ error: "Payload is too large" }, 400);
      storedPayload = normalized.payload;
    }
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
  if (type === "drive_approve" || type === "drive_edit") {
    if (snapshot.decisions.some((item) => decisionKey(item) === target)) return true;
    if (type === "drive_approve" && snapshot.drive?.some((item) => item.id === target)) return true;
    return false;
  }
  if (type === "drive_skip") {
    if (snapshot.decisions.some((item) => decisionKey(item) === target)) return true;
    if (snapshot.pitches.some((pitch) => pitchTarget(pitch) === target)) return true;
    if (snapshot.bots.bots.some((bot, index) => botQuestionId(bot.name, index) === target)) return true;
    if (snapshot.drive?.some((item) => item.id === target)) return true;
    return false;
  }
  return false;
}
