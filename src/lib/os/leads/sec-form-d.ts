/**
 * Reads SEC Form D filings, the free public notice a US company files when it
 * raises a private round. Each filing names the company, how much it is
 * raising, how much is in, how many investors, and its officers.
 * Venture funds and angel syndicates file one too, naming the people who run them.
 *
 * We keep names, city and state. Street addresses and phone numbers in the
 * filing are never stored.
 */
import { companyKey } from "../added-companies";
import type { Lead, LeadPerson, LeadSignal } from "./types";

export type IndexRow = { company: string; cik: string; adsh: string; filed: string };

/** Form D lines in an EDGAR daily form index (form.YYYYMMDD.idx). Amendments (D/A) are skipped. */
export function parseDailyIndex(text: string): IndexRow[] {
  const rows: IndexRow[] = [];
  for (const line of text.split("\n")) {
    if (!/^D\s{2,}/.test(line)) continue;
    const match = line.match(/^D\s+(.+?)\s{2,}(\d+)\s+(\d{8})\s+edgar\/data\/\d+\/([\d-]+)\.txt/);
    if (!match) continue;
    rows.push({ company: match[1].trim(), cik: match[2], filed: match[3], adsh: match[4] });
  }
  return rows;
}

export function dailyIndexUrl(day: string): string {
  const year = day.slice(0, 4);
  const quarter = Math.ceil(Number(day.slice(4, 6)) / 3);
  return `https://www.sec.gov/Archives/edgar/daily-index/${year}/QTR${quarter}/form.${day}.idx`;
}

export function filingXmlUrl(row: IndexRow): string {
  return `https://www.sec.gov/Archives/edgar/data/${Number(row.cik)}/${row.adsh.replace(/-/g, "")}/primary_doc.xml`;
}

/** The readable version of the same filing, for the "source" link. */
export function filingPageUrl(row: IndexRow): string {
  return `https://www.sec.gov/Archives/edgar/data/${Number(row.cik)}/${row.adsh.replace(/-/g, "")}/xslFormDX01/primary_doc.xml`;
}

export type FormD = {
  name: string;
  city: string | null;
  state: string | null;
  entityType: string | null;
  /** withinFiveYears, overFiveYears or yetToBeFormed */
  age: string | null;
  industry: string | null;
  fundType: string | null;
  total: number | null;
  sold: number | null;
  investors: number | null;
  firstSale: string | null;
  amendment: boolean;
  people: { name: string; roles: string[] }[];
};

const decode = (value: string) =>
  value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, code: string) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

function tag(xml: string, name: string): string | null {
  const match = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  const value = match ? decode(match[1]) : "";
  return value || null;
}

const num = (value: string | null) => (value && /^\d+(\.\d+)?$/.test(value) ? Number(value) : null);

/** Title-cases ALL CAPS city names the way people write them. */
function tidy(value: string | null): string | null {
  if (!value) return null;
  return value === value.toUpperCase() ? value.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()) : value;
}

export function parseFormD(xml: string): FormD | null {
  const issuer = xml.match(/<primaryIssuer>([\s\S]*?)<\/primaryIssuer>/)?.[1];
  if (!issuer) return null;
  const name = tag(issuer, "entityName");
  if (!name) return null;
  const address = issuer.match(/<issuerAddress>([\s\S]*?)<\/issuerAddress>/)?.[1] ?? "";
  const age = issuer.match(/<yearOfInc>\s*<(\w+)/)?.[1] ?? null;
  const people: FormD["people"] = [];
  for (const block of xml.matchAll(/<relatedPersonInfo>([\s\S]*?)<\/relatedPersonInfo>/g)) {
    const first = tag(block[1], "firstName") ?? "";
    const last = tag(block[1], "lastName") ?? "";
    const full = tidy(`${first} ${last}`.trim());
    if (!full) continue;
    const roles = [...block[1].matchAll(/<relationship>([\s\S]*?)<\/relationship>/g)].map((m) => decode(m[1])).filter(Boolean);
    people.push({ name: full, roles });
  }
  return {
    name,
    city: tidy(tag(address, "city")),
    state: tag(address, "stateOrCountry"),
    entityType: tag(issuer, "entityType"),
    age,
    industry: tag(xml, "industryGroupType"),
    fundType: tag(xml, "investmentFundType"),
    total: num(tag(xml, "totalOfferingAmount")),
    sold: num(tag(xml, "totalAmountSold")),
    investors: num(tag(xml, "totalNumberAlreadyInvested")),
    firstSale: xml.match(/<dateOfFirstSale>\s*<value>([^<]+)<\/value>/)?.[1]?.trim() ?? null,
    amendment: tag(xml, "isAmendment") === "true",
    people,
  };
}

/** Industries an early consumer fund looks at. Form D's own labels. */
const FOUNDER_INDUSTRIES = new Set(["Retailing", "Restaurants", "Other", "Manufacturing", "Other Technology", "Business Services", "Agriculture", "Other Health Care", "Travel", "Lodging and Conventions", "Tourism and Travel Services"]);

/** Names that are funds, holding shells or real estate, not operating companies. */
const NOT_A_STARTUP = /\b(fund|funds|capital|partners|holdings?|investments?|investors|ventures|properties|realty|real estate|reit|trust|lp|l\.p\.|spv|series|portfolio|acquisition|master|feeder|offshore|onshore|mortgage|lending|credit|apartments?|oil|gas|minerals?|mining|bank)\b/i;

/** Related-person names that are companies (a fund's manager entity), not people. */
const ENTITY_NAME = /\b(llc|inc|ltd|lp|gp|group|management|advisors?|partners|capital|fund|corp|company|trust|holdings|services)\b/i;

const usd = (value: number) => (value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(value % 1_000_000 ? 1 : 0)}M` : `$${Math.round(value / 1000)}K`);

export type Classified = { kind: "founder" | "partner"; group: string };

const US = new Set("AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA PR RI SC SD TN TX UT VT VA WA WV WI WY".split(" "));

/** Which kind of lead a filing is, or null to skip it. US filers only. */
export function classify(form: FormD): Classified | null {
  if (form.amendment) return null;
  if (!form.state || !US.has(form.state)) return null;
  if (form.industry === "Pooled Investment Fund") {
    if (form.fundType !== "Venture Capital Fund") return null;
    return { kind: "partner", group: syndicateName(form.name) };
  }
  if (!form.industry || !FOUNDER_INDUSTRIES.has(form.industry)) return null;
  if (form.age === "overFiveYears") return null;
  if (NOT_A_STARTUP.test(form.name)) return null;
  // Indefinite or very large raises are not seed or Series A consumer rounds.
  if (form.total == null || form.total < 100_000 || form.total > 25_000_000) return null;
  return { kind: "founder", group: form.name };
}

/** "BL-1006 Fund I, a series of Sajid Rahman Angel Funds, LP" -> "Sajid Rahman Angel Funds, LP" */
export function syndicateName(name: string): string {
  const series = name.match(/,?\s+a series of\s+(.+)$/i);
  if (series) return series[1].trim();
  // "AVSF - Daytona 2026, LLC" -> "AVSF"
  const dash = name.match(/^(.+?)\s+-\s+/);
  if (dash) return dash[1].trim();
  return name;
}

const personTitle = (roles: string[]) => (roles.includes("Executive Officer") ? "Executive Officer" : roles[0] ?? null);

/** One lead from one filing. The caller merges partner leads from the same syndicate. */
export function leadFromFiling(form: FormD, row: IndexRow, kind: Classified, now: string): Lead {
  const people: LeadPerson[] = form.people
    .filter((person) => !ENTITY_NAME.test(person.name))
    .slice(0, 6)
    .map((person) => ({ name: person.name, title: personTitle(person.roles) }));
  const filed = `${row.filed.slice(0, 4)}-${row.filed.slice(4, 6)}-${row.filed.slice(6, 8)}`;
  const source_url = filingPageUrl(row);
  // A syndicate run on a platform ("a series of ...") files the platform's office address, not the investor's.
  const onPlatform = /\ba series of\b/i.test(form.name);
  const location = onPlatform ? null : [form.city, form.state].filter(Boolean).join(", ") || null;
  const signals: LeadSignal[] = [];
  if (kind.kind === "founder") {
    if (form.total) signals.push({ label: "Raising", value: usd(form.total), source_url });
    if (form.sold && form.total) signals.push({ label: "In so far", value: `${usd(form.sold)} (${Math.round((form.sold / form.total) * 100)}%)`, source_url });
    if (form.investors) signals.push({ label: "Investors", value: String(form.investors), source_url });
    if (form.industry) signals.push({ label: "Industry", value: form.industry, source_url });
    if (form.age === "withinFiveYears" || form.age === "yetToBeFormed") signals.push({ label: "Company age", value: "Under 5 years", source_url });
  } else {
    signals.push({ label: "Latest vehicle", value: form.name, source_url });
    if (form.total) signals.push({ label: "Vehicle size", value: usd(form.total), source_url });
    if (form.investors) signals.push({ label: "Investors in it", value: String(form.investors), source_url });
  }
  signals.push({ label: "Filed", value: filed, source_url });
  const company = kind.group;
  return {
    id: `lead_${kind.kind}_${companyKey(company).slice(0, 40) || row.cik}`,
    kind: kind.kind,
    key: `${kind.kind}:${companyKey(company)}`,
    company,
    people,
    website: null,
    location,
    signals,
    contacts: [],
    score: 0,
    reasons: [],
    draft: null,
    status: "new",
    to: null,
    source: "SEC Form D",
    source_url,
    note: "",
    found_at: now,
    updated_at: now,
  };
}
