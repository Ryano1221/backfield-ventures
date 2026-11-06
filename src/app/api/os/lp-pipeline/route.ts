import { sameOriginRequest } from "@/lib/os/answers";
import { isOsAuthed } from "@/lib/os/current";
import { readDoc, writeDoc } from "@/lib/os/doc-store";
import { applyPipelineOp, parsePipeline } from "@/lib/os/lp-pipeline";
import { osJson } from "@/lib/os/response";
import { SnapshotStoreError } from "@/lib/os/store";

export const dynamic = "force-dynamic";

/** Ryan's LP pipeline notes: stage, expected check, confidence, next action. Private store only. */
const DOC = "lp-pipeline";

export async function GET() {
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);
  return osJson({ ok: true, pipeline: parsePipeline(await readDoc(DOC)) });
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
    const result = applyPipelineOp(parsePipeline(await readDoc(DOC)), body);
    if (!result.ok) return osJson({ error: result.error }, 400);
    await writeDoc(DOC, JSON.stringify(result.pipeline));
    return osJson({ ok: true, pipeline: result.pipeline });
  } catch (error) {
    if (error instanceof SnapshotStoreError && error.code === "unconfigured") return osJson({ error: "The pipeline store is not configured" }, 503);
    return osJson({ error: "Could not save that" }, 500);
  }
}
