import { sameOriginRequest } from "@/lib/os/answers";
import { isOsAuthed } from "@/lib/os/current";
import { osJson } from "@/lib/os/response";
import { replyNow } from "@/lib/os/outreach/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);
  return osJson({ error: "Use POST" }, 405);
}

/** Sends Ryan's answer to a reply, in the same Gmail thread. Only on his click. */
export async function POST(req: Request) {
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);
  if (!sameOriginRequest(req)) return osJson({ error: "Forbidden" }, 403);
  const body = (await req.json().catch(() => ({}))) as { lead_id?: unknown; body?: unknown };
  if (typeof body.lead_id !== "string" || typeof body.body !== "string") return osJson({ error: "Write the answer first." }, 400);
  try {
    const result = await replyNow(body.lead_id, body.body);
    if (!result.ok) return osJson({ error: result.error }, 400);
    return osJson({ ok: true, book: result.book });
  } catch (error) {
    console.error("reply failed", error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error);
    return osJson({ error: `Could not send: ${error instanceof Error ? error.message : "unknown"}` }, 500);
  }
}
