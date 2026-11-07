/**
 * Free contact finding: find the company's own website, check it really is
 * theirs, and read the email addresses it publishes. Nothing is scraped from
 * LinkedIn or other people's sites.
 */
import type { LeadContact, LeadPerson } from "./types";

export type FetchText = (url: string) => Promise<string | null>;
export type HasMx = (domain: string) => Promise<boolean>;

const SUFFIX = /\b(inc|incorporated|llc|l\.l\.c|co|corp|corporation|company|ltd|limited|pbc|the|holdings?|group)\b\.?/gi;

/** The words that make up a company's name, without Inc., LLC and the like. */
export function coreWords(company: string): string[] {
  return company
    .replace(SUFFIX, " ")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Domains a small brand usually uses: name.com, getname.com, tryname.com, name.co. */
export function guessDomains(company: string): string[] {
  const words = coreWords(company);
  if (!words.length) return [];
  const joined = words.join("");
  if (joined.length < 3 || joined.length > 40) return [];
  const out = [`${joined}.com`, `get${joined}.com`, `try${joined}.com`, `${joined}.co`];
  if (words.length > 1 && words.includes("and")) out.splice(1, 0, `${words.filter((w) => w !== "and").join("")}.com`);
  return [...new Set(out)];
}

/** The page names the company, so the domain guess landed on the right business. */
export function pageMatches(html: string, company: string): boolean {
  const words = coreWords(company).filter((word) => word.length > 2 && word !== "and");
  if (!words.length) return false;
  const head = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "") + " " + (html.match(/property=["']og:site_name["'][^>]*content=["']([^"']+)/i)?.[1] ?? "");
  const text = `${head} ${html.slice(0, 200_000)}`.toLowerCase().replace(/[^a-z0-9]/g, "");
  return words.every((word) => text.includes(word));
}

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const OBFUSCATED = /([a-z0-9._%+-]+)\s*(?:\[at\]|\(at\)|\{at\}|\sat\s)\s*([a-z0-9-]+)\s*(?:\[dot\]|\(dot\)|\{dot\}|\sdot\s|\.)\s*([a-z]{2,})/gi;
const NOT_EMAIL = /\.(png|jpe?g|gif|webp|svg|css|js)$/i;

/** Addresses on the company's own domain, as they appear in the page. */
export function extractEmails(html: string, domain: string): string[] {
  const text = html.replace(/&#64;|&commat;/g, "@").replace(/%40/g, "@");
  const found = new Set<string>();
  for (const match of text.matchAll(EMAIL)) found.add(match[0].toLowerCase());
  for (const match of text.matchAll(OBFUSCATED)) found.add(`${match[1]}@${match[2]}.${match[3]}`.toLowerCase());
  const bare = domain.replace(/^www\./, "").toLowerCase();
  return [...found].filter((email) => !NOT_EMAIL.test(email) && (email.endsWith(`@${bare}`) || email.endsWith(`.${bare}`)));
}

const GENERIC_GOOD = /^(founders?|hello|hi|hey|team|contact|info|partners|invest|investors|ir)@/;
const GENERIC_BAD = /^(no-?reply|support|help|care|orders?|returns?|shipping|privacy|legal|press|media|jobs|careers|billing|accounts?|abuse|admin|webmaster)@/;

/** Ranks published addresses: a named person first, then a team inbox, then the rest. */
export function rankEmails(emails: string[], people: LeadPerson[]): LeadContact[] {
  const out: LeadContact[] = [];
  for (const email of emails) {
    const local = email.split("@")[0];
    const person = people.find((p) => {
      const [first = "", ...rest] = p.name.toLowerCase().split(/\s+/);
      const last = rest.at(-1) ?? "";
      return local === first || local === `${first}.${last}` || local === `${first}${last}` || local === `${first[0]}${last}` || (last.length > 2 && local === last);
    });
    if (person) out.push({ email, name: person.name, source: "website", confidence: "high", note: "Published on the company's site." });
    else if (GENERIC_BAD.test(email)) continue;
    else if (GENERIC_GOOD.test(email)) out.push({ email, name: null, source: "website", confidence: "medium", note: "Team inbox on the company's site." });
    else out.push({ email, name: null, source: "website", confidence: "low", note: "Address on the company's site." });
  }
  const order = { high: 0, medium: 1, low: 2 };
  return out.sort((a, b) => order[a.confidence] - order[b.confidence]);
}

/** first@domain for the first named person. A guess, never verified, shown as one. */
export function guessAddress(people: LeadPerson[], domain: string): LeadContact | null {
  const person = people[0];
  const first = person?.name.toLowerCase().split(/\s+/)[0]?.replace(/[^a-z]/g, "");
  if (!person || !first) return null;
  return { email: `${first}@${domain}`, name: person.name, source: "guess", confidence: "low", note: "Guessed from the usual pattern. Not verified: check it or use a paid finder before sending." };
}

const PAGES = ["", "/contact", "/pages/contact", "/about", "/pages/about", "/pages/about-us", "/about-us"];

export type SiteKind = "store" | "b2b" | null;

/**
 * What the homepage says the company is. A consumer fund wants brands that sell
 * to people; business software is a different business. Null when it's unclear.
 */
export function siteKind(html: string): SiteKind {
  const text = html.slice(0, 400_000).toLowerCase();
  const store = [/cdn\.shopify\.com|myshopify\.com|shopify\.theme/, /add to (?:cart|bag)/, /shop (?:now|all)/, /free shipping/, /subscribe (?:&|and) save/, /\bcheckout\b/].filter((r) => r.test(text)).length;
  const b2b = [/(?:book|request|schedule|get) a demo/, /\bsoc ?2\b/, /\benterprise\b/, /per (?:seat|user)\b/, /\bsaas\b/, /\bapi (?:docs|reference)\b/, /talk to sales|contact sales/].filter((r) => r.test(text)).length;
  if (store >= 2 && store > b2b) return "store";
  if (b2b >= 2 && b2b > store) return "b2b";
  return null;
}

export type Thesis = { sports: boolean; famousFounder: "athlete" | "creator" | null };

/** Visible words only: no scripts, styles or tags. */
function visibleText(html: string): string {
  return html
    .slice(0, 400_000)
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

const SPORTS = [/\bathletes?\b/, /\bsports?\b/, /\b(?:training|workout|gym|fitness)\b/, /\b(?:performance|recovery|hydration|electrolytes?)\b/, /\b(?:golf|tennis|pickleball|basketball|football|soccer|baseball|hockey|running|cycling)\b/, /\b(?:game ?day|locker room|on the field|on the court)\b/];
const ATHLETE = /\b(?:nba|nfl|mlb|nhl|wnba|mls|ufc|pga|lpga|olympi(?:an|c)|all-star|pro bowl|super bowl|world champion|(?:pro|professional|former pro) (?:athlete|player|golfer|quarterback)|quarterback|point guard|wide receiver|pitcher)\b/;
const CREATOR = /\b(?:creator|influencer|youtuber|tiktok(?:er)?|instagram|podcaster|celebrity|actress|actor|musician|singer|rapper|grammy|emmy|chef and tv|tv host|reality star)\b/;
const FOUNDED = /\b(?:founded|co-?founded|created|started|launched|built) by\b|\bour (?:co-?)?founders?\b|\bmeet the founders?\b/g;

/**
 * Does the homepage fit Backfield's thesis: a sports or fitness brand, or one
 * founded by an athlete, creator or celebrity? Sports needs two different
 * cues, so one passing mention doesn't count; the founder check only reads
 * words right after "founded by" or "our founder".
 */
export function siteThesis(html: string): Thesis {
  const text = visibleText(html);
  const sports = SPORTS.filter((rule) => rule.test(text)).length >= 2;
  let famousFounder: Thesis["famousFounder"] = null;
  for (const match of text.matchAll(FOUNDED)) {
    const near = text.slice(match.index ?? 0, (match.index ?? 0) + 160);
    if (ATHLETE.test(near)) {
      famousFounder = "athlete";
      break;
    }
    if (!famousFounder && CREATOR.test(near)) famousFounder = "creator";
  }
  return { sports, famousFounder };
}

/** The "Thesis" fact shown on a lead, or null when the site doesn't fit. */
export function thesisLabel(thesis: Thesis | undefined): string | null {
  if (!thesis) return null;
  const parts = [thesis.famousFounder === "athlete" ? "Founded by an athlete" : thesis.famousFounder === "creator" ? "Founded by a creator or celebrity" : null, thesis.sports ? "Sports / fitness brand" : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export type WebsiteResult = { website: string | null; contacts: LeadContact[]; kind?: SiteKind; thesis?: Thesis };

/** Finds the site and its published addresses. `known` is a website we already have. */
export async function findOnWebsite(company: string, people: LeadPerson[], known: string | null, deps: { fetchText: FetchText; hasMx: HasMx }): Promise<WebsiteResult> {
  let domain: string | null = null;
  let home: string | null = null;
  if (known) {
    try {
      domain = new URL(known).hostname.replace(/^www\./, "");
      home = await deps.fetchText(`https://${domain}`);
    } catch {
      domain = null;
    }
  } else {
    for (const guess of guessDomains(company)) {
      const html = await deps.fetchText(`https://${guess}`);
      if (html && pageMatches(html, company)) {
        domain = guess;
        home = html;
        break;
      }
    }
  }
  if (!domain) return { website: null, contacts: [] };
  const emails = new Set(home ? extractEmails(home, domain) : []);
  for (const page of PAGES.slice(1)) {
    if (emails.size >= 4) break;
    const html = await deps.fetchText(`https://${domain}${page}`);
    if (html) for (const email of extractEmails(html, domain)) emails.add(email);
  }
  const contacts = rankEmails([...emails], people);
  if (!contacts.some((contact) => contact.confidence === "high") && (await deps.hasMx(domain))) {
    const guess = guessAddress(people, domain);
    if (guess && !contacts.some((contact) => contact.email === guess.email)) contacts.push(guess);
  }
  return { website: `https://${domain}`, contacts, kind: home ? siteKind(home) : null, thesis: home ? siteThesis(home) : undefined };
}
