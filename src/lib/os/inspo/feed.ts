/** A small, forgiving RSS 2.0 / Atom reader: titles, links, dates and a text snippet. */
export type FeedItem = { title: string; link: string; at: string | null; text: string };

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", mdash: "-", ndash: "-", hellip: "..." };

export function decode(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (whole, name: string) => ENTITIES[name.toLowerCase()] ?? whole);
}

/** Plain text from feed HTML: tags out, entities decoded, whitespace squeezed. */
export function plainText(html: string): string {
  return decode(decode(html).replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<br\s*\/?>|<\/p>/gi, "\n").replace(/<[^>]+>/g, " "))
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

function tag(block: string, names: string[]): string {
  for (const name of names) {
    const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
    if (match) return match[1];
  }
  return "";
}

function atomLink(block: string): string {
  const alternate = block.match(/<link\b[^>]*rel=["']alternate["'][^>]*>/i)?.[0] ?? block.match(/<link\b(?![^>]*rel=["'](?:self|enclosure|replies)["'])[^>]*>/i)?.[0];
  return alternate?.match(/href=["']([^"']+)["']/i)?.[1] ?? "";
}

function isoDate(raw: string): string | null {
  const text = decode(raw).trim();
  if (!text) return null;
  const ms = Date.parse(text);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

export function parseFeed(xml: string): FeedItem[] {
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? [];
  return blocks
    .map((block) => {
      const atom = /^<entry/i.test(block);
      const link = atom ? atomLink(block) : decode(tag(block, ["link"])).trim() || decode(tag(block, ["guid"])).trim();
      const body = tag(block, ["content:encoded", "description", "summary", "content", "itunes:summary"]);
      return {
        title: plainText(tag(block, ["title"])),
        link: decode(link).trim(),
        at: isoDate(tag(block, ["pubDate", "published", "updated", "dc:date"])),
        text: plainText(body).slice(0, 1200),
      };
    })
    .filter((item) => item.title || item.text);
}

/** The feed's own name, for checking a URL Ryan adds. */
export function feedTitle(xml: string): string {
  const head = xml.split(/<item\b|<entry\b/i)[0];
  return plainText(tag(head, ["title"]));
}
