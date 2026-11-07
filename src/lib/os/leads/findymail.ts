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

export function findymailKey(env: Record<string, string | undefined> = process.env): string | null {
  return env.FINDYMAIL_API_KEY?.trim() || null;
}

async function call(fetcher: Fetch, key: string, method: "GET" | "POST", path: string, body?: unknown): Promise<Record<string, unknown>> {
  const res = await fetcher(`${BASE}${path}`, {
    method,
    headers: { authorization: `Bearer ${key}`, accept: "application/json", ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
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

/** Which Findymail lists feed which kind of lead. Saved; the daily run pulls new contacts from them. */
export type FindyMap = { version: 1; lists: Record<string, { kind: LeadKind; name: string }> };
export const EMPTY_MAP: FindyMap = { version: 1, lists: {} };

export function parseMap(raw: string | null): FindyMap {
  try {
    const data = raw ? (JSON.parse(raw) as Partial<FindyMap>) : null;
    return { version: 1, lists: data?.lists && typeof data.lists === "object" ? data.lists : {} };
  } catch {
    return structuredClone(EMPTY_MAP);
  }
}
