import { normalizeDecidePayload, recordAction, sanitizePayload } from "@/lib/os/actions";
import { sameOriginRequest } from "@/lib/os/answers";
import { decisionKey } from "@/lib/os/decision-id";
import { isOsAuthed } from "@/lib/os/current";
import { osJson } from "@/lib/os/response";
import { SnapshotStoreError } from "@/lib/os/store";
import { readSnapshot } from "@/lib/os/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!sameOriginRequest(req)) return osJson({ error: "Forbidden" }, 403);
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);

  let body: { decision_id?: unknown; id?: unknown; choice?: unknown; answer?: unknown; note?: unknown; hash?: unknown; swaps?: unknown };
  try {
    body = await req.json();
  } catch {
    return osJson({ error: "Invalid JSON" }, 400);
  }
  const decisionId = text(body.decision_id) || text(body.id);
  const choice = text(body.choice) || text(body.answer);
  if (!decisionId || decisionId.length > 2000 || !choice || choice.length > 80) return osJson({ error: "Invalid decision" }, 400);

  const snapshot = await readSnapshot();
  const decision = snapshot?.decisions.find((item) => decisionKey(item) === decisionId);
  if (!decision) return osJson({ error: "Decision not found" }, 404);

  const payload = sanitizePayload({
    choice,
    note: typeof body.note === "string" ? body.note : null,
    exact_message_hash: text(body.hash) || null,
    swaps: body.swaps,
  });
  if (!payload) return osJson({ error: "Payload is too large" }, 400);
  const normalized = normalizeDecidePayload(decision, payload);
  if (!normalized.ok) return osJson({ error: normalized.error }, 400);

  try {
    const result = await recordAction({
      type: "decide",
      target_id: decisionId,
      payload: normalized.payload,
      idempotency_key: `decide:${decisionId}`,
    });
    if (!result.created) return osJson({ error: "Already answered", action: result.action }, 409);
    return osJson({ ok: true, decision_id: decisionId, action: result.action });
  } catch (error) {
    if (error instanceof SnapshotStoreError && error.code === "unconfigured") {
      return osJson({ error: "Decision store is not configured" }, 503);
    }
    console.error("os decide failed");
    return osJson({ error: "Could not store the decision" }, 500);
  }
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
