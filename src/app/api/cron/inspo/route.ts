import { bearerToken, tokenMatches } from "@/lib/os/session";
import { osJson } from "@/lib/os/response";
import { refreshAndSave } from "@/lib/os/inspo/server";
import { SnapshotStoreError } from "@/lib/os/store";

export const dynamic = "force-dynamic";
/** Feeds are quick; Apify runs for LinkedIn and X can take a couple of minutes. */
export const maxDuration = 300;

/**
 * The daily read of what top VCs posted. Vercel Cron calls this with
 * "Authorization: Bearer <CRON_SECRET>". Reads public posts only and sends nothing.
 */
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return osJson({ ok: false, error: "Cron is not configured" }, 503);
  if (!tokenMatches(bearerToken(req.headers.get("authorization")), expected)) return osJson({ ok: false, error: "Unauthorized" }, 401);
  try {
    const { added, failed, book } = await refreshAndSave();
    console.log(`inspo cron: ${added} new posts, ${failed} of ${book.sources.length} sources failed`);
    return osJson({ ok: true, added, failed });
  } catch (error) {
    if (error instanceof SnapshotStoreError && error.code === "unconfigured") return osJson({ ok: false, error: "The store is not configured" }, 503);
    console.error("inspo cron failed", error instanceof Error ? error.message : error);
    return osJson({ ok: false, error: "Could not read the feeds" }, 500);
  }
}
