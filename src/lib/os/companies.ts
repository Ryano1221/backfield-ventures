import { brands } from "@/components/handoff/brands";
import type { DeskDeal } from "./night";
import type { Snapshot } from "./types";

/**
 * Companies Backfield knows about that never came in as a pitch: brands in
 * The Handoff, Best 3 picks and candidates in the office's decisions, and
 * founders in the CRM. They show on Investments under "Tracking" so nothing
 * Ryan has seen elsewhere goes missing. Pitches always win on a name or
 * domain match.
 */

export const TRACKING = "tracking";

export function companyKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(inc|llc|co|corp|ltd|the)\b\.?/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function domainOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

type Found = { logo: string | null; name: string; summary: string | null; sector: string | null; stage: string | null; website: string | null; founder: string | null; sources: string[] };

export function trackedCompanies(snapshot: Snapshot | null, pitches: Pick<DeskDeal, "company" | "domain">[]): DeskDeal[] {
  if (!snapshot) return [];
  const taken = new Set<string>();
  const takenDomains = new Set<string>();
  for (const pitch of pitches) {
    taken.add(companyKey(pitch.company));
    if (pitch.domain) takenDomains.add(pitch.domain.replace(/^www\./, "").toLowerCase());
  }
  const found = new Map<string, Found>();
  const add = (row: Omit<Found, "sources">, source: string) => {
    const key = companyKey(row.name);
    if (!key || taken.has(key)) return;
    const domain = domainOf(row.website);
    if (domain && takenDomains.has(domain)) return;
    const current = found.get(key);
    if (!current) {
      found.set(key, { ...row, sources: [source] });
      return;
    }
    if (!current.sources.includes(source)) current.sources.push(source);
    current.summary ??= row.summary;
    current.sector ??= row.sector;
    current.stage ??= row.stage;
    current.website ??= row.website;
    current.founder ??= row.founder;
    current.logo ??= row.logo;
  };

  for (const decision of snapshot.decisions) {
    const detail = decision.detail;
    for (const pick of [...(detail?.picks ?? []), ...(detail?.candidates ?? [])]) {
      if (!pick?.name) continue;
      add({ name: pick.name, summary: pick.one_liner ?? null, sector: pick.category ?? null, stage: pick.stage ?? null, website: pick.website ?? null, founder: null, logo: null }, "Best 3");
    }
  }
  for (const brand of brands) {
    add({ name: brand.name, summary: brand.teaser || null, sector: brand.tag || null, stage: null, website: brand.siteUrl || null, founder: null, logo: null }, "The Handoff");
  }
  for (const person of snapshot.crm.people) {
    if (person.track !== "founder" || !person.firm) continue;
    add({ name: person.firm, summary: null, sector: null, stage: null, website: person.domain ? `https://${person.domain}` : null, founder: person.name, logo: person.logo_url || null }, "Relationships");
  }

  return [...found.entries()]
    .sort((a, b) => a[1].name.localeCompare(b[1].name))
    .map(([key, row]) => ({
      id: `co_${key}`,
      company: row.name,
      title: null,
      summary: row.summary,
      sector: row.sector,
      stage: row.stage,
      score: null,
      pips: null,
      waiting: null,
      received: "",
      receivedIso: "",
      founder: row.founder,
      domain: domainOf(row.website),
      website: row.website,
      deckUrl: null,
      deckNote: null,
      logoUrl: row.logo,
      status: TRACKING,
      statusLabel: "Tracking",
      source: row.sources.join(", "),
      loggedRating: null,
      generatedAt: snapshot.generated_at,
      sources: [],
    }));
}
