import "server-only";
import { resolveMx } from "node:dns/promises";
import { readDoc, writeDoc } from "../doc-store";
import { readSnapshot, fixturesAllowed } from "../store";
import { aiRead, aiReady } from "./ai";
import { researchLead } from "./research-call";
import { parseLeads } from "./book";
import { DEFAULT_LIMITS, runFinder, type RunDeps, type RunLimits } from "./run";
import { learnTaste, type RatedPitch } from "./score";
import { buildKnownIndex, type KnownIndex } from "./known";
import { parseLeads as parseWarmLeads } from "../warm-leads";
import { dailyIndexUrl } from "./sec-form-d";
import { vendorConfig, vendorContacts } from "./vendor";
import { findEmail, FindymailError, findymailKey, leadFromContact, leadFromMatch, listContacts, parseMap, searchResults, searchStatus, searchStep, startSearch, type FindyMap } from "./findymail";
import type { Lead, LeadBook, LeadContact } from "./types";

export const LEADS_DOC = "leads";

/** The daily run: a whole day of filings (about 260), more site checks and AI drafts. Time limits still apply. */
export const CRON_LIMITS: RunLimits = { filings: 1200, days: 10, websites: 40, drafts: 15, research: 8, vendor: 40 };

/** The SEC asks automated readers to name themselves and give a contact address. */
const SEC_AGENT = `Backfield Ventures OS ${process.env.OS_FROM_MAILBOX?.trim() || "ryan@backfieldventures.com"}`;

export async function readLeads(): Promise<LeadBook> {
  return parseLeads(await readDoc(LEADS_DOC).catch(() => null));
}

async function text(url: string, headers: Record<string, string>, ms: number, maxBytes: number): Promise<string | null> {
  try {
    const res = await fetch(url, { headers, redirect: "follow", signal: AbortSignal.timeout(ms) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (type && !/text|xml|html|json/.test(type)) return null;
    const body = await res.text();
    return body.slice(0, maxBytes);
  } catch {
    return null;
  }
}

async function hasMx(domain: string): Promise<boolean> {
  try {
    return (await resolveMx(domain)).length > 0;
  } catch {
    return false;
  }
}

export async function readTaste() {
  const snapshot = await readSnapshot().catch(() => null);
  const rated: RatedPitch[] = (snapshot?.pitches ?? []).flatMap((pitch) =>
    pitch.ryan_rating ? [{ company: pitch.company, sector: pitch.sector, summary: pitch.summary, title: pitch.title, rating: pitch.ryan_rating }] : [],
  );
  return learnTaste(rated);
}

function liveDeps(started: number, budgetMs: number): Omit<RunDeps, "taste"> {
  const vendor = vendorConfig();
  const findy = findymailKey();
  return {
    secText: (url) => text(url, { "user-agent": SEC_AGENT, accept: "text/plain, application/xml" }, 10_000, 2_000_000),
    webText: (url) => text(url, { "user-agent": "Mozilla/5.0 (compatible; BackfieldOS/1.0)" }, 4_000, 400_000),
    hasMx,
    vendor: findy
      ? async (lead) => {
          const domain = lead.website ? new URL(lead.website).hostname.replace(/^www\./, "") : lead.company;
          const out: LeadContact[] = [];
          for (const person of lead.people.slice(0, 2)) {
            const email = await findEmail(fetch, findy, person.name, domain);
            if (email) out.push({ email, name: person.name, source: "vendor:Findymail", confidence: "high", note: "Found by Findymail." });
          }
          return out;
        }
      : vendor
        ? (lead) =>
            vendorContacts(vendor, lead.company, lead.people, lead.website, async (url, headers) => {
              const res = await fetch(url, { headers, signal: AbortSignal.timeout(8_000) });
              return res.ok ? res.json() : null;
            })
        : null,
    imported: findy ? () => importFindymail(findy) : null,
    ai: aiReady() ? (lead) => aiRead(lead) : null,
    research: aiReady() ? (lead) => researchLead(lead, new Date()) : null,
    now: new Date(),
    pause: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    timeLeft: () => budgetMs - (Date.now() - started),
  };
}

/** Test and preview servers never reach the SEC or company sites. */
function fixtureDeps(): Omit<RunDeps, "taste"> {
  const now = new Date("2026-11-06T12:00:00Z");
  const index = `D                Example Fixture Snacks, Inc.                              2999001     20261105    edgar/data/2999001/0002999001-26-000001.txt\n`;
  const filing = `<edgarSubmission><primaryIssuer><entityName>Example Fixture Snacks, Inc.</entityName><issuerAddress><city>AUSTIN</city><stateOrCountry>TX</stateOrCountry></issuerAddress><yearOfInc><withinFiveYears>true</withinFiveYears></yearOfInc></primaryIssuer><relatedPersonsList><relatedPersonInfo><relatedPersonName><firstName>Fixture</firstName><lastName>Founder</lastName></relatedPersonName><relatedPersonRelationshipList><relationship>Executive Officer</relationship></relatedPersonRelationshipList></relatedPersonInfo></relatedPersonsList><offeringData><industryGroup><industryGroupType>Retailing</industryGroupType></industryGroup><typeOfFiling><newOrAmendment><isAmendment>false</isAmendment></newOrAmendment></typeOfFiling><offeringSalesAmounts><totalOfferingAmount>750000</totalOfferingAmount><totalAmountSold>300000</totalAmountSold></offeringSalesAmounts><investors><totalNumberAlreadyInvested>6</totalNumberAlreadyInvested></investors></offeringData></edgarSubmission>`;
  return {
    secText: async (url) => (url === dailyIndexUrl("20261105") ? index : url.includes("/2999001/") ? filing : null),
    webText: async () => null,
    hasMx: async () => false,
    vendor: null,
    ai: null,
    research: null,
    now,
    pause: async () => undefined,
  };
}

/** Runs one batch and saves it. `budgetMs` is how long the host lets the request run. */
export async function findAndSave(budgetMs: number, limits: RunLimits = DEFAULT_LIMITS) {
  const started = Date.now();
  const book = await readLeads();
  const base = fixturesAllowed() ? fixtureDeps() : liveDeps(started, budgetMs);
  const result = await runFinder(book, { ...base, taste: await readTaste() }, fixturesAllowed() ? { ...limits, days: 1 } : limits);
  await writeDoc(LEADS_DOC, JSON.stringify(result.book));
  return result;
}

export function leadsSetup(env: Record<string, string | undefined> = process.env) {
  const vendor = vendorConfig(env);
  return { ai: aiReady(env), vendor: findymailKey(env) ? "Findymail" : vendor?.name ?? null };
}

export const FINDYMAIL_DOC = "findymail";

export async function readFindyMap(): Promise<FindyMap> {
  return parseMap(await readDoc(FINDYMAIL_DOC).catch(() => null));
}

/**
 * Every contact in the Findymail lists Ryan tagged, plus results of his saved
 * searches (started weekly, collected on a later run), as leads of the tagged kind.
 */
export async function importFindymail(key: string): Promise<Lead[]> {
  const map = await readFindyMap();
  const now = new Date();
  const out: Lead[] = [];
  for (const [id, list] of Object.entries(map.lists)) {
    const contacts = await listContacts(fetch, key, Number(id));
    for (const contact of contacts) out.push(leadFromContact(contact, list.kind, list.name, now.toISOString()));
  }
  let changed = false;
  for (const search of map.searches) {
    const step = searchStep(search, now);
    try {
      if (step === "start") {
        search.hash = await startSearch(fetch, key, search);
        search.started_at = now.toISOString();
        search.note = "Searching. Results come in on the next daily run.";
        changed = true;
      } else if (step === "check" && search.hash) {
        const status = await searchStatus(fetch, key, search.hash);
        if (status === "success") {
          const matches = await searchResults(fetch, key, search.hash, search.limit);
          for (const match of matches) out.push(leadFromMatch(match, search, now.toISOString()));
          Object.assign(search, { hash: null, last_run: now.toISOString(), last_count: matches.length, note: `${matches.length} found. Runs again in a week.` });
          changed = true;
        } else if (status === "failed" || status === "not_found") {
          Object.assign(search, { hash: null, last_run: now.toISOString(), last_count: 0, note: "Findymail couldn't finish this search. It tries again next week." });
          changed = true;
        }
      }
    } catch (error) {
      search.note = error instanceof Error ? error.message : `Findymail search failed: ${String(error)}`;
      changed = true;
      if (error instanceof FindymailError && error.stop) break;
    }
  }
  if (changed) {
    // Save onto the latest map, so a search added or removed meanwhile isn't lost.
    const latest = await readFindyMap();
    latest.searches = latest.searches.map((s) => map.searches.find((ran) => ran.id === s.id) ?? s);
    await writeDoc(FINDYMAIL_DOC, JSON.stringify(latest));
  }
  return out;
}

/** Everyone Ryan already knows, from the snapshot's CRM and pitches plus his Fundraising warm leads. */
export async function readKnownIndex(snapshot?: import("../types").Snapshot | null): Promise<KnownIndex> {
  const snap = snapshot === undefined ? await readSnapshot().catch(() => null) : snapshot;
  const warm = parseWarmLeads(await readDoc("warm-leads").catch(() => null));
  return buildKnownIndex({ crm: snap?.crm.people ?? [], pitches: snap?.pitches ?? [], warm: warm.leads.map((w) => ({ name: w.name, firm: w.firm, status: w.status })) });
}
