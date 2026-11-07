import { sameOriginRequest } from "@/lib/os/answers";
import { isOsAuthed } from "@/lib/os/current";
import { writeDoc } from "@/lib/os/doc-store";
import { osJson } from "@/lib/os/response";
import { readLeads } from "@/lib/os/leads/server";
import { applyOutreachOp } from "@/lib/os/outreach/book";
import { OUTREACH_DOC, outreachSetup, readOutreach } from "@/lib/os/outreach/server";
import { SnapshotStoreError } from "@/lib/os/store";

export const dynamic = "force-dynamic";

/** Autopilot settings and sequences. Changing them sends nothing by itself; the hourly run sends. */
export async function GET() {
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);
  return osJson({ ok: true, book: await readOutreach(), setup: await outreachSetup() });
}

export async function POST(req: Request) {
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);
  if (!sameOriginRequest(req)) return osJson({ error: "Forbidden" }, 403);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return osJson({ error: "Invalid JSON" }, 400);
  }
  try {
    const setup = await outreachSetup();
    const result = applyOutreachOp(await readOutreach(), body, (await readLeads()).leads, new Date().toISOString(), Boolean(setup.gmail));
    if (!result.ok) return osJson({ error: result.error }, 400);
    await writeDoc(OUTREACH_DOC, JSON.stringify(result.book));
    return osJson({ ok: true, book: result.book, setup });
  } catch (error) {
    if (error instanceof SnapshotStoreError && error.code === "unconfigured") return osJson({ error: "The store is not configured" }, 503);
    return osJson({ error: "Could not save that" }, 500);
  }
}
