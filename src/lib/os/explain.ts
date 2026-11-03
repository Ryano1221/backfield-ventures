import { displayParty } from "./interactions";
import { blankToNull, shortTitle } from "./present";
import type { Decision } from "./types";

export type ExplainedDecision = {
  id: string;
  who: string;
  domain: string | null;
  logoUrl: string | null;
  what: string | null;
  message: string | null;
  primary: string;
  canEdit: boolean;
};

export function explainDecision(decision: Decision, id: string): ExplainedDecision {
  const who = personName(`${decision.title}. ${decision.context ?? ""}`) || subjectFrom(decision);
  const what = fieldText(decision.summary) || fieldText(decision.context);
  const message = decision.exact_message?.trim() ? decision.exact_message.trim() : null;
  const pack = /partner pack/i.test(decision.title);
  return {
    id,
    who,
    domain: decision.domain ?? null,
    logoUrl: decision.logo_url ?? null,
    what,
    message,
    primary: message ? "Send this reply" : pack ? "Approve this pack" : "Approve",
    canEdit: Boolean(message),
  };
}

function fieldText(value: string | null | undefined): string | null {
  const text = plain(value);
  return text || null;
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

function mostlyShouty(value: string): boolean {
  const letters = value.replace(/[^A-Za-z]/g, "");
  if (letters.length < 8) return false;
  return letters.replace(/[^A-Z]/g, "").length / letters.length > 0.7;
}

function sentence(value: string): string {
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
