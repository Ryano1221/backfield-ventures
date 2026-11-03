import { ackAnswers } from "@/lib/os/answers";
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
  let body: { ids?: unknown };
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
    const acked = await ackAnswers(ids);
    return osJson({ ok: true, acked });
  } catch (error) {
    if (error instanceof SnapshotStoreError && error.code === "unconfigured") {
      return osJson({ error: "Decision store is not configured" }, 503);
    }
    console.error("os ack failed");
    return osJson({ error: "Could not ack decisions" }, 500);
  }
}
