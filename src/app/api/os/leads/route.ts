import { sameOriginRequest } from "@/lib/os/answers";
import { isOsAuthed } from "@/lib/os/current";
import { readDoc, writeDoc } from "@/lib/os/doc-store";
import { osJson } from "@/lib/os/response";
import { applyLeadOp, parseLeads } from "@/lib/os/warm-leads";
import { SnapshotStoreError } from "@/lib/os/store";

export const dynamic = "force-dynamic";

/** Warm leads and referral asks Ryan keeps by hand. Private store only. Sends nothing. */
const DOC = "warm-leads";

export async function GET() {
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);
  return osJson({ ok: true, book: parseLeads(await readDoc(DOC)) });
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
    const result = applyLeadOp(parseLeads(await readDoc(DOC)), body);
    if (!result.ok) return osJson({ error: result.error }, 400);
    await writeDoc(DOC, JSON.stringify(result.book));
    return osJson({ ok: true, book: result.book, id: result.id });
  } catch (error) {
    if (error instanceof SnapshotStoreError && error.code === "unconfigured") return osJson({ error: "The lead store is not configured" }, 503);
    return osJson({ error: "Could not save that" }, 500);
  }
}
