import { displayParty } from "./interactions";
import { blankToNull, shortTitle } from "./present";
import type { Decision } from "./types";

export type ExplainedDecision = {
  id: string;
  who: string;
  role: string | null;
  firm: string | null;
  domain: string | null;
  logoUrl: string | null;
  what: string;
  why: string;
  message: string | null;
  primary: string;
  canEdit: boolean;
};

export function explainDecision(decision: Decision, id: string): ExplainedDecision {
  const raw = [decision.title, decision.context, decision.summary].filter(Boolean).join(". ");
  const who = personName(raw) || subjectFrom(decision);
  const role = roleFrom(raw);
  const what = firstSentence(plain(decision.summary) || plain(decision.context) || plain(decision.title) || "This item is waiting on you.");
  const why = whyFrom(raw, Boolean(decision.exact_message));
  const message = decision.exact_message?.trim() ? decision.exact_message.trim() : null;
  const pack = /partner pack/i.test(decision.title);
  return {
    id,
    who,
    role,
    firm: null,
    domain: decision.domain ?? null,
    logoUrl: decision.logo_url ?? null,
    what,
    why,
    message,
    primary: message ? "Send this reply" : pack ? "Approve this pack" : "Approve",
    canEdit: Boolean(message),
  };
}

export function plain(value: string | null | undefined): string {
  const text = blankToNull(value);
  if (!text) return "";
  const cleaned = text
    .replace(/\([^)]*(packet|pkt_|owner|\.md|\/)[^)]*\)/gi, " ")
    .replace(/\bPKT_[A-Z0-9]+\b/gi, " ")
    .replace(/\b[\w.-]+\.md\b/gi, " ")
    .replace(/(?:^|\s)[\w.-]+(?:\/[\w.-]+)+\/?/g, " ")
    .replace(/\s*\/+\s*/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.])/g, "$1")
    .trim();
  if (!cleaned) return "";
  return mostlyShouty(cleaned) ? sentence(cleaned) : cleaned;
}

function whyFrom(raw: string, hasMessage: boolean): string {
  const text = raw.toLowerCase();
  if (hasMessage && /needs ryan|before anyone sends|exact text/.test(text)) {
    return "Nothing sends until you approve this exact message.";
  }
  if (/on hold/.test(text)) return "This is on hold until you approve it.";
  if (hasMessage) return "Approving sends the message below. Nothing sends until you do.";
  return "This is in front of you because it is waiting on your yes.";
}

function roleFrom(raw: string): string | null {
  const match = raw.match(/\(([^)]{8,80})\)/);
  if (!match) return null;
  const inside = match[1];
  if (/packet|pkt_|owner|\.md|\//i.test(inside)) return null;
  const bit = plain(inside.split(/[;.]/)[0] || "");
  return bit ? bit.charAt(0).toUpperCase() + bit.slice(1) : null;
}

function subjectFrom(decision: Decision): string {
  const asked = decision.requested_by ? displayParty(decision.requested_by) : "";
  const desk = /^(investment|intelligence|network|growth|firm os|bv executive|executive|ryan)$/i.test(asked);
  if (asked && !desk && !/fixture/i.test(asked)) return asked;
  return shortTitle(decision.title);
}

function personName(raw: string): string | null {
  const match = raw.match(/reply to\s+([^.]+)/i);
  if (!match) return null;
  const name: string[] = [];
  for (const word of match[1].split(/\s+/)) {
    if (word.includes("(") || word.includes(")")) break;
    const bare = word.replace(/[^A-Za-z'.-]/g, "");
    if (!bare || /^(on|in|by|via|the|a|an|dm)$/i.test(bare)) break;
    name.push(bare);
    if (name.length === 3) break;
  }
  return name.length ? titleCaseName(name.join(" ")) : null;
}

function titleCaseName(value: string): string {
  return value
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function firstSentence(value: string): string {
  const sentence = value.split(/(?<=[.])\s/)[0]?.trim() || value.trim();
  return sentence.length > 180 ? `${sentence.slice(0, 176).replace(/\s+\S*$/, "")}.` : sentence;
}

function mostlyShouty(value: string): boolean {
  const letters = value.replace(/[^A-Za-z]/g, "");
  if (letters.length < 8) return false;
  return letters.replace(/[^A-Z]/g, "").length / letters.length > 0.7;
}

function sentence(value: string): string {
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
