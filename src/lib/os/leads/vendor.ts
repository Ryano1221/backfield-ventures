/**
 * The slot for a paid contact finder (Ryan's own data source). Off until three
 * settings exist, so the free sources work on their own:
 *
 *   LEADS_VENDOR_NAME        shown on each contact it finds, e.g. "Hunter"
 *   LEADS_VENDOR_URL         a lookup URL with placeholders, e.g.
 *                            https://api.example.com/find?domain={domain}&first={first}&last={last}&company={company}&key={key}
 *   LEADS_VENDOR_KEY         the API key: sent as {key} in the URL, or as a Bearer token when the URL has no {key}
 *   LEADS_VENDOR_EMAIL_PATH  where the email sits in the JSON answer, e.g. "data.email" (default "email")
 *
 * Most finder APIs (email by name and domain) fit this shape. One that does
 * not gets its own function here with the same signature.
 */
import type { LeadContact, LeadPerson } from "./types";

export type VendorConfig = { name: string; url: string; key: string; emailPath: string };

export function vendorConfig(env: Record<string, string | undefined> = process.env): VendorConfig | null {
  const name = env.LEADS_VENDOR_NAME?.trim();
  const url = env.LEADS_VENDOR_URL?.trim();
  const key = env.LEADS_VENDOR_KEY?.trim();
  if (!name || !url || !key || !/^https:\/\//.test(url)) return null;
  return { name, url, key, emailPath: env.LEADS_VENDOR_EMAIL_PATH?.trim() || "email" };
}

function pick(data: unknown, dotted: string): unknown {
  let value: unknown = data;
  for (const part of dotted.split(".")) {
    if (value == null || typeof value !== "object") return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}

export function vendorUrl(config: VendorConfig, values: { domain: string; first: string; last: string; company: string }): string {
  return config.url.replace(/\{(domain|first|last|company|key)\}/g, (_m, field: keyof typeof values | "key") => encodeURIComponent(field === "key" ? config.key : values[field]));
}

/** Asks the vendor for each named person's address at the company's domain. */
export async function vendorContacts(
  config: VendorConfig,
  company: string,
  people: LeadPerson[],
  website: string | null,
  fetchJson: (url: string, headers: Record<string, string>) => Promise<unknown>,
): Promise<LeadContact[]> {
  const domain = website ? new URL(website).hostname.replace(/^www\./, "") : "";
  const out: LeadContact[] = [];
  for (const person of people.slice(0, 2)) {
    const [first = "", ...rest] = person.name.split(/\s+/);
    const values = { domain, first, last: rest.at(-1) ?? "", company };
    const headers: Record<string, string> = config.url.includes("{key}") ? {} : { authorization: `Bearer ${config.key}` };
    const data = await fetchJson(vendorUrl(config, values), headers).catch(() => null);
    const email = pick(data, config.emailPath);
    if (typeof email === "string" && /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) {
      out.push({ email: email.toLowerCase(), name: person.name, source: `vendor:${config.name}`, confidence: "high", note: `Found by ${config.name}.` });
    }
  }
  return out;
}
