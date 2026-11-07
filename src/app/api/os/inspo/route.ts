import { sameOriginRequest } from "@/lib/os/answers";
import { isOsAuthed } from "@/lib/os/current";
import { osJson } from "@/lib/os/response";
import { applyInspoOp } from "@/lib/os/inspo/book";
import { readInspo, refreshAndSave, saveInspo } from "@/lib/os/inspo/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** What top VCs are posting: the list of people, their recent posts, and "Refresh now". */
export async function GET() {
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);
  return osJson({ ok: true, book: await readInspo() });
}

export async function POST(req: Request) {
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);
  if (!sameOriginRequest(req)) return osJson({ error: "Forbidden" }, 403);
  const body = (await req.json().catch(() => null)) as { op?: string } | null;
  try {
    if (body?.op === "refresh") {
      const { book, added, failed } = await refreshAndSave();
      return osJson({ ok: true, book, added, failed });
    }
    const result = applyInspoOp(await readInspo(), body);
    if (!result.ok) return osJson({ error: result.error }, 400);
    await saveInspo(result.book);
    return osJson({ ok: true, book: result.book });
  } catch (error) {
    console.error("inspo failed", error instanceof Error ? error.message : error);
    return osJson({ error: "Could not save that." }, 500);
  }
}
