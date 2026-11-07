import { isOsAuthed } from "@/lib/os/current";
import { readDoc } from "@/lib/os/doc-store";
import { osJson } from "@/lib/os/response";
import { parseOutreach } from "@/lib/os/outreach/book";
import { repliesWaiting } from "@/lib/os/outreach/plan";

export const dynamic = "force-dynamic";

/** How many outreach replies are waiting on Ryan, for the Leads badge in the nav. */
export async function GET() {
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);
  const book = parseOutreach(await readDoc("outreach").catch(() => null));
  return osJson({ ok: true, replies: repliesWaiting(book).length });
}

export async function POST() {
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);
  return osJson({ error: "Use GET" }, 405);
}
