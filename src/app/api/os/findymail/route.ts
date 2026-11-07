import { sameOriginRequest } from "@/lib/os/answers";
import { isOsAuthed } from "@/lib/os/current";
import { writeDoc } from "@/lib/os/doc-store";
import { osJson } from "@/lib/os/response";
import { mergeLeads } from "@/lib/os/leads/book";
import { templateDraft } from "@/lib/os/leads/draft";
import { applySearchOp, credits, findymailKey, FindymailError, leadFromContact, listContacts, listLists } from "@/lib/os/leads/findymail";
import { scoreLead } from "@/lib/os/leads/score";
import { FINDYMAIL_DOC, LEADS_DOC, readFindyMap, readLeads, readTaste } from "@/lib/os/leads/server";
import { LEAD_KINDS, type LeadKind } from "@/lib/os/leads/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Ryan's Findymail lists, which kind of lead each one feeds, and his remaining credits. */
export async function GET() {
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);
  const key = findymailKey();
  const saved = await readFindyMap();
  if (!key) return osJson({ ok: true, ready: false, lists: [], map: saved.lists, searches: saved.searches, credits: null });
  try {
    const [lists, balance] = await Promise.all([listLists(fetch, key), credits(fetch, key).catch(() => null)]);
    return osJson({ ok: true, ready: true, lists, map: saved.lists, searches: saved.searches, credits: balance });
  } catch (error) {
    return osJson({ error: error instanceof FindymailError ? error.message : "Findymail could not be reached" }, 502);
  }
}

/**
 * Tag a list with a lead kind (or untag it with kind null). Tagged lists are pulled
 * into Leads now and again on every daily run. Reading lists costs no credits.
 */
export async function POST(req: Request) {
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);
  if (!sameOriginRequest(req)) return osJson({ error: "Forbidden" }, 403);
  const key = findymailKey();
  if (!key) return osJson({ error: "Add FINDYMAIL_API_KEY in Vercel first." }, 503);
  const body = (await req.json().catch(() => ({}))) as { op?: unknown; list_id?: unknown; name?: unknown; kind?: unknown; query?: unknown; titles?: unknown; limit?: unknown; id?: unknown };
  if (body.op === "search_add" || body.op === "search_remove") {
    const result = applySearchOp(await readFindyMap(), body, new Date().toISOString());
    if (!result.ok) return osJson({ error: result.error }, 400);
    await writeDoc(FINDYMAIL_DOC, JSON.stringify(result.map));
    return osJson({ ok: true, map: result.map.lists, searches: result.map.searches });
  }
  const id = typeof body.list_id === "number" ? body.list_id : Number(body.list_id);
  if (!Number.isInteger(id) || id < 0) return osJson({ error: "Pick a list." }, 400);
  const map = await readFindyMap();
  if (body.kind === null) {
    delete map.lists[String(id)];
    await writeDoc(FINDYMAIL_DOC, JSON.stringify(map));
    return osJson({ ok: true, map: map.lists, added: 0 });
  }
  if (!LEAD_KINDS.includes(body.kind as LeadKind)) return osJson({ error: "Pick Founders, Partners or LPs." }, 400);
  const name = typeof body.name === "string" ? body.name.slice(0, 120) : `List ${id}`;
  map.lists[String(id)] = { kind: body.kind as LeadKind, name };
  await writeDoc(FINDYMAIL_DOC, JSON.stringify(map));
  try {
    const now = new Date().toISOString();
    const taste = await readTaste();
    const found = (await listContacts(fetch, key, id)).map((contact) => {
      const lead = leadFromContact(contact, body.kind as LeadKind, name, now);
      const scored = scoreLead(lead, taste);
      return { ...lead, score: scored.score, reasons: scored.reasons, draft: templateDraft(lead) };
    });
    const latest = await readLeads();
    const onList = new Set(latest.leads.map((lead) => lead.key));
    const merged = mergeLeads(latest, found.filter((lead) => !onList.has(lead.key)));
    await writeDoc(LEADS_DOC, JSON.stringify(merged.book));
    return osJson({ ok: true, map: map.lists, added: merged.added, book: merged.book });
  } catch (error) {
    return osJson({ error: error instanceof FindymailError ? error.message : "Findymail could not be reached", map: map.lists }, 502);
  }
}
