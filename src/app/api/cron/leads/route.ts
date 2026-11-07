import { bearerToken, tokenMatches } from "@/lib/os/session";
import { osJson } from "@/lib/os/response";
import { CRON_LIMITS, findAndSave } from "@/lib/os/leads/server";
import { SnapshotStoreError } from "@/lib/os/store";

export const dynamic = "force-dynamic";
/** A daily run reads a full day of SEC filings, so it gets the longest time the host allows. */
export const maxDuration = 300;

/**
 * The daily lead search. Vercel Cron calls this with "Authorization: Bearer <CRON_SECRET>".
 * Lives outside /api/os so the main domain, which hides the OS, still reaches it.
 * Reads public data only and sends nothing.
 */
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return osJson({ ok: false, error: "Cron is not configured" }, 503);
  if (!tokenMatches(bearerToken(req.headers.get("authorization")), expected)) {
    return osJson({ ok: false, error: "Unauthorized" }, 401);
  }
  try {
    const { run } = await findAndSave(maxDuration * 1000 - 20_000, CRON_LIMITS, true);
    console.log(`leads cron: read ${run.scanned} filings, ${run.added} new, ${run.updated} updated, ${run.errors.length} errors`);
    return osJson({ ok: true, run });
  } catch (error) {
    if (error instanceof SnapshotStoreError && error.code === "unconfigured") return osJson({ ok: false, error: "The lead store is not configured" }, 503);
    console.error("leads cron failed");
    return osJson({ ok: false, error: "Could not finish the search" }, 500);
  }
}
