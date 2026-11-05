import type { BotDesk } from "./bot-desk";
import { plainBotText, stageLabel } from "./night";
import { pitchTarget } from "./pitch-rate";
import { summarizeRaise, type RaiseLedger, type RaiseSummary } from "./raise-model";
import type { Snapshot } from "./types";

/**
 * The top of Today: the four things a one-person fund checks first.
 * Raise, deal flow, the day's to-dos, and what the bots did.
 */

export type ChaseRow = { id: string; name: string; firm: string | null; stage: string | null; why: string; overdue: boolean };
export type DueRow = { id: string; name: string; what: string; when: string; overdue: boolean };
export type DealRow = { id: string; company: string; line: string; age: string };
export type BotLine = { name: string; text: string; tone: "done" | "stuck" | "waiting" };

export type FunnelStep = { key: string; label: string; count: number };

export type CommandModel = {
  raise: RaiseSummary;
  funnel: FunnelStep[];
  chase: ChaseRow[];
  due: DueRow[];
  deals: { fresh: number; reviewing: number; unrated: number; advanced: number; newest: DealRow[] };
  bots: { done: number; working: number; stuck: number; waiting: number; lines: BotLine[] };
};

const DAY = 86_400_000;

export function buildCommand(snapshot: Snapshot | null, ledger: RaiseLedger, desk: BotDesk | null, now = Date.now()): CommandModel {
  const raise = summarizeRaise(ledger, now);
  if (!snapshot) {
    return { raise, funnel: [], chase: [], due: [], deals: { fresh: 0, reviewing: 0, unrated: 0, advanced: 0, newest: [] }, bots: { done: 0, working: 0, stuck: 0, waiting: 0, lines: [] } };
  }
  const today = ctDay(now);
  const people = snapshot.crm.people;
  const inLedger = new Set(ledger.commitments.filter((row) => row.status !== "soft").flatMap((row) => [row.person_id, row.name.trim().toLowerCase()].filter(Boolean) as string[]));

  const chase = people
    .filter((person) => person.lp && !inLedger.has(person.id) && !inLedger.has(person.name.trim().toLowerCase()))
    .filter((person) => !/^(dnc|passed|lost|closed)/i.test(person.stage || ""))
    .map((person) => {
      const due = person.next_step_due ? person.next_step_due.slice(0, 10) : null;
      const overdue = Boolean(due && due <= today);
      const last = person.last_touch_at ? Date.parse(person.last_touch_at) : NaN;
      const quiet = Number.isFinite(last) ? Math.floor((now - last) / DAY) : null;
      const why = overdue && person.next_step ? `Due: ${shortStep(person.next_step)}` : quiet != null ? (quiet === 0 ? "Touched today" : `Quiet ${quiet} ${quiet === 1 ? "day" : "days"}`) : "Never touched";
      return { row: { id: person.id, name: person.name, firm: person.firm, stage: stageLabel(person.stage) || null, why, overdue }, score: (overdue ? 10_000 : 0) + (quiet ?? 5_000) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((item) => item.row);

  const due = people
    .filter((person) => person.next_step && person.next_step_due && person.next_step_due.slice(0, 10) <= today)
    .sort((a, b) => (a.next_step_due || "").localeCompare(b.next_step_due || ""))
    .slice(0, 6)
    .map((person) => {
      const day = (person.next_step_due || "").slice(0, 10);
      return { id: person.id, name: person.name, what: shortStep(person.next_step || ""), when: day === today ? "Today" : `Since ${shortDay(day)}`, overdue: day < today };
    });

  const pitches = snapshot.pitches;
  const weekAgo = now - 7 * DAY;
  const newest = [...pitches]
    .filter((pitch) => pitch.status === "new" || pitch.status === "reviewing")
    .sort((a, b) => Date.parse(b.received) - Date.parse(a.received))
    .slice(0, 3)
    .map((pitch) => ({
      id: pitchTarget(pitch),
      company: pitch.company,
      line: [pitch.sector, pitch.stage, pitch.founder].filter(Boolean).join(" · ") || (pitch.summary ? plainBotText(pitch.summary).slice(0, 80) : ""),
      age: ago(Date.parse(pitch.received), now),
    }));

  const bots = desk?.bots ?? [];
  const lines: BotLine[] = [];
  for (const bot of bots.filter((row) => row.status === "Failed" || row.status === "Degraded").slice(0, 2)) {
    lines.push({ name: bot.name, text: bot.result ? clip(plainBotText(bot.result)) : "Hit a problem on the last run.", tone: "stuck" });
  }
  for (const bot of bots.filter((row) => row.doneToday && row.result).slice(0, 4 - lines.length)) {
    lines.push({ name: bot.name, text: clip(plainBotText(bot.result || "")), tone: "done" });
  }
  const routinesFailed = desk?.summary.failedRoutines ?? 0;

  return {
    raise,
    funnel: lpFunnel(snapshot, ledger),
    chase,
    due,
    deals: {
      fresh: pitches.filter((pitch) => Date.parse(pitch.received) >= weekAgo).length,
      reviewing: pitches.filter((pitch) => pitch.status === "reviewing").length,
      unrated: pitches.filter((pitch) => (pitch.status === "new" || pitch.status === "reviewing") && !pitch.ryan_rating).length,
      advanced: pitches.filter((pitch) => pitch.status === "advanced").length,
      newest,
    },
    bots: {
      done: desk?.summary.doneToday ?? 0,
      working: desk?.summary.working ?? 0,
      stuck: (desk?.summary.failed ?? 0) + (desk?.summary.degraded ?? 0) + routinesFailed,
      waiting: desk?.summary.needs ?? 0,
      lines,
    },
  };
}

// Cumulative LP funnel: everyone at or past each step. Committed also
// counts hard commitments from the Fund I ledger that the CRM has not caught up on.
const FUNNEL: { key: string; label: string; stages: string[] }[] = [
  { key: "reached", label: "Reached", stages: ["contacted", "nudged"] },
  { key: "replied", label: "Replied", stages: ["replied", "call_asked", "im_in"] },
  { key: "call", label: "Call", stages: ["call_booked", "call_held"] },
  { key: "materials", label: "Deck or data room", stages: ["one_pager_sent", "data_room"] },
  { key: "soft", label: "Soft circle", stages: ["soft_circle", "docs"] },
  { key: "committed", label: "Committed", stages: ["committed", "closed"] },
];

export function lpFunnel(snapshot: Snapshot, ledger: RaiseLedger): FunnelStep[] {
  const rank = new Map<string, number>();
  FUNNEL.forEach((step, index) => step.stages.forEach((stage) => rank.set(stage, index)));
  const lps = snapshot.crm.people.filter((person) => person.lp);
  const reached = lps.map((person) => {
    const stage = (person.stage || "").toLowerCase();
    let at = rank.get(stage) ?? -1;
    if (person.im_in) at = Math.max(at, 1);
    return at;
  });
  const hardInLedger = ledger.commitments.filter((row) => row.status !== "soft").length;
  const softInLedger = ledger.commitments.filter((row) => row.status === "soft").length;
  const steps = FUNNEL.map((step, index) => {
    let count = reached.filter((at) => at >= index).length;
    if (step.key === "committed") count = Math.max(count, hardInLedger);
    if (step.key === "soft") count = Math.max(count, hardInLedger + softInLedger);
    return { key: step.key, label: step.label, count };
  });
  // Someone who committed also got past every earlier step.
  for (let i = steps.length - 2; i >= 0; i--) steps[i]!.count = Math.max(steps[i]!.count, steps[i + 1]!.count);
  return steps;
}

/**
 * A bot's next step reads like a log line. Keep the action: the first
 * sentence, without clock times or parentheticals, cut at a word.
 */
export function shortStep(value: string): string {
  const first = value.split(/(?<=[.;])\s+/)[0] || value;
  const clean = first
    .replace(/\([^)]*\)/g, "")
    .replace(/\b\d{1,2}:\d{2}\s*(?:am|pm)?\s*(?:CT)?\b/gi, "")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/[.;\s]+$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return clip(clean, 80);
}

function ctDay(now: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now));
}

function shortDay(day: string): string {
  const at = Date.parse(`${day}T12:00:00-06:00`);
  return Number.isFinite(at) ? new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric" }).format(new Date(at)) : day;
}

function ago(at: number, now: number): string {
  if (!Number.isFinite(at)) return "";
  const days = Math.floor((now - at) / DAY);
  if (days <= 0) return "today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

function clip(value: string, max = 110): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > 60 ? cut.slice(0, space) : cut).replace(/[\s.,;:-]+$/, "")}…`;
}
