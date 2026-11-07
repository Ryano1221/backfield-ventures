/**
 * Findymail (app.findymail.com), Ryan's email finder. Used for:
 *   - finding a named person's email from name and company domain (1 credit, only when found)
 *   - verifying an address before autopilot's first email (1 verifier credit)
 *   - pulling contacts from Ryan's saved Findymail lists into Leads
 * Off until FINDYMAIL_API_KEY is set.
 */
import { companyKey } from "../added-companies";
import type { Lead, LeadContact, LeadKind, LeadPerson } from "./types";

const BASE = "https://app.findymail.com/api";

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

export class FindymailError extends Error {
  /** 402 out of credits, 423 paused, 429 busy: stop calling for this run. */
  readonly stop: boolean;
  constructor(message: string, stop: boolean) {
    super(message);
    this.stop = stop;
  }
}

/**
 * The key as it should be sent. Keys pasted from a web page or chat often carry
 * invisible characters (zero-width spaces, non-breaking spaces, line breaks),
 * curly quotes or a "Bearer " prefix. fetch refuses a header holding any of those
 * and throws before the request is even made, so they are stripped here.
 */
export function cleanKey(raw: string): { key: string; stripped: number; bad: string[] } {
  let key = raw.replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, "").replace(/\s+/g, "");
  key = key.replace(/^["'\u201C\u201D\u2018\u2019`]+|["'\u201C\u201D\u2018\u2019`]+$/g, "").replace(/^bearer/i, "");
  // Anything still outside printable ASCII can't go in a header; name it so it can be fixed in Vercel.
  const bad = [...new Set([...key].filter((c) => c < "!" || c > "~").map((c) => `U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`))];
  return { key, stripped: raw.length - key.length, bad };
}

export function findymailKey(env: Record<string, string | undefined> = process.env): string | null {
  const raw = env.FINDYMAIL_API_KEY;
  if (!raw?.trim()) return null;
  return cleanKey(raw).key || null;
}

/** For the panel: whether the saved key needed cleaning, without ever revealing it. */
export function keyNote(env: Record<string, string | undefined> = process.env): string | null {
  const raw = env.FINDYMAIL_API_KEY;
  if (!raw?.trim()) return null;
  const { stripped, bad } = cleanKey(raw);
  if (bad.length) return `FINDYMAIL_API_KEY contains characters that aren't part of an API key (${bad.join(", ")}). Copy it again from Findymail's API page and re-paste it in Vercel.`;
  if (stripped) return `FINDYMAIL_API_KEY had ${stripped} extra ${stripped === 1 ? "character" : "characters"} (spaces, line breaks, quotes or invisible characters) that are now ignored. Re-pasting it cleanly in Vercel is a good idea.`;
  return null;
}

const TIMEOUT_MS = 15_000;

/** A short reason for a request that never got an answer: the cause's code (ENOTFOUND, ECONNRESET...) or a timeout. */
export function failureReason(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  if (error.name === "TimeoutError" || error.name === "AbortError") return `no answer within ${TIMEOUT_MS / 1000} seconds`;
  const cause = (error as { cause?: { code?: string; message?: string } }).cause;
  return [error.message, cause?.code, cause?.message && cause.message !== error.message ? cause.message : null].filter(Boolean).join(": ");
}

async function call(fetcher: Fetch, key: string, method: "GET" | "POST", path: string, body?: unknown): Promise<Record<string, unknown>> {
  const { bad } = cleanKey(key);
  if (bad.length) throw new FindymailError(`Findymail: FINDYMAIL_API_KEY contains characters that can't be sent (${bad.join(", ")}). Re-paste the key in Vercel.`, true);
  let res: Response;
  try {
    res = await fetcher(`${BASE}${path}`, {
      method,
      headers: { authorization: `Bearer ${key}`, accept: "application/json", ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    // fetch threw instead of answering: a bad header, DNS, TLS, a dropped connection or the timeout.
    throw new FindymailError(`Findymail: request to ${path.split("?")[0]} failed (${failureReason(error)})`, true);
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.status === 402 || res.status === 423 || res.status === 429) throw new FindymailError(`Findymail: ${String(data.error ?? res.status)}`, true);
  if (res.status === 401) throw new FindymailError("Findymail: the API key was refused", true);
  if (!res.ok || typeof data.error === "string") throw new FindymailError(`Findymail: ${String(data.error ?? `error ${res.status}`)}`, false);
  return data;
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

/** A person's email from their name and the company's domain (or name). Null when not found. */
export async function findEmail(fetcher: Fetch, key: string, name: string, domainOrCompany: string): Promise<string | null> {
  const data = await call(fetcher, key, "POST", "/search/name", { name, domain: domainOrCompany });
  const email = (data.contact as { email?: unknown } | undefined)?.email;
  return typeof email === "string" && EMAIL.test(email.trim()) ? email.trim().toLowerCase() : null;
}

/** True when the address accepts mail, false when it doesn't. */
export async function verifyEmail(fetcher: Fetch, key: string, email: string): Promise<boolean> {
  const data = await call(fetcher, key, "POST", "/verify", { email });
  return data.verified === true;
}

export type FindyList = { id: number; name: string };

export async function listLists(fetcher: Fetch, key: string): Promise<FindyList[]> {
  const data = await call(fetcher, key, "GET", "/lists");
  return (Array.isArray(data.lists) ? data.lists : []).flatMap((row) => {
    const list = row as { id?: unknown; name?: unknown };
    return typeof list.id === "number" && typeof list.name === "string" ? [{ id: list.id, name: list.name }] : [];
  });
}

export type FindyContact = { id: number; name: string; email: string | null; linkedin: string | null; company: string | null; title: string | null };

function readContacts(data: Record<string, unknown>): FindyContact[] {
  return (Array.isArray(data.data) ? data.data : []).flatMap((row) => {
    const c = row as Record<string, unknown>;
    if (typeof c.id !== "number" || typeof c.name !== "string" || !c.name.trim()) return [];
    const email = typeof c.email === "string" && EMAIL.test(c.email.trim()) ? c.email.trim().toLowerCase() : null;
    const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);
    return [{ id: c.id, name: c.name.trim(), email, linkedin: text(c.linkedin_url), company: text(c.company), title: text(c.job_title) }];
  });
}

/** Every contact saved in a list. The API pages like a data table; ask for more until all are in. */
export async function listContacts(fetcher: Fetch, key: string, listId: number, max = 2000): Promise<FindyContact[]> {
  const first = await call(fetcher, key, "GET", `/contacts/get/${listId}`);
  const out = readContacts(first);
  const total = typeof first.recordsTotal === "number" ? first.recordsTotal : out.length;
  const seen = new Set(out.map((c) => c.id));
  while (out.length < Math.min(total, max)) {
    const page = readContacts(await call(fetcher, key, "GET", `/contacts/get/${listId}?start=${out.length}&length=100`));
    const fresh = page.filter((c) => !seen.has(c.id));
    if (!fresh.length) break;
    for (const c of fresh) {
      seen.add(c.id);
      out.push(c);
    }
  }
  return out.slice(0, max);
}

export async function credits(fetcher: Fetch, key: string): Promise<{ finder: number | null; verifier: number | null; capacity: boolean | null }> {
  const data = await call(fetcher, key, "GET", "/credits");
  const n = (value: unknown) => (typeof value === "number" ? value : null);
  return { finder: n(data.credits), verifier: n(data.verifier_credits), capacity: typeof data.has_capacity === "boolean" ? data.has_capacity : null };
}

/** A lead from a contact saved in a Findymail list. */
export function leadFromContact(contact: FindyContact, kind: LeadKind, listName: string, now: string): Lead {
  const company = contact.company || contact.name;
  const people: LeadPerson[] = [{ name: contact.name, title: contact.title }];
  const contacts: LeadContact[] = contact.email ? [{ email: contact.email, name: contact.name, source: "vendor:Findymail", confidence: "high", note: "Saved in your Findymail list." }] : [];
  const signals = [
    ...(contact.title ? [{ label: "Title", value: contact.title }] : []),
    ...(contact.company ? [{ label: "Company", value: contact.company }] : []),
    { label: "Findymail list", value: listName },
  ];
  return {
    id: `lead_${kind}_fm${contact.id}`,
    kind,
    key: `${kind}:${companyKey(`${contact.name} ${contact.company ?? ""}`)}`,
    company,
    people,
    website: null,
    location: null,
    signals,
    contacts,
    score: 0,
    reasons: [],
    draft: null,
    status: "new",
    to: contact.email,
    source: "Findymail",
    source_url: contact.linkedin,
    note: "",
    found_at: now,
    updated_at: now,
  };
}

/**
 * A saved plain-language search ("single family offices in Texas") that Findymail's
 * Intellimatch runs weekly. It works in the background: start, then collect on a later run.
 */
export type FindySearch = { id: string; kind: LeadKind; query: string; titles: string[]; limit: number; hash: string | null; started_at: string | null; last_run: string | null; last_count: number | null; note: string };

/** Which Findymail lists feed which kind of lead, and the saved searches. The daily run pulls from both. */
export type FindyMap = { version: 1; lists: Record<string, { kind: LeadKind; name: string }>; searches: FindySearch[] };
export const EMPTY_MAP: FindyMap = { version: 1, lists: {}, searches: [] };

export function parseMap(raw: string | null): FindyMap {
  try {
    const data = raw ? (JSON.parse(raw) as Partial<FindyMap>) : null;
    return {
      version: 1,
      lists: data?.lists && typeof data.lists === "object" ? data.lists : {},
      searches: Array.isArray(data?.searches) ? data.searches.filter((s) => s && typeof s.id === "string" && typeof s.query === "string") : [],
    };
  } catch {
    return structuredClone(EMPTY_MAP);
  }
}

export const SEARCH_LIMITS = [10, 25, 50] as const;
const WEEK_MS = 7 * 86_400_000;

/** Starts an Intellimatch search: matching companies, one contact each with a verified email. Returns the task hash. */
export async function startSearch(fetcher: Fetch, key: string, search: Pick<FindySearch, "query" | "titles" | "limit">): Promise<string> {
  const data = await call(fetcher, key, "POST", "/intellimatch/search", {
    query: search.query,
    limit: search.limit,
    config: { find_contact: true, find_email: true, require_email: true, find_phone: false, mode: "broad", ...(search.titles.length ? { target_job_titles: [search.titles] } : {}) },
  });
  if (typeof data.hash !== "string") throw new FindymailError("Findymail: the search did not start", false);
  return data.hash;
}

export async function searchStatus(fetcher: Fetch, key: string, hash: string): Promise<"success" | "processing" | "pending" | "failed" | "not_found"> {
  const data = await call(fetcher, key, "GET", `/intellimatch/status?hash=${encodeURIComponent(hash)}`);
  const status = String(data.status);
  return status === "success" || status === "processing" || status === "pending" || status === "failed" ? status : "not_found";
}

export type FindyMatch = { id: number; company: string; domain: string | null; description: string | null; employees: string | null; industries: string[]; country: string | null; score: number | null; name: string | null; email: string | null; title: string | null; linkedin: string | null };

export async function searchResults(fetcher: Fetch, key: string, hash: string, max = 200): Promise<FindyMatch[]> {
  const out: FindyMatch[] = [];
  for (let page = 1; page <= 10 && out.length < max; page++) {
    const data = await call(fetcher, key, "GET", `/intellimatch/data?hash=${encodeURIComponent(hash)}&page=${page}&per_page=100`);
    for (const row of Array.isArray(data.data) ? data.data : []) {
      const r = row as Record<string, unknown>;
      const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);
      if (typeof r.id !== "number" || !text(r.name)) continue;
      const email = text(r.contact_email);
      out.push({
        id: r.id,
        company: text(r.name)!,
        domain: text(r.domain),
        description: text(r.description),
        employees: text(r.employee_count_range),
        industries: Array.isArray(r.industries) ? r.industries.filter((i): i is string => typeof i === "string").slice(0, 4) : [],
        country: text(r.country),
        score: typeof r.match_score === "number" ? r.match_score : null,
        name: text(r.contact_name),
        email: email && EMAIL.test(email) ? email.toLowerCase() : null,
        title: text(r.contact_job_title),
        linkedin: text(r.contact_linkedin_url),
      });
    }
    const meta = data.meta as { last_page?: number } | undefined;
    if (!meta?.last_page || page >= meta.last_page) break;
  }
  return out.slice(0, max);
}

/** A lead from an Intellimatch match. */
export function leadFromMatch(match: FindyMatch, search: FindySearch, now: string): Lead {
  const people: LeadPerson[] = match.name ? [{ name: match.name, title: match.title }] : [];
  const signals = [
    { label: "Matched search", value: search.query.slice(0, 80) },
    ...(match.score != null ? [{ label: "Match", value: `${match.score}%` }] : []),
    ...(match.industries.length ? [{ label: "Industry", value: match.industries.join(", ") }] : []),
    ...(match.employees ? [{ label: "Team size", value: match.employees }] : []),
    ...(match.description ? [{ label: "About", value: match.description.slice(0, 160) }] : []),
  ];
  return {
    id: `lead_${search.kind}_im${match.id}`,
    kind: search.kind,
    key: `${search.kind}:${companyKey(`${match.name ?? ""} ${match.company}`)}`,
    company: match.company,
    people,
    website: match.domain ? `https://${match.domain.replace(/^https?:\/\//, "")}` : null,
    location: match.country,
    signals,
    contacts: match.email ? [{ email: match.email, name: match.name, source: "vendor:Findymail", confidence: "high", note: "Found by your Findymail search." }] : [],
    score: 0,
    reasons: [],
    draft: null,
    status: "new",
    to: match.email,
    source: "Findymail search",
    source_url: match.linkedin,
    note: "",
    found_at: now,
    updated_at: now,
  };
}

/** What a search should do on this run: start fresh (weekly), check on a running one, or nothing. */
export function searchStep(search: FindySearch, now: Date): "start" | "check" | "wait" {
  if (search.hash) return "check";
  if (!search.last_run || now.getTime() - Date.parse(search.last_run) >= WEEK_MS) return "start";
  return "wait";
}

/** Add or remove a saved search. At most 10, so weekly credit use stays predictable. */
export function applySearchOp(map: FindyMap, op: { op?: unknown; kind?: unknown; query?: unknown; titles?: unknown; limit?: unknown; id?: unknown }, now: string, newId = () => `s_${Math.random().toString(36).slice(2, 10)}`): { ok: true; map: FindyMap } | { ok: false; error: string } {
  if (op.op === "search_remove") {
    if (!map.searches.some((s) => s.id === op.id)) return { ok: false, error: "That search is gone." };
    return { ok: true, map: { ...map, searches: map.searches.filter((s) => s.id !== op.id) } };
  }
  const query = typeof op.query === "string" ? op.query.trim().slice(0, 300) : "";
  if (query.length < 8) return { ok: false, error: "Describe who to find, like \"single family offices in Texas\"." };
  if (!(["founder", "partner", "lp"] as const).includes(op.kind as LeadKind)) return { ok: false, error: "Pick Founders, Partners or LPs." };
  if (map.searches.length >= 10) return { ok: false, error: "Ten saved searches is the limit. Remove one first." };
  const titles = (Array.isArray(op.titles) ? op.titles : typeof op.titles === "string" ? op.titles.split(",") : []).map((t) => String(t).trim()).filter(Boolean).slice(0, 10);
  const limit = (SEARCH_LIMITS as readonly number[]).includes(Number(op.limit)) ? Number(op.limit) : 25;
  const search: FindySearch = { id: newId(), kind: op.kind as LeadKind, query, titles, limit, hash: null, started_at: null, last_run: null, last_count: null, note: `Starts on the next daily run (${now.slice(0, 10)} or after).` };
  return { ok: true, map: { ...map, searches: [...map.searches, search] } };
}
