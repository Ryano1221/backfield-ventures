import { sameOriginRequest } from "@/lib/os/answers";
import { isOsAuthed } from "@/lib/os/current";
import { applyRaiseOp, readRaise, summarizeRaise, writeRaise } from "@/lib/os/raise";
import { osJson } from "@/lib/os/response";
import { SnapshotStoreError } from "@/lib/os/store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);
  const ledger = await readRaise();
  return osJson({ ok: true, ledger, summary: summarizeRaise(ledger) });
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
    const current = await readRaise();
    const result = applyRaiseOp(current, body);
    if (!result.ok) return osJson({ error: result.error }, 400);
    await writeRaise(result.ledger);
    return osJson({ ok: true, ledger: result.ledger, summary: summarizeRaise(result.ledger) });
  } catch (error) {
    if (error instanceof SnapshotStoreError && error.code === "unconfigured") return osJson({ error: "Raise store is not configured" }, 503);
    return osJson({ error: "Could not save that" }, 500);
  }
}
