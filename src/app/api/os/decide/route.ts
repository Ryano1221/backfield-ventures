import { exactMessageHash, recordAnswer, sameOriginRequest } from "@/lib/os/answers";
import { decisionKey } from "@/lib/os/decision-id";
import { isOsAuthed } from "@/lib/os/current";
import { osJson } from "@/lib/os/response";
import { SnapshotStoreError } from "@/lib/os/store";
import { readSnapshot } from "@/lib/os/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!sameOriginRequest(req)) return osJson({ error: "Forbidden" }, 403);
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);

  let body: { decision_id?: unknown; choice?: unknown; note?: unknown };
  try {
    body = await req.json();
  } catch {
    return osJson({ error: "Invalid JSON" }, 400);
  }
  const decisionId = typeof body.decision_id === "string" ? body.decision_id.trim() : "";
  const choice = typeof body.choice === "string" ? body.choice.trim() : "";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
  if (!decisionId || !choice || choice.length > 80) return osJson({ error: "Invalid decision" }, 400);

  const snapshot = await readSnapshot();
  const decision = snapshot?.decisions.find((item) => decisionKey(item) === decisionId);
  if (!decision) return osJson({ error: "Decision not found" }, 404);
  const allowed = decision.options?.length ? decision.options.map((option) => option.value) : ["yes", "no"];
  if (!allowed.includes(choice)) return osJson({ error: "That choice is not offered" }, 400);

  try {
    const result = await recordAnswer({
      decision_id: decisionId,
      choice,
      note: note || null,
      decided_at: new Date().toISOString(),
      exact_message_hash: decision.exact_message ? exactMessageHash(decision.exact_message) : null,
    });
    if (result === "duplicate") return osJson({ error: "Already answered" }, 409);
    return osJson({ ok: true, decision_id: decisionId });
  } catch (error) {
    if (error instanceof SnapshotStoreError && error.code === "unconfigured") {
      return osJson({ error: "Decision store is not configured" }, 503);
    }
    console.error("os decide failed");
    return osJson({ error: "Could not store the decision" }, 500);
  }
}
