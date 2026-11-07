import { sameOriginRequest } from "@/lib/os/answers";
import { isOsAuthed } from "@/lib/os/current";
import { osJson } from "@/lib/os/response";
import { findAndSave } from "@/lib/os/leads/server";
import { SnapshotStoreError } from "@/lib/os/store";

export const dynamic = "force-dynamic";
/** One batch reads SEC filings, company sites and (when set) the AI. It stops early to fit. */
export const maxDuration = 60;

export async function GET() {
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);
  return osJson({ error: "Use POST" }, 405);
}

/** Finds the next batch of leads. Reads public data only and sends nothing. */
export async function POST(req: Request) {
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);
  if (!sameOriginRequest(req)) return osJson({ error: "Forbidden" }, 403);
  try {
    const { book, run } = await findAndSave(maxDuration * 1000 - 8_000);
    return osJson({ ok: true, book, run });
  } catch (error) {
    if (error instanceof SnapshotStoreError && error.code === "unconfigured") return osJson({ error: "The lead store is not configured" }, 503);
    return osJson({ error: "Could not finish the search" }, 500);
  }
}
