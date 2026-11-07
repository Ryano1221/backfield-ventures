import { sameOriginRequest } from "@/lib/os/answers";
import { isOsAuthed } from "@/lib/os/current";
import { writeDoc } from "@/lib/os/doc-store";
import { osJson } from "@/lib/os/response";
import { aiRead, aiReady } from "@/lib/os/leads/ai";
import { researchLead } from "@/lib/os/leads/research-call";
import { scoreLead } from "@/lib/os/leads/score";
import { LEADS_DOC, readLeads, readTaste } from "@/lib/os/leads/server";

export const dynamic = "force-dynamic";
/** Searching and reading a person's recent public pages takes a minute or two. */
export const maxDuration = 240;

export async function GET() {
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);
  return osJson({ error: "Use POST" }, 405);
}

/** Researches one lead now, then rewrites its draft around what checks out. Sends nothing. */
export async function POST(req: Request) {
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);
  if (!sameOriginRequest(req)) return osJson({ error: "Forbidden" }, 403);
  if (!aiReady()) return osJson({ error: "Research needs ANTHROPIC_API_KEY in Vercel." }, 503);
  const body = (await req.json().catch(() => ({}))) as { id?: unknown };
  const before = await readLeads();
  const lead = before.leads.find((l) => l.id === body.id);
  if (!lead) return osJson({ error: "That lead is not on the list." }, 400);
  const research = await researchLead(lead, new Date());
  const updated = { ...lead, research, updated_at: new Date().toISOString() };
  const scored = scoreLead(updated, await readTaste());
  updated.score = scored.score;
  updated.reasons = scored.reasons;
  if (research.status === "found" && lead.status === "new") {
    const read = await aiRead(updated);
    if (read) updated.draft = read.draft;
  }
  // Save onto the latest list, in case it changed while this ran.
  const latest = await readLeads();
  const book = { ...latest, leads: latest.leads.map((l) => (l.id === lead.id ? { ...l, research: updated.research, score: updated.score, reasons: updated.reasons, draft: updated.draft, updated_at: updated.updated_at } : l)) };
  await writeDoc(LEADS_DOC, JSON.stringify(book));
  return osJson({ ok: true, book });
}
