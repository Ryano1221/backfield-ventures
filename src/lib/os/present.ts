const BLANK = new Set(["unknown", "n/a", "na", "n.a.", "none", "null", "-", "—", "–"]);

const SMALL = new Set(["a", "an", "the", "to", "for", "of", "on", "in", "and", "or", "by", "with", "from", "at", "via", "dm"]);
const MONTHS = new Set([
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
]);
const ACRONYMS = new Set(["lp", "ig", "os", "bv", "ai", "vc", "gp", "ceo", "cto", "cfo", "usa", "uk", "dm"]);

export function blankToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed || BLANK.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

export function normalizeDomain(value: string | null | undefined): string | null {
  const trimmed = blankToNull(value)?.toLowerCase();
  if (!trimmed) return null;
  const host = (trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//, "").split("/")[0] ?? "").split("?")[0]?.split("#")[0]?.split(":")[0]?.replace(/\.$/, "") ?? "";
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return null;
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(host)) return null;
  return host;
}

export function normalizeLogoUrl(value: string | null | undefined): string | null {
  const trimmed = blankToNull(value);
  if (!trimmed || trimmed.length > 2000) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!normalizeDomain(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function shortTitle(raw: string): string {
  const cleaned = stripAsides(raw);
  const reply = replyTitle(cleaned);
  if (reply) return clipWords(reply, 70);
  const clauses = splitClauses(cleaned).filter((clause) => !isStatusClause(clause));
  return clipWords(sentenceCase(clauses[0] || cleaned || raw.trim()), 70);
}

export function mutedLine(explicit: string | null | undefined, fallback = ""): string {
  const source = blankToNull(explicit) || blankToNull(fallback) || "";
  if (!source) return "";
  const text = mostlyShouty(source) ? sentenceCase(stripAsides(source)) : stripAsides(source);
  return text.trim();
}

export function summaryLine(explicit: string | null | undefined, raw: string): string {
  if (blankToNull(explicit)) return mutedLine(explicit);
  const clauses = splitClauses(stripAsides(raw)).filter((clause) => !isStatusClause(clause));
  return mutedLine(clauses.slice(1).join(". "));
}

export function readableDetail(value: string | null | undefined): string {
  const text = blankToNull(value);
  if (!text) return "";
  return mostlyShouty(text) ? sentenceCase(stripAsides(text)) : stripAsides(text);
}

function stripAsides(value: string): string {
  return value
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/"[^"]{24,}"/g, " ")
    .replace(/\bPKT_[A-Z0-9]+\b/gi, " ")
    .replace(/\b[\w.-]+\.md\b/gi, " ")
    .replace(/(?:^|\s)[\w.-]+(?:\/[\w.-]+)+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function replyTitle(text: string): string | null {
  const match = text.match(
    /\b(?:(linkedin|email|slack|sms|imessage|text)\s+)?(?:dm\s+)?reply to\s+([A-Za-z][A-Za-z'.-]*(?:\s+[A-Za-z][A-Za-z'.-]*){0,3})/i,
  );
  if (!match) return null;
  const channel = (match[1] || "").toLowerCase();
  const name = match[2]
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
  const where =
    channel === "linkedin"
      ? " on LinkedIn"
      : channel === "email"
        ? " by email"
        : channel === "slack"
          ? " in Slack"
          : channel === "sms" || channel === "text" || channel === "imessage"
            ? " by text"
            : "";
  return `Reply to ${name}${where}`;
}

function splitClauses(value: string): string[] {
  return value
    .split(/[.;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function isStatusClause(value: string): boolean {
  return /^(on hold|waiting|blocked|needs ryan|decision)$/i.test(value.trim());
}

function mostlyShouty(value: string): boolean {
  const letters = value.replace(/[^A-Za-z]/g, "");
  if (letters.length < 4) return false;
  const upper = letters.replace(/[^A-Z]/g, "").length;
  return upper / letters.length > 0.7;
}

function sentenceCase(input: string): string {
  const shouty = mostlyShouty(input);
  const words = input.split(/\s+/).filter(Boolean);
  const next = words.map((word, index) => shapeWord(word, index, shouty)).join(" ");
  return next ? next.charAt(0).toUpperCase() + next.slice(1) : "";
}

function shapeWord(word: string, index: number, shouty: boolean): string {
  const match = /^([^A-Za-z0-9]*)([A-Za-z0-9][A-Za-z0-9'’.-]*)([^A-Za-z0-9]*)$/.exec(word);
  if (!match) return word;
  const [, lead, core, tail] = match;
  let body = core;
  if (/\d/.test(core) && /[A-Za-z]/.test(core)) {
    body = core.charAt(0).toUpperCase() + core.slice(1).toLowerCase();
  } else if (/^\d+$/.test(core)) {
    body = core;
  } else if (shouty || core === core.toUpperCase()) {
    const lower = core.toLowerCase();
    if (ACRONYMS.has(lower)) body = lower.toUpperCase();
    else if (index === 0 || MONTHS.has(lower)) body = cap(lower);
    else if (SMALL.has(lower)) body = lower;
    else body = lower;
  }
  return `${lead}${body}${tail}`;
}

function cap(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function clipWords(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max + 1);
  const boundary = cut.lastIndexOf(" ");
  return (boundary > 24 ? cut.slice(0, boundary) : clean.slice(0, max)).trim();
}
