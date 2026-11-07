import { bearerToken, tokenMatches } from "@/lib/os/session";
import { osJson } from "@/lib/os/response";
import { runAndSave } from "@/lib/os/outreach/server";
import { SnapshotStoreError } from "@/lib/os/store";

export const dynamic = "force-dynamic";
/** Sends are spaced 15 to 35 seconds apart, so a run needs a few minutes. */
export const maxDuration = 300;

/**
 * The hourly autopilot run (weekday mornings, from the GitHub Actions schedule).
 * Same CRON_SECRET as the lead search. Checks replies, then sends what's due.
 */
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return osJson({ ok: false, error: "Cron is not configured" }, 503);
  if (!tokenMatches(bearerToken(req.headers.get("authorization")), expected)) return osJson({ ok: false, error: "Unauthorized" }, 401);
  try {
    const { report } = await runAndSave(maxDuration * 1000 - 20_000);
    console.log(`outreach cron: checked ${report.checked}, replied ${report.replied}, bounced ${report.bounced}, started ${report.enrolled}, sent ${report.sent}, errors ${report.errors.length}${report.note ? `, ${report.note}` : ""}`);
    return osJson({ ok: true, report });
  } catch (error) {
    if (error instanceof SnapshotStoreError && error.code === "unconfigured") return osJson({ ok: false, error: "The store is not configured" }, 503);
    console.error("outreach cron failed");
    return osJson({ ok: false, error: "Could not finish the run" }, 500);
  }
}
