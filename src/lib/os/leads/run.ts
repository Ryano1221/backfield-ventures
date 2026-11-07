/**
 * One pass of the lead finder:
 *   1. read recent SEC Form D filings (free, public), a batch at a time
 *   2. keep young consumer companies raising (founders) and venture syndicates (partners)
 *   3. find each founder's website and published email (free); ask the paid vendor when set
 *   4. score against Ryan's taste, then draft the first email
 * Each step can fail on its own without losing the rest. Nothing is sent.
 */
import { mergeLeads, markFilings } from "./book";
import { templateDraft } from "./draft";
import { scoreLead, type Taste } from "./score";
import { classify, dailyIndexUrl, filingXmlUrl, leadFromFiling, parseDailyIndex, parseFormD, type IndexRow } from "./sec-form-d";
import type { Lead, LeadBook, LeadContact, LeadDraft } from "./types";
import { findOnWebsite, type FetchText, type HasMx } from "./website";

export type RunDeps = {
  /** Fetches SEC pages (with the SEC's required User-Agent). Null on 404 or error. */
  secText: FetchText;
  /** Fetches company websites. Null on error. */
  webText: FetchText;
  hasMx: HasMx;
  vendor: ((lead: Lead) => Promise<LeadContact[]>) | null;
  ai: ((lead: Lead) => Promise<{ draft: LeadDraft; fit: number; why: string[] } | null>) | null;
  taste: Taste;
  now: Date;
  /** Waits between SEC requests; the SEC asks for at most 10 a second. */
  pause: (ms: number) => Promise<void>;
  /** Milliseconds left before the host stops the request. Slow steps are skipped near the end. */
  timeLeft?: () => number;
};

export type RunLimits = { filings: number; days: number; websites: number; drafts: number };
export const DEFAULT_LIMITS: RunLimits = { filings: 60, days: 10, websites: 8, drafts: 8 };

/** Weekdays before `now`, newest first, as YYYYMMDD. */
export function recentDays(now: Date, count: number): string[] {
  const out: string[] = [];
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  while (out.length < count) {
    day.setUTCDate(day.getUTCDate() - 1);
    const weekday = day.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    out.push(day.toISOString().slice(0, 10).replace(/-/g, ""));
  }
  return out;
}

export async function runFinder(book: LeadBook, deps: RunDeps, limits: RunLimits = DEFAULT_LIMITS) {
  const now = deps.now.toISOString();
  const timeLeft = deps.timeLeft ?? (() => Infinity);
  const errors: string[] = [];
  const doneFilings = new Set(book.cursor.done_filings);
  const finishedDays: string[] = [];
  const processed: string[] = [];
  const partners = new Map<string, Lead>();
  const founders: Lead[] = [];
  let budget = limits.filings;

  for (const day of recentDays(deps.now, limits.days)) {
    if (budget <= 0 || timeLeft() < 30_000) break;
    if (book.cursor.done_days.includes(day)) continue;
    const index = await deps.secText(dailyIndexUrl(day)).catch(() => {
      errors.push(`SEC index for ${day} could not be read`);
      return null;
    });
    await deps.pause(150);
    if (index == null) {
      // No index: a holiday, or not published yet. Today's comes out after midnight ET, so retry later.
      if (deps.now.getTime() - Date.parse(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T00:00:00Z`) > 3 * 86_400_000) finishedDays.push(day);
      continue;
    }
    const rows = parseDailyIndex(index).filter((row) => !doneFilings.has(row.adsh));
    const take = rows.slice(0, budget);
    let read = 0;
    for (const row of take) {
      if (timeLeft() < 30_000) break;
      read++;
      const lead = await readFiling(row, deps, now).catch((error: unknown) => {
        errors.push(`${row.company}: ${error instanceof Error ? error.message : "could not read"}`);
        return undefined;
      });
      processed.push(row.adsh);
      await deps.pause(120);
      if (lead === undefined) continue;
      if (!lead) continue;
      if (lead.kind === "founder") founders.push(lead);
      else {
        const prior = partners.get(lead.key);
        partners.set(lead.key, prior ? addVehicle(prior, lead) : lead);
      }
    }
    budget -= read;
    if (read === rows.length) finishedDays.push(day);
  }

  // Partners already on the list gain a vehicle count from this batch.
  for (const [key, lead] of partners) {
    const old = book.leads.find((l) => l.key === key);
    if (old) partners.set(key, addVehicle(old, lead));
  }

  // Contacts: the free website check for new founders, then the paid vendor when set.
  const known = new Set(book.leads.map((lead) => lead.key));
  let websites = 0;
  for (const lead of founders) {
    if (known.has(lead.key) || websites >= limits.websites || timeLeft() < 20_000) continue;
    websites++;
    try {
      const site = await findOnWebsite(lead.company, lead.people, lead.website, { fetchText: deps.webText, hasMx: deps.hasMx });
      lead.website = site.website;
      lead.contacts = site.contacts;
    } catch {
      errors.push(`${lead.company}: website check failed`);
    }
  }
  const found = [...founders, ...partners.values()];
  if (deps.vendor) {
    for (const lead of found) {
      if (lead.contacts.some((c) => c.confidence === "high") || !lead.people.length || timeLeft() < 15_000) continue;
      const extra = await deps.vendor(lead).catch(() => []);
      const have = new Set(lead.contacts.map((c) => c.email));
      lead.contacts = [...extra.filter((c) => !have.has(c.email)), ...lead.contacts];
    }
  }

  // Score and draft.
  for (const lead of found) {
    const scored = scoreLead(lead, deps.taste);
    lead.score = scored.score;
    lead.reasons = scored.reasons;
    lead.to = lead.contacts[0]?.email ?? null;
    lead.draft = templateDraft(lead);
  }
  if (deps.ai && timeLeft() > 20_000) {
    // The AI reads the best new leads, all at once so the batch fits the time limit.
    const ai = deps.ai;
    const picks = [...found].filter((lead) => !known.has(lead.key) && lead.score >= 50).sort((a, b) => b.score - a.score).slice(0, limits.drafts);
    const reads = await Promise.all(picks.map((lead) => ai(lead).catch(() => null)));
    picks.forEach((lead, i) => {
      const read = reads[i];
      if (!read) return;
      lead.draft = read.draft;
      lead.score = Math.round(lead.score * 0.6 + read.fit * 0.4);
      lead.reasons = [...lead.reasons, ...read.why.map((why) => `AI: ${why}`)];
    });
  }

  const merged = mergeLeads(markFilings(book, processed, finishedDays), found);
  const run = { at: now, scanned: processed.length, added: merged.added, updated: merged.updated, errors: errors.slice(0, 10) };
  return { book: { ...merged.book, last_run: run }, run };
}

async function readFiling(row: IndexRow, deps: RunDeps, now: string): Promise<Lead | null> {
  const xml = await deps.secText(filingXmlUrl(row));
  if (!xml) throw new Error("filing not available");
  const form = parseFormD(xml);
  if (!form) return null;
  const kind = classify(form);
  return kind ? leadFromFiling(form, row, kind, now) : null;
}

/** The same syndicate filed another deal: count it and keep the newest facts. */
function addVehicle(prior: Lead, next: Lead): Lead {
  const count = Number(prior.signals.find((s) => s.label === "Vehicles filed")?.value ?? 1) + 1;
  const people = [...prior.people];
  for (const person of next.people) if (!people.some((p) => p.name === person.name)) people.push(person);
  return {
    ...prior,
    people: people.slice(0, 6),
    signals: [{ label: "Vehicles filed", value: String(count) }, ...next.signals.filter((s) => s.label !== "Vehicles filed")],
    updated_at: next.updated_at,
  };
}
