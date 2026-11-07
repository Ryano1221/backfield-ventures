import { sameOriginRequest } from "@/lib/os/answers";
import { isOsAuthed } from "@/lib/os/current";
import { writeDoc } from "@/lib/os/doc-store";
import { osJson } from "@/lib/os/response";
import { applyLeadOp } from "@/lib/os/leads/book";
import { LEADS_DOC, readLeads } from "@/lib/os/leads/server";
import { SnapshotStoreError } from "@/lib/os/store";

export const dynamic = "force-dynamic";

/** The lead list and Ryan's changes to it. Private store only. Sends nothing. */
export async function GET() {
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);
  return osJson({ ok: true, book: await readLeads() });
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
    const result = applyLeadOp(await readLeads(), body);
    if (!result.ok) return osJson({ error: result.error }, 400);
    await writeDoc(LEADS_DOC, JSON.stringify(result.book));
    return osJson({ ok: true, book: result.book });
  } catch (error) {
    if (error instanceof SnapshotStoreError && error.code === "unconfigured") return osJson({ error: "The lead store is not configured" }, 503);
    return osJson({ error: "Could not save that" }, 500);
  }
}
