/**
 * The saved list of leads and the changes Ryan makes to it. Pure functions:
 * the API route reads the doc, applies one change, and writes it back.
 */
import { companyKey } from "../added-companies";
import { templateDraft } from "./draft";
import { EMPTY_BOOK, LEAD_KINDS, type Lead, type LeadBook, type LeadContact, type LeadKind } from "./types";

const MAX_LEADS = 1500;
const MAX_FILINGS = 6000;

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const EMAIL = /^[^@\s,;<>]+@[^@\s,;<>]+\.[a-z]{2,}$/i;

export function parseLeads(raw: string | null): LeadBook {
  if (!raw) return structuredClone(EMPTY_BOOK);
  try {
    const data = JSON.parse(raw) as Partial<LeadBook>;
    return {
      version: 1,
      leads: Array.isArray(data.leads) ? data.leads.filter((lead) => lead && typeof lead.id === "string" && LEAD_KINDS.includes(lead.kind)) : [],
      cursor: {
        done_days: Array.isArray(data.cursor?.done_days) ? data.cursor.done_days.filter((d) => typeof d === "string") : [],
        done_filings: Array.isArray(data.cursor?.done_filings) ? data.cursor.done_filings.filter((d) => typeof d === "string") : [],
      },
      last_run: data.last_run ?? null,
      last_auto_run: typeof data.last_auto_run === "string" ? data.last_auto_run : null,
    };
  } catch {
    return structuredClone(EMPTY_BOOK);
  }
}

/** Adds found leads; a lead already on the list keeps its status and edits, and gains new facts. */
export function mergeLeads(book: LeadBook, found: Lead[]): { book: LeadBook; added: number; updated: number } {
  const byKey = new Map(book.leads.map((lead) => [lead.key, lead]));
  let added = 0;
  let updated = 0;
  for (const lead of found) {
    const old = byKey.get(lead.key);
    if (!old) {
      byKey.set(lead.key, lead);
      added++;
      continue;
    }
    const labels = new Set(lead.signals.map((s) => s.label));
    const emails = new Set(old.contacts.map((c) => c.email));
    byKey.set(lead.key, {
      ...old,
      signals: [...lead.signals, ...old.signals.filter((s) => !labels.has(s.label))],
      people: old.people.length ? old.people : lead.people,
      website: old.website ?? lead.website,
      research: lead.research ?? old.research,
      location: old.location ?? lead.location,
      contacts: [...old.contacts, ...lead.contacts.filter((c) => !emails.has(c.email))],
      score: lead.score || old.score,
      reasons: lead.reasons.length ? lead.reasons : old.reasons,
      draft: old.status === "new" && old.draft?.by !== "ai" ? lead.draft ?? old.draft : old.draft,
      updated_at: lead.updated_at,
    });
    updated++;
  }
  let leads = [...byKey.values()];
  if (leads.length > MAX_LEADS) {
    // Drop skipped leads first, then the oldest low scorers. Never approved or contacted ones.
    const keep = (lead: Lead) => lead.status === "approved" || lead.status === "contacted";
    const rest = leads.filter((lead) => !keep(lead)).sort((a, b) => Number(a.status === "skipped") - Number(b.status === "skipped") || b.score - a.score);
    leads = [...leads.filter(keep), ...rest].slice(0, MAX_LEADS);
  }
  return { book: { ...book, leads }, added, updated };
}

export function markFilings(book: LeadBook, filings: string[], days: string[]): LeadBook {
  const done_filings = [...new Set([...book.cursor.done_filings, ...filings])].slice(-MAX_FILINGS);
  const done_days = [...new Set([...book.cursor.done_days, ...days])].sort().slice(-60);
  return { ...book, cursor: { done_days, done_filings } };
}

export type LeadResult = { ok: true; book: LeadBook } | { ok: false; error: string };

/** One line per person: "Name, Firm, email@domain, note". Firm, email and note are optional. */
export function parseImport(raw: string, kind: LeadKind, now: string): Lead[] {
  const out: Lead[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const cells = line.split(/[,\t]/).map((cell) => cell.trim());
    const name = cells[0];
    if (!name || name.length > 120) continue;
    const email = cells.find((cell) => EMAIL.test(cell)) ?? null;
    const rest = cells.slice(1).filter((cell) => cell && cell !== email);
    const firm = rest[0] ?? null;
    const note = rest.slice(1).join(", ").slice(0, 400);
    const contacts: LeadContact[] = email ? [{ email: email.toLowerCase(), name, source: "import", confidence: "high", note: "Added by you." }] : [];
    const company = firm || name;
    out.push({
      id: `lead_${kind}_${companyKey(`${name}${firm ?? ""}`).slice(0, 40)}`,
      kind,
      key: `${kind}:${companyKey(`${name} ${firm ?? ""}`)}`,
      company,
      people: [{ name, title: null }],
      website: null,
      location: null,
      signals: firm ? [{ label: "Firm", value: firm }] : [],
      contacts,
      score: 0,
      reasons: [],
      draft: null,
      status: "new",
      to: email ? email.toLowerCase() : null,
      source: "Added by you",
      source_url: null,
      note,
      found_at: now,
      updated_at: now,
    });
    if (out.length >= 300) break;
  }
  return out;
}

export function applyLeadOp(book: LeadBook, raw: unknown, now = new Date().toISOString()): LeadResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Nothing to change." };
  const op = raw as Record<string, unknown>;
  if (op.op === "import") {
    const kind = LEAD_KINDS.includes(op.kind as LeadKind) ? (op.kind as LeadKind) : "lp";
    const found = parseImport(text(op.text, 40_000), kind, now).map((lead) => ({ ...lead, draft: templateDraft(lead) }));
    if (!found.length) return { ok: false, error: "Add one person per line: name, firm, email." };
    return { ok: true, book: mergeLeads(book, found).book };
  }
  if (op.op === "bulk") {
    const kind = LEAD_KINDS.includes(op.kind as LeadKind) ? (op.kind as LeadKind) : null;
    const action = op.action === "approve" || op.action === "skip" ? op.action : null;
    const score = Number(op.score);
    if (!kind || !action || !Number.isFinite(score)) return { ok: false, error: "Unknown change." };
    const picked = bulkPick(book, kind, action, score);
    if (!picked.length) return { ok: false, error: "Nothing matches." };
    const ids = new Set(picked.map((lead) => lead.id));
    const leads = book.leads.map((lead) => (ids.has(lead.id) ? { ...lead, status: action === "approve" ? ("approved" as const) : ("skipped" as const), to: action === "approve" ? bestAddress(lead) : lead.to, updated_at: now } : lead));
    return { ok: true, book: { ...book, leads } };
  }
  if (op.op === "restore_many") {
    const ids = new Set(Array.isArray(op.ids) ? op.ids.filter((id): id is string => typeof id === "string").slice(0, 1500) : []);
    if (!ids.size) return { ok: false, error: "Nothing to restore." };
    return { ok: true, book: { ...book, leads: book.leads.map((lead) => (ids.has(lead.id) ? { ...lead, status: "new" as const, updated_at: now } : lead)) } };
  }
  const id = text(op.id, 120);
  const index = book.leads.findIndex((lead) => lead.id === id);
  if (index < 0) return { ok: false, error: "That lead is not on the list." };
  const lead = { ...book.leads[index], updated_at: now };
  switch (op.op) {
    case "approve": {
      const to = text(op.to, 200).toLowerCase() || lead.to || lead.contacts[0]?.email || "";
      if (!EMAIL.test(to)) return { ok: false, error: "Pick or type an email address first." };
      lead.to = to;
      lead.status = "approved";
      if (!lead.contacts.some((c) => c.email === to)) lead.contacts = [...lead.contacts, { email: to, name: null, source: "import", confidence: "high", note: "Added by you." }];
      break;
    }
    case "contacted":
      lead.status = "contacted";
      break;
    case "skip":
      lead.status = "skipped";
      lead.snoozed_until = null;
      break;
    case "snooze": {
      const days = Number(op.days);
      if (![14, 30, 90].includes(days)) return { ok: false, error: "Snooze for 14, 30 or 90 days." };
      lead.status = "skipped";
      lead.snoozed_until = new Date(Date.parse(now) + days * 86_400_000).toISOString().slice(0, 10);
      break;
    }
    case "restore":
      lead.status = "new";
      lead.snoozed_until = null;
      break;
    case "draft": {
      const subject = text(op.subject, 200);
      const body = text(op.body, 4000);
      if (!subject || !body) return { ok: false, error: "The email needs a subject and a body." };
      lead.draft = { subject, body, by: lead.draft?.by ?? "template" };
      break;
    }
    case "note":
      lead.note = text(op.note, 1000);
      break;
    default:
      return { ok: false, error: "Unknown change." };
  }
  const leads = [...book.leads];
  leads[index] = lead;
  return { ok: true, book: { ...book, leads } };
}

/** A Gmail compose link with the draft filled in. Opening it sends nothing. */
export function gmailLink(lead: Lead): string | null {
  if (!lead.to || !lead.draft) return null;
  const params = new URLSearchParams({ view: "cm", fs: "1", to: lead.to, su: lead.draft.subject, body: lead.draft.body });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

/** A real address to use: the picked one, else the best named or team address. Never a guess. */
export function bestAddress(lead: Lead): string | null {
  if (lead.to && lead.contacts.find((c) => c.email === lead.to)?.confidence !== "low") return lead.to;
  return lead.contacts.find((c) => c.confidence === "high" || c.confidence === "medium")?.email ?? null;
}

/** Leads a bulk action would touch: new ones of this kind at or above (approve) or below (skip) the score. Approve needs a real address. */
export function bulkPick(book: LeadBook, kind: LeadKind, action: "approve" | "skip", score: number): Lead[] {
  return book.leads.filter((lead) => lead.kind === kind && lead.status === "new" && (action === "approve" ? lead.score >= score && Boolean(bestAddress(lead)) : lead.score < score));
}

/** Leads as CSV for other tools (Findymail, a spreadsheet, a CRM import). */
export function leadsCsv(leads: Lead[]): string {
  const head = ["company", "type", "status", "score", "person", "title", "email", "email_source", "location", "website", "top_reason", "said_recently", "said_source", "source", "found"];
  const cell = (value: string | number | null | undefined) => {
    const text = value == null ? "" : String(value);
    // Quote anything with a comma, quote or line break; a leading = + - @ is neutralised so spreadsheets don't run it.
    const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const rows = leads.map((lead) => {
    const contact = lead.contacts.find((c) => c.email === lead.to) ?? lead.contacts[0];
    const said = lead.research?.status === "found" ? lead.research.findings[0] : null;
    return [lead.company, lead.kind, lead.status, lead.score, lead.people[0]?.name, lead.people[0]?.title, contact?.email, contact?.source, lead.location, lead.website, lead.reasons.find((r) => r.startsWith("+"))?.replace(/^\+\d+\s+/, ""), said?.quote, said?.url, lead.source, lead.found_at.slice(0, 10)].map(cell).join(",");
  });
  return [head.join(","), ...rows].join("\r\n") + "\r\n";
}

/** Snoozed leads whose date has come go back to review. Returns how many woke up. */
export function wakeSnoozed(book: LeadBook, now: Date): { book: LeadBook; woke: number } {
  const today = now.toISOString().slice(0, 10);
  let woke = 0;
  const leads = book.leads.map((lead) => {
    if (lead.status !== "skipped" || !lead.snoozed_until || lead.snoozed_until > today) return lead;
    woke++;
    return { ...lead, status: "new" as const, snoozed_until: null, updated_at: now.toISOString() };
  });
  return { book: woke ? { ...book, leads } : book, woke };
}
