import { sameOriginRequest } from "@/lib/os/answers";
import { isOsAuthed } from "@/lib/os/current";
import { readDoc, writeDoc } from "@/lib/os/doc-store";
import { osJson } from "@/lib/os/response";
import { SnapshotStoreError } from "@/lib/os/store";
import { applyStudioOp, parseStudio } from "@/lib/os/studio";

export const dynamic = "force-dynamic";

/** Content Studio store. Drafts and approvals only: this route never sends or posts anything. */
const DOC = "content-studio";

export async function GET() {
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);
  return osJson({ ok: true, studio: parseStudio(await readDoc(DOC)) });
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
    const current = parseStudio(await readDoc(DOC));
    const result = applyStudioOp(current, body);
    if (!result.ok) return osJson({ error: result.error }, 400);
    await writeDoc(DOC, JSON.stringify(result.studio));
    return osJson({ ok: true, studio: result.studio, id: result.id });
  } catch (error) {
    if (error instanceof SnapshotStoreError && error.code === "unconfigured") return osJson({ error: "The studio store is not configured" }, 503);
    return osJson({ error: "Could not save that" }, 500);
  }
}
