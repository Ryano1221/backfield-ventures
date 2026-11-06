// Turns the plain-text body of an outgoing email into paragraphs, so the
// preview reads like the email will in an inbox.

export type EmailPart = { kind: "text"; value: string } | { kind: "merge"; field: string; fallback: string | null } | { kind: "link"; value: string; href: string };
export type EmailLine = EmailPart[];
export type EmailParagraph = EmailLine[];

const MERGE = /\{\{\s*([A-Za-z_][\w.]*)\s*(?:\|\s*([^}]*?)\s*)?\}\}/g;
const URL = /https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"]/g;
// Gmail turns a bare domain like drinkweld.com into a link, so the preview does too.
const DOMAIN = /\b(?:[a-z0-9-]+\.)+(?:com|co|io|ai|net|org|vc|app|xyz|us|me|so|shop|health|life|club|tv|fm)\b(?:\/[^\s<>()]*[^\s<>().,;:!?'"])?/gi;

// Older snapshots stored the body with every line break squashed to a space.
// Put back the breaks an email like this always has: after the greeting,
// before each numbered pick, and before the sign-off.
export function restoreBreaks(text: string): string {
  if (text.includes("\n")) return text;
  let out = text.trim();
  out = out.replace(/^((?:hi|hey|hello|dear)?[^.!?\n]{0,40}?(?:\}\}|\b[A-Z][a-z]+),)\s+/i, "$1\n\n");
  out = out.replace(/\s+(?=\d{1,2}[.)]\s+\S)/g, "\n\n");
  out = out.replace(/\s+((?:best|thanks|thank you|cheers|regards|warmly|talk soon),?)(\s+\S{1,30})?\s*$/i, (_m, signoff: string, name?: string) => `\n\n${signoff}${name ? `\n${name.trim()}` : ""}`);
  return out;
}

function parts(line: string): EmailLine {
  const out: EmailLine = [];
  const tokens: { at: number; end: number; part: EmailPart }[] = [];
  for (const match of line.matchAll(MERGE)) {
    tokens.push({ at: match.index, end: match.index + match[0].length, part: { kind: "merge", field: match[1], fallback: match[2] ?? null } });
  }
  const free = (at: number, end: number) => !tokens.some((token) => at < token.end && end > token.at);
  for (const match of line.matchAll(URL)) {
    if (!free(match.index, match.index + match[0].length)) continue;
    tokens.push({ at: match.index, end: match.index + match[0].length, part: { kind: "link", value: match[0], href: match[0] } });
  }
  for (const match of line.matchAll(DOMAIN)) {
    const end = match.index + match[0].length;
    // Skip the tail of an email address or a word glued to the dot.
    if (!free(match.index, end) || /[@\w]/.test(line.charAt(match.index - 1))) continue;
    tokens.push({ at: match.index, end, part: { kind: "link", value: match[0], href: `https://${match[0]}` } });
  }
  tokens.sort((a, b) => a.at - b.at);
  let at = 0;
  for (const token of tokens) {
    if (token.at > at) out.push({ kind: "text", value: line.slice(at, token.at) });
    out.push(token.part);
    at = token.end;
  }
  if (at < line.length) out.push({ kind: "text", value: line.slice(at) });
  return out;
}

export function emailParagraphs(text: string): EmailParagraph[] {
  return restoreBreaks(text.replace(/\r\n?/g, "\n"))
    .split(/\n\s*\n/)
    .map((block) => block.split("\n").map((line) => line.trim()).filter(Boolean))
    .filter((block) => block.length)
    .map((block) => block.map(parts));
}

// "FIRST_NAME" or "first_name" -> "First name"
export function mergeLabel(field: string): string {
  const words = field.replace(/[._]+/g, " ").trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// "Ryan Arnold <ryan@backfieldventures.com>" -> name and address.
export function parseSender(from: string): { name: string; email: string; initial: string } {
  const match = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  const name = (match ? match[1] : from).trim() || from.trim();
  const email = (match ? match[2] : from).trim();
  return { name, email, initial: (name.charAt(0) || "?").toUpperCase() };
}
