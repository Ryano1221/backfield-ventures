/**
 * Warm leads for the raise: people one step from a check, where each came
 * from, and the referral asks that produce them. Private store only; nothing
 * sends. The OS suggests who to ask; Ryan does the asking.
 */

export const LEAD_STATUSES = ["to_reach", "reached", "meeting", "committed", "passed"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = { to_reach: "To reach", reached: "Reached out", meeting: "Meeting", committed: "Committed", passed: "Passed" };

export const LEAD_SOURCES = ["intro", "spv", "founder", "event", "other"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];
export const LEAD_SOURCE_LABEL: Record<LeadSource, string> = { intro: "Intro", spv: "SPV investor", founder: "Founder intro", event: "Event", other: "Other" };

export const ASK_STATUSES = ["asked", "named", "no"] as const;
export type AskStatus = (typeof ASK_STATUSES)[number];

export type Lead = { id: string; name: string; person_id: string | null; firm: string | null; source: LeadSource; referrer: string | null; status: LeadStatus; note: string; created_at: string; updated_at: string };
/** A referral ask: "who are two people who'd want to see this?" */
export type Ask = { id: string; who: string; person_id: string | null; status: AskStatus; asked_at: string; updated_at: string };
export type LeadBook = { version: 1; leads: Lead[]; asks: Ask[] };
export const EMPTY_LEADS: LeadBook = { version: 1, leads: [], asks: [] };

export type LeadResult = { ok: true; book: LeadBook; id: string } | { ok: false; error: string };

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function applyLeadOp(book: LeadBook, raw: unknown, now = new Date().toISOString(), newId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`): LeadResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Nothing to change." };
  const op = raw as Record<string, unknown>;

  if (op.op === "add_lead") {
    const name = text(op.name, 120);
    if (!name) return { ok: false, error: "Who is the lead?" };
    if (book.leads.some((row) => same(row.name, name) && row.status !== "passed")) return { ok: false, error: `${name} is already a lead.` };
    if (book.leads.length >= 3000) return { ok: false, error: "The lead list is full." };
    const source = LEAD_SOURCES.includes(op.source as LeadSource) ? (op.source as LeadSource) : text(op.referrer, 120) ? "intro" : "other";
    const lead: Lead = { id: newId("lead"), name, person_id: text(op.person_id, 120) || null, firm: text(op.firm, 160) || null, source, referrer: text(op.referrer, 120) || null, status: "to_reach", note: text(op.note, 1000), created_at: now, updated_at: now };
    let asks = book.asks;
    // Naming someone answers an open ask from that referrer.
    if (lead.referrer) asks = asks.map((ask) => (same(ask.who, lead.referrer!) && ask.status === "asked" ? { ...ask, status: "named", updated_at: now } : ask));
    return { ok: true, id: lead.id, book: { version: 1, leads: [lead, ...book.leads], asks } };
  }

  if (op.op === "lead_status") {
    const lead = book.leads.find((row) => row.id === text(op.id, 80));
    if (!lead) return { ok: false, error: "That lead is not on the list." };
    if (!LEAD_STATUSES.includes(op.status as LeadStatus)) return { ok: false, error: "Unknown status." };
    const next = { ...lead, status: op.status as LeadStatus, updated_at: now };
    return { ok: true, id: lead.id, book: { ...book, leads: book.leads.map((row) => (row.id === lead.id ? next : row)) } };
  }

  if (op.op === "remove_lead") {
    const id = text(op.id, 80);
    if (!book.leads.some((row) => row.id === id)) return { ok: false, error: "That lead is not on the list." };
    return { ok: true, id, book: { ...book, leads: book.leads.filter((row) => row.id !== id) } };
  }

  if (op.op === "ask") {
    const who = text(op.who, 120);
    if (!who) return { ok: false, error: "Who did you ask?" };
    const status = ASK_STATUSES.includes(op.status as AskStatus) ? (op.status as AskStatus) : "asked";
    const existing = book.asks.find((ask) => same(ask.who, who));
    if (existing) {
      const next = { ...existing, status, updated_at: now };
      return { ok: true, id: existing.id, book: { ...book, asks: book.asks.map((ask) => (ask.id === existing.id ? next : ask)) } };
    }
    const ask: Ask = { id: newId("ask"), who, person_id: text(op.person_id, 120) || null, status, asked_at: now, updated_at: now };
    return { ok: true, id: ask.id, book: { ...book, asks: [ask, ...book.asks] } };
  }

  return { ok: false, error: "Unknown change." };
}

export function parseLeads(raw: string | null): LeadBook {
  if (!raw) return { version: 1, leads: [], asks: [] };
  try {
    const data = JSON.parse(raw) as { leads?: unknown; asks?: unknown };
    return {
      version: 1,
      leads: Array.isArray(data.leads) ? (data.leads as Lead[]).filter((row) => row && typeof row.id === "string" && typeof row.name === "string") : [],
      asks: Array.isArray(data.asks) ? (data.asks as Ask[]).filter((row) => row && typeof row.id === "string" && typeof row.who === "string") : [],
    };
  } catch {
    return { version: 1, leads: [], asks: [] };
  }
}

export type Referrer = { name: string; leads: number; meetings: number; committed: number };

/** Who actually produces: leads named, how many got to a meeting, how many committed. */
export function referrers(book: LeadBook): Referrer[] {
  const rows = new Map<string, Referrer>();
  for (const lead of book.leads) {
    if (!lead.referrer) continue;
    const key = lead.referrer.toLowerCase();
    const row = rows.get(key) ?? { name: lead.referrer, leads: 0, meetings: 0, committed: 0 };
    row.leads += 1;
    if (lead.status === "meeting" || lead.status === "committed") row.meetings += 1;
    if (lead.status === "committed") row.committed += 1;
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => b.committed - a.committed || b.meetings - a.meetings || b.leads - a.leads || a.name.localeCompare(b.name));
}

export type Candidate = { name: string; person_id: string | null; why: string };

/**
 * Who to ask for two names: people who just said yes or had a good call,
 * minus anyone already asked. Committed money first, then good calls.
 */
export function askCandidates(book: LeadBook, people: { name: string; person_id: string | null; why: string }[]): Candidate[] {
  const asked = new Set(book.asks.map((ask) => ask.who.trim().toLowerCase()));
  const seen = new Set<string>();
  return people.filter((row) => {
    const key = row.name.trim().toLowerCase();
    if (!key || asked.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** SPV investors who aren't in Fund I yet and aren't already leads. */
export function spvToFund(backers: { name: string; personId: string | null; spvs: number; committed: number }[], fundNames: string[], book: LeadBook): { name: string; personId: string | null; spvs: number; committed: number }[] {
  const inFund = new Set(fundNames.map((name) => name.trim().toLowerCase()));
  const leads = new Set(book.leads.map((lead) => lead.name.trim().toLowerCase()));
  return backers.filter((row) => !inFund.has(row.name.trim().toLowerCase()) && !leads.has(row.name.trim().toLowerCase()));
}
