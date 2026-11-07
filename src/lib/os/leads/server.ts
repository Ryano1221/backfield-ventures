import "server-only";
import { resolveMx } from "node:dns/promises";
import { readDoc, writeDoc } from "../doc-store";
import { readSnapshot, fixturesAllowed } from "../store";
import { aiRead, aiReady } from "./ai";
import { parseLeads } from "./book";
import { DEFAULT_LIMITS, runFinder, type RunDeps } from "./run";
import { learnTaste, type RatedPitch } from "./score";
import { dailyIndexUrl } from "./sec-form-d";
import type { LeadBook } from "./types";
import { vendorConfig, vendorContacts } from "./vendor";

export const LEADS_DOC = "leads";

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

async function taste() {
  const snapshot = await readSnapshot().catch(() => null);
  const rated: RatedPitch[] = (snapshot?.pitches ?? []).flatMap((pitch) =>
    pitch.ryan_rating ? [{ company: pitch.company, sector: pitch.sector, summary: pitch.summary, title: pitch.title, rating: pitch.ryan_rating }] : [],
  );
  return learnTaste(rated);
}

function liveDeps(started: number, budgetMs: number): Omit<RunDeps, "taste"> {
  const vendor = vendorConfig();
  return {
    secText: (url) => text(url, { "user-agent": SEC_AGENT, accept: "text/plain, application/xml" }, 10_000, 2_000_000),
    webText: (url) => text(url, { "user-agent": "Mozilla/5.0 (compatible; BackfieldOS/1.0)" }, 4_000, 400_000),
    hasMx,
    vendor: vendor
      ? (lead) =>
          vendorContacts(vendor, lead.company, lead.people, lead.website, async (url, headers) => {
            const res = await fetch(url, { headers, signal: AbortSignal.timeout(8_000) });
            return res.ok ? res.json() : null;
          })
      : null,
    ai: aiReady() ? (lead) => aiRead(lead) : null,
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
    now,
    pause: async () => undefined,
  };
}

/** Runs one batch and saves it. `budgetMs` is how long the host lets the request run. */
export async function findAndSave(budgetMs: number) {
  const started = Date.now();
  const book = await readLeads();
  const base = fixturesAllowed() ? fixtureDeps() : liveDeps(started, budgetMs);
  const result = await runFinder(book, { ...base, taste: await taste() }, fixturesAllowed() ? { ...DEFAULT_LIMITS, days: 1 } : DEFAULT_LIMITS);
  await writeDoc(LEADS_DOC, JSON.stringify(result.book));
  return result;
}

export function leadsSetup(env: Record<string, string | undefined> = process.env) {
  const vendor = vendorConfig(env);
  return { ai: aiReady(env), vendor: vendor?.name ?? null };
}
