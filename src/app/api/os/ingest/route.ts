import { bearerToken, tokenMatches } from "@/lib/os/session";
import { osJson } from "@/lib/os/response";
import { validateSnapshot } from "@/lib/os/schema";
import { SnapshotStoreError, writeSnapshot } from "@/lib/os/store";

export const dynamic = "force-dynamic";

const MAX_BYTES = 1_500_000;

export async function POST(req: Request) {
  const expected = process.env.OS_INGEST_TOKEN;
  if (!expected) return osJson({ ok: false, error: "Ingest is not configured" }, 503);

  if (!tokenMatches(bearerToken(req.headers.get("authorization")), expected)) {
    return osJson({ ok: false, error: "Unauthorized" }, 401);
  }

  const length = Number(req.headers.get("content-length") || 0);
  if (Number.isFinite(length) && length > MAX_BYTES) {
    return osJson({ ok: false, error: "Payload is too large" }, 413);
  }

  const type = req.headers.get("content-type") || "";
  if (!type.toLowerCase().includes("application/json")) {
    return osJson({ ok: false, error: "Expected application/json" }, 415);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return osJson({ ok: false, error: "Invalid JSON" }, 400);
  }

  const result = validateSnapshot(body);
  if (!result.ok) {
    return osJson({ ok: false, error: "Invalid snapshot", issues: result.issues }, 400);
  }

  try {
    const stored_at = await writeSnapshot(result.snapshot);
    return osJson({
      ok: true,
      generated_at: result.snapshot.generated_at,
      stored_at,
      counts: {
        pitches: result.snapshot.pitches.length,
        bots: result.snapshot.bots.bots.length,
        outreach: result.snapshot.outreach.length,
        decisions: result.snapshot.decisions.length,
        activity: result.snapshot.activity.length,
      },
    });
  } catch (error) {
    if (error instanceof SnapshotStoreError && error.code === "unconfigured") {
      return osJson({ ok: false, error: "Snapshot store is not configured" }, 503);
    }
    console.error("os ingest failed");
    return osJson({ ok: false, error: "Could not store snapshot" }, 500);
  }
}
