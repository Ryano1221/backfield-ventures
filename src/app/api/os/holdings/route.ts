import { sameOriginRequest } from "@/lib/os/answers";
import { isOsAuthed } from "@/lib/os/current";
import { readDoc, writeDoc } from "@/lib/os/doc-store";
import { osJson } from "@/lib/os/response";
import { applyHoldingOp, parseHoldings } from "@/lib/os/holdings";
import { SnapshotStoreError } from "@/lib/os/store";

export const dynamic = "force-dynamic";

/** Portfolio holdings Ryan keeps by hand. Private store only. Moves no money and sends nothing. */
const DOC = "holdings";

export async function GET() {
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);
  return osJson({ ok: true, book: parseHoldings(await readDoc(DOC)) });
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
    const result = applyHoldingOp(parseHoldings(await readDoc(DOC)), body);
    if (!result.ok) return osJson({ error: result.error }, 400);
    await writeDoc(DOC, JSON.stringify(result.book));
    return osJson({ ok: true, book: result.book, id: result.id });
  } catch (error) {
    if (error instanceof SnapshotStoreError && error.code === "unconfigured") return osJson({ error: "The portfolio store is not configured" }, 503);
    return osJson({ error: "Could not save that" }, 500);
  }
}
