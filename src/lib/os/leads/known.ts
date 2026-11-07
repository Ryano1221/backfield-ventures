/**
 * People Ryan already knows: in Relationships (the CRM), on his Fundraising warm
 * leads, or founders whose company already pitched him. A lead that matches never
 * gets an automatic cold sequence, and its card says where they already are.
 */
import { companyKey } from "../added-companies";
import type { CrmPerson, Pitch } from "../types";
import type { Lead } from "./types";

export type Known = { where: "Relationships" | "Deals" | "Warm leads"; name: string; detail: string | null };

export type KnownIndex = { emails: Map<string, Known>; people: { name: string; firm: string; known: Known }[]; companies: Map<string, Known> };

const person = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export function buildKnownIndex(input: { crm: CrmPerson[]; pitches: Pitch[]; warm: { name: string; firm: string | null; status?: string }[] }): KnownIndex {
  const index: KnownIndex = { emails: new Map(), people: [], companies: new Map() };
  for (const p of input.crm) {
    const known: Known = { where: "Relationships", name: p.name, detail: p.stage };
    if (p.email) index.emails.set(p.email.trim().toLowerCase(), known);
    if (p.name) index.people.push({ name: person(p.name), firm: p.firm ? companyKey(p.firm) : "", known });
  }
  for (const w of input.warm) {
    if (w.name) index.people.push({ name: person(w.name), firm: w.firm ? companyKey(w.firm) : "", known: { where: "Warm leads", name: w.name, detail: w.status ?? null } });
  }
  for (const pitch of input.pitches) {
    const key = companyKey(pitch.company);
    if (key) index.companies.set(key, { where: "Deals", name: pitch.company, detail: pitch.ryan_rating ? `rated ${pitch.ryan_rating}` : pitch.status });
  }
  return index;
}

/** Where Ryan already knows this lead from, or null. */
export function knownFor(lead: Lead, index: KnownIndex): Known | null {
  for (const contact of lead.contacts) {
    const hit = index.emails.get(contact.email.toLowerCase());
    if (hit) return hit;
  }
  const firm = companyKey(lead.company);
  for (const p of lead.people) {
    const name = person(p.name);
    if (!name.includes(" ")) continue;
    // Same name at the same firm, or a contact with no firm on file. A bare common name elsewhere isn't enough.
    const hit = index.people.find((entry) => entry.name === name && (!entry.firm || entry.firm === firm));
    if (hit) return hit.known;
  }
  if (lead.kind === "founder") return index.companies.get(firm) ?? null;
  return null;
}
