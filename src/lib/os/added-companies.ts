/**
 * Companies Ryan logs by hand, mostly pitches that came in on LinkedIn, by
 * text or in person, which the office never saw. Private store only.
 */

export const ADDED_SOURCES = ["LinkedIn", "Email", "Text", "Intro", "Event", "Other"] as const;
export type AddedSource = (typeof ADDED_SOURCES)[number];

export type AddedCompany = { id: string; name: string; website: string | null; founder: string | null; source: AddedSource; note: string; added_at: string };
export type AddedBook = { version: 1; companies: AddedCompany[] };
export const EMPTY_ADDED: AddedBook = { version: 1, companies: [] };

export type AddedResult = { ok: true; book: AddedBook; id: string } | { ok: false; error: string };

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

export function applyAddedOp(book: AddedBook, raw: unknown, now = new Date().toISOString(), newId = () => `add_${Math.random().toString(36).slice(2, 10)}`): AddedResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Nothing to change." };
  const op = raw as Record<string, unknown>;
  if (op.op === "remove") {
    const byName = text(op.name, 160).toLowerCase();
    const id = text(op.id, 80) || book.companies.find((row) => byName && row.name.toLowerCase() === byName)?.id || "";
    if (!book.companies.some((row) => row.id === id)) return { ok: false, error: "That company is not on the list." };
    return { ok: true, id, book: { version: 1, companies: book.companies.filter((row) => row.id !== id) } };
  }
  if (op.op !== "add") return { ok: false, error: "Unknown change." };
  const name = text(op.name, 160);
  if (!name) return { ok: false, error: "Add the company name." };
  if (book.companies.length >= 2000) return { ok: false, error: "The list is full." };
  if (book.companies.some((row) => row.name.toLowerCase() === name.toLowerCase())) return { ok: false, error: `${name} is already on the list.` };
  let website: string | null = text(op.website, 300) || null;
  if (website) {
    try {
      const url = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`);
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("bad");
      website = url.toString();
    } catch {
      return { ok: false, error: "That website does not look right." };
    }
  }
  const source = ADDED_SOURCES.includes(op.source as AddedSource) ? (op.source as AddedSource) : "Other";
  const id = newId();
  const row: AddedCompany = { id, name, website, founder: text(op.founder, 120) || null, source, note: text(op.note, 2000), added_at: now };
  return { ok: true, id, book: { version: 1, companies: [row, ...book.companies] } };
}

export function parseAdded(raw: string | null): AddedBook {
  if (!raw) return { version: 1, companies: [] };
  try {
    const data = JSON.parse(raw) as { companies?: unknown };
    return { version: 1, companies: Array.isArray(data.companies) ? (data.companies as AddedCompany[]).filter((row) => row && typeof row.name === "string" && typeof row.id === "string") : [] };
  } catch {
    return { version: 1, companies: [] };
  }
}

/** The key the company list uses to merge names, and the id a tracked company's page lives at (co_<key>). */
export function companyKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(inc|llc|co|corp|ltd|the)\b\.?/g, "")
    .replace(/[^a-z0-9]/g, "");
}
