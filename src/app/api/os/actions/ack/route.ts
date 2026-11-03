import { ackActions } from "@/lib/os/actions";
import { osJson } from "@/lib/os/response";
import { bearerToken, tokenMatches } from "@/lib/os/session";
import { SnapshotStoreError } from "@/lib/os/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const expected = process.env.OS_INGEST_TOKEN;
  if (!expected) return osJson({ error: "Ingest is not configured" }, 503);
  if (!tokenMatches(bearerToken(req.headers.get("authorization")), expected)) {
    return osJson({ error: "Unauthorized" }, 401);
  }
  let body: { ids?: unknown; result?: unknown };
  try {
    body = await req.json();
  } catch {
    return osJson({ error: "Invalid JSON" }, 400);
  }
  if (!Array.isArray(body.ids) || body.ids.some((id) => typeof id !== "string")) {
    return osJson({ error: "ids must be an array of strings" }, 400);
  }
  const ids = body.ids.map((id) => id.trim()).filter(Boolean).slice(0, 200);
  try {
    const acked = await ackActions(ids, parseResult(body.result));
    return osJson({ ok: true, acked });
  } catch (error) {
    if (error instanceof SnapshotStoreError && error.code === "unconfigured") {
      return osJson({ error: "Action store is not configured" }, 503);
    }
    console.error("os action ack failed");
    return osJson({ error: "Could not ack actions" }, 500);
  }
}

function parseResult(value: unknown): { status: "done" | "failed"; note: string | null } {
  if (typeof value === "string") return { status: value.trim().toLowerCase() === "failed" ? "failed" : "done", note: value.slice(0, 500) };
  if (value && typeof value === "object") {
    const row = value as { status?: unknown; note?: unknown; failed?: unknown };
    const failed = row.status === "failed" || row.failed === true;
    const note = typeof row.note === "string" ? row.note.slice(0, 500) : null;
    return { status: failed ? "failed" : "done", note };
  }
  return { status: "done", note: null };
}
