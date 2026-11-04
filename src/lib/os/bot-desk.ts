import { decisionKey } from "./decision-id";
import { formatCt, sentence } from "./night";
import { botPaused } from "./overlays";
import { blankToNull, shortTitle } from "./present";
import type { BotRecord, Decision, Interaction, OsAction, RoutineRecord, Snapshot } from "./types";

export const STALE_AFTER_MS = 48 * 60 * 60 * 1000;

const ROOMS: Record<string, string> = {
  executive: "Executive",
  network: "Network",
  investment: "Investment",
  intelligence: "Intelligence",
  growth: "Growth",
  firm_os: "Firm OS",
};

const KIND: Record<Interaction["kind"], string> = {
  packet: "Packet",
  amendment: "Amendment",
  result: "Result",
  message: "Message",
};

export type BotStatus = "Working" | "Needs Ryan" | "Idle" | "Paused";

export type DeskFilter = "needs" | "working" | "idle" | "paused" | "done" | "stale";

export type SummaryCounts = {
  needs: number;
  working: number;
  idle: number;
  paused: number;
  doneToday: number;
  stale: number;
  failedRoutines: number;
};

export type RoutineView = {
  name: string | null;
  status: string | null;
  last: string | null;
  next: string | null;
  note: string | null;
  failed: boolean;
  overdue: boolean;
};

export type HandoffView = {
  at: string;
  relative: string | null;
  ct: string;
  direction: "To" | "From";
  who: string;
  title: string;
  kind: string;
  status: string | null;
};

export type FeedItem = {
  key: string;
  name: string;
  sentence: string;
  relative: string | null;
  ct: string;
  at: number;
};

export type DecisionLink = {
  id: string;
  label: string;
};

export type DeskBot = {
  id: string;
  name: string;
  team: string;
  role: string | null;
  director: string | null;
  status: BotStatus;
  statusLabel: string;
  registry: string | null;
  scope: string | null;
  source: string | null;
  result: string | null;
  usage: number | null;
  lastIso: string | null;
  relative: string | null;
  ct: string | null;
  doneToday: boolean;
  stale: boolean;
  isLead: boolean;
  aliases: string[];
  decision: DecisionLink | null;
  routines: RoutineView[];
  handoffs: HandoffView[];
};

export type FirmUsage = {
  weekly: string | null;
  onDemand: string | null;
  reset: string | null;
};

export type BotDesk = {
  bots: DeskBot[];
  summary: SummaryCounts;
  feed: FeedItem[];
  routines: RoutineView[];
  usage: FirmUsage | null;
};

export function relativeTime(iso: string | null | undefined, now: number): string | null {
  if (!iso) return null;
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return null;
  const delta = now - at;
  if (delta < 0) return delta > -60_000 ? "just now" : null;
  const min = Math.floor(delta / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 14) return `${day}d ago`;
  const week = Math.floor(day / 7);
  if (week < 8) return `${week}w ago`;
  const month = Math.floor(day / 30);
  return `${month || 1}mo ago`;
}

export function ctDay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  const year = get("year");
  const month = get("month");
  const day = get("day");
  if (!year || !month || !day) return null;
  return `${year}-${month}-${day}`;
}

export function isDoneToday(iso: string | null | undefined, now: number): boolean {
  const day = ctDay(iso);
  const today = ctDay(new Date(now).toISOString());
  return Boolean(day && today && day === today);
}

export function isStaleBot(input: { status: BotStatus; lastIso: string | null }, now: number): boolean {
  if (input.status === "Paused") return false;
  if (!input.lastIso) return false;
  const at = Date.parse(input.lastIso);
  if (!Number.isFinite(at)) return false;
  return now - at > STALE_AFTER_MS;
}

export function isFailedRoutine(routine: Pick<RoutineRecord, "status">): boolean {
  return /fail/i.test(routine.status || "");
}

export function isOverdueRoutine(routine: Pick<RoutineRecord, "status" | "next">, now: number): boolean {
  if (/overdue/i.test(routine.status || "")) return true;
  const next = blankToNull(routine.next);
  if (!next) return false;
  const at = Date.parse(next);
  return Number.isFinite(at) && at < now;
}

export function summaryCounts(bots: Pick<DeskBot, "status" | "doneToday" | "stale">[], routines: Pick<RoutineView, "failed">[]): SummaryCounts {
  const counts: SummaryCounts = { needs: 0, working: 0, idle: 0, paused: 0, doneToday: 0, stale: 0, failedRoutines: 0 };
  for (const bot of bots) {
    if (bot.status === "Needs Ryan") counts.needs += 1;
    else if (bot.status === "Working") counts.working += 1;
    else if (bot.status === "Paused") counts.paused += 1;
    else counts.idle += 1;
    if (bot.doneToday) counts.doneToday += 1;
    if (bot.stale) counts.stale += 1;
  }
  counts.failedRoutines = routines.filter((routine) => routine.failed).length;
  return counts;
}

export function botMatches(bot: DeskBot, filter: DeskFilter | null, query: string): boolean {
  if (filter === "needs" && bot.status !== "Needs Ryan") return false;
  if (filter === "working" && bot.status !== "Working") return false;
  if (filter === "idle" && bot.status !== "Idle") return false;
  if (filter === "paused" && bot.status !== "Paused") return false;
  if (filter === "done" && !bot.doneToday) return false;
  if (filter === "stale" && !bot.stale) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [bot.name, bot.team, bot.result || ""].join("\n").toLowerCase().includes(q);
}

export function groupTeams(bots: DeskBot[]): { name: string; bots: DeskBot[] }[] {
  const groups = new Map<string, DeskBot[]>();
  for (const name of Object.values(ROOMS)) groups.set(name, []);
  for (const bot of bots) {
    const name = groups.has(bot.team) ? bot.team : "Firm OS";
    groups.get(name)!.push(bot);
  }
  const out: { name: string; bots: DeskBot[] }[] = [];
  for (const name of [...Object.values(ROOMS)]) {
    const list = (groups.get(name) ?? []).slice().sort(byAttention);
    if (list.length) out.push({ name, bots: list });
  }
  return out;
}

export function buildBotDesk(snapshot: Snapshot | null, actions: OsAction[] = [], now = Date.now()): BotDesk {
  if (!snapshot) return { bots: [], summary: emptySummary(), feed: [], routines: [], usage: null };
  const routines = (snapshot.bots.routines ?? []).flatMap((routine) => {
    const view = presentRoutine(routine, now);
    return view.name ? [view] : [];
  });
  const leads = leadNames(snapshot.bots.bots);
  const drafted = snapshot.bots.bots.map((bot, index) => presentBot(bot, index, actions, leads, now));
  const decisions = snapshot.decisions;
  for (const bot of drafted) bot.decision = matchDecision(bot, decisions);
  for (const bot of drafted) bot.routines = routines.filter((routine) => routineMatches(routine, bot));
  const handoffs = snapshot.interactions
    .map((item) => ({ item, at: Date.parse(item.timestamp) }))
    .filter((row) => Number.isFinite(row.at))
    .sort((a, b) => b.at - a.at);
  for (const bot of drafted) bot.handoffs = handoffsFor(bot, handoffs, drafted, now);
  const feed = todayFeed(drafted, snapshot.activity, now);
  return {
    bots: drafted,
    summary: summaryCounts(drafted, routines),
    feed,
    routines,
    usage: firmUsage(snapshot),
  };
}

function emptySummary(): SummaryCounts {
  return { needs: 0, working: 0, idle: 0, paused: 0, doneToday: 0, stale: 0, failedRoutines: 0 };
}

function presentBot(bot: BotRecord, index: number, actions: OsAction[], leads: Map<string, string>, now: number): DeskBot {
  const paused = botPaused(bot.name, actions);
  const status = drawnStatus(bot.status, paused);
  const room = roomOf(bot);
  const team = ROOMS[room] || "Firm OS";
  const id = slugOf(bot, index);
  const isLead = /director|executive/i.test(bot.role || "");
  const lead = leads.get(room);
  const director = lead && lead !== bot.name ? lead : null;
  const lastIso = blankToNull(bot.last_iso);
  const result = sentenceOrNull(bot.result);
  const usage = typeof bot.usage_share === "number" && Number.isFinite(bot.usage_share) ? Math.round(bot.usage_share) : null;
  const aliases = [id, bot.name.trim().toLowerCase()];
  if (isLead && bot.director) aliases.push(bot.director);
  const view: DeskBot = {
    id,
    name: bot.name,
    team,
    role: roleLabel(bot.role),
    director,
    status,
    statusLabel: status === "Needs Ryan" ? "Needs you" : status,
    registry: wordLabel(bot.registry_status),
    scope: sentenceOrNull(bot.scope),
    source: blankToNull(bot.source),
    result,
    usage,
    lastIso,
    relative: relativeTime(lastIso, now),
    ct: formatCt(lastIso, true) || (blankToNull(bot.last) && !looksLikeSlug(bot.last || "") ? blankToNull(bot.last) : null),
    doneToday: isDoneToday(lastIso, now),
    stale: false,
    isLead,
    aliases,
    decision: null,
    routines: [],
    handoffs: [],
  };
  view.stale = isStaleBot(view, now);
  return view;
}

function presentRoutine(routine: RoutineRecord, now: number): RoutineView {
  const name = blankToNull(routine.name);
  const lastIso = blankToNull(routine.last);
  const nextIso = blankToNull(routine.next);
  return {
    name,
    status: wordLabel(routine.status),
    last: formatCt(lastIso, true) || (lastIso && !looksLikeSlug(lastIso) ? lastIso : null),
    next: formatCt(nextIso, true) || (nextIso && !looksLikeSlug(nextIso) ? nextIso : null),
    note: sentenceOrNull(routine.note),
    failed: isFailedRoutine(routine),
    overdue: isOverdueRoutine(routine, now),
  };
}

function todayFeed(bots: DeskBot[], activity: Snapshot["activity"], now: number): FeedItem[] {
  const items: FeedItem[] = [];
  const seen = new Set<string>();
  const push = (name: string, text: string, iso: string) => {
    const sentenceText = withoutName(name, text);
    if (!sentenceText) return;
    const key = `${name.toLowerCase()}|${sentenceText.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    const at = Date.parse(iso);
    if (!Number.isFinite(at) || !isDoneToday(iso, now)) return;
    const ct = formatCt(iso, true);
    if (!ct) return;
    items.push({ key: `${iso}-${name}-${sentenceText.slice(0, 24)}`, name, sentence: sentenceText, relative: relativeTime(iso, now), ct, at });
  };
  for (const bot of bots) {
    if (bot.result && bot.lastIso) push(bot.name, bot.result, bot.lastIso);
  }
  for (const item of activity) {
    const name = actorName(item.actor, bots);
    const summary = sentenceOrNull(item.summary);
    if (!name || !summary) continue;
    push(name, summary, item.timestamp);
  }
  return items.sort((a, b) => b.at - a.at);
}

function handoffsFor(
  bot: DeskBot,
  rows: { item: Interaction; at: number }[],
  bots: DeskBot[],
  now: number,
): HandoffView[] {
  const mine = new Set(bot.aliases);
  const out: HandoffView[] = [];
  for (const row of rows) {
    const from = row.item.from.trim().toLowerCase();
    const to = row.item.to.trim().toLowerCase();
    const inbound = mine.has(to);
    const outbound = mine.has(from);
    if (!inbound && !outbound) continue;
    const other = outbound ? row.item.to : row.item.from;
    const who = partyLabel(other, bots);
    const title = sentenceOrNull(row.item.title);
    const ct = formatCt(row.item.timestamp, true);
    if (!who || !title || !ct) continue;
    const status = wordLabel(row.item.status);
    out.push({
      at: row.item.timestamp,
      relative: relativeTime(row.item.timestamp, now),
      ct,
      direction: outbound ? "To" : "From",
      who,
      title,
      kind: KIND[row.item.kind] || wordLabel(row.item.kind) || "Note",
      status,
    });
    if (out.length === 10) break;
  }
  return out;
}

function matchDecision(bot: DeskBot, decisions: Decision[]): DecisionLink | null {
  const name = bot.name.trim().toLowerCase();
  const hits = decisions.filter((decision) => mentionsBot(decision, name));
  if (!hits.length) return null;
  hits.sort((a, b) => (b.created_at || b.since).localeCompare(a.created_at || a.since));
  const decision = hits[0]!;
  const label = shortTitle(decision.title) || sentence(decision.title);
  if (!label || looksLikeSlug(label)) return null;
  return { id: decisionKey(decision), label };
}

function mentionsBot(decision: Decision, name: string): boolean {
  if ((decision.requested_by || "").trim().toLowerCase() === name) return true;
  const blob = [decision.title, decision.summary, decision.context].filter(Boolean).join("\n").toLowerCase();
  return blob.includes(name);
}

function routineMatches(routine: RoutineView, bot: DeskBot): boolean {
  if (!routine.name) return false;
  const name = routine.name.toLowerCase();
  if (name.includes(bot.name.toLowerCase())) return true;
  return bot.team.length > 2 && name.includes(bot.team.toLowerCase());
}

function firmUsage(snapshot: Snapshot): FirmUsage | null {
  const usage = snapshot.bots.usage;
  if (!usage) return null;
  const weekly = typeof usage.weekly_used_pct === "number" ? `${usage.weekly_used_pct}% of the weekly pool` : null;
  const onDemand =
    typeof usage.on_demand_cycle_usd === "number"
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(usage.on_demand_cycle_usd)
      : null;
  const reset = typeof usage.weekly_reset === "string" ? blankToNull(usage.weekly_reset) : null;
  if (!weekly && !onDemand && !reset) return null;
  return { weekly, onDemand, reset };
}

function actorName(actor: string, bots: DeskBot[]): string | null {
  const key = actor.trim();
  if (!key) return null;
  const found = bots.find((bot) => bot.aliases.includes(key.toLowerCase()));
  if (found) return found.name;
  if (looksLikeSlug(key)) return null;
  return key;
}

function withoutName(name: string, text: string): string | null {
  const clean = sentence(text);
  if (!clean) return null;
  if (clean.toLowerCase().startsWith(name.toLowerCase())) {
    const rest = clean.slice(name.length).replace(/^[\s:,.\-–—]+/, "");
    return rest || clean;
  }
  return clean;
}

function partyLabel(value: string, bots: DeskBot[]): string | null {
  const key = value.trim().toLowerCase();
  if (!key) return null;
  if (key === "ryan") return "Ryan";
  const found = bots.find((bot) => bot.aliases.includes(key));
  if (found) return found.name;
  if (ROOMS[key]) return ROOMS[key];
  if (looksLikeSlug(value)) return null;
  return value.trim();
}

function byAttention(a: DeskBot, b: DeskBot): number {
  return rank(a.status) - rank(b.status) || recency(b) - recency(a) || a.name.localeCompare(b.name);
}

function rank(status: BotStatus): number {
  if (status === "Needs Ryan") return 0;
  if (status === "Working") return 1;
  return 2;
}

function recency(bot: DeskBot): number {
  const at = bot.lastIso ? Date.parse(bot.lastIso) : 0;
  return Number.isFinite(at) ? at : 0;
}

function drawnStatus(status: string, paused: boolean): BotStatus {
  if (paused) return "Paused";
  const value = status.trim().toLowerCase();
  if (!value || value === "unknown") return "Idle";
  if (value.includes("need")) return "Needs Ryan";
  if (value.includes("pause")) return "Paused";
  if (value.includes("work") || value === "active") return "Working";
  return "Idle";
}

function roomOf(bot: BotRecord): string {
  if (bot.director && bot.director !== "ryan" && ROOMS[bot.director]) return bot.director;
  const team = bot.team.trim().toLowerCase().replace(/\s+/g, "_");
  if (ROOMS[team]) return team;
  const named = Object.entries(ROOMS).find(([, label]) => label.toLowerCase() === bot.team.trim().toLowerCase());
  return named?.[0] || "firm_os";
}

function leadNames(bots: BotRecord[]): Map<string, string> {
  const leads = new Map<string, string>();
  for (const bot of bots) {
    if (!/director|executive/i.test(bot.role || "")) continue;
    const room = roomOf(bot);
    if (!leads.has(room)) leads.set(room, bot.name);
  }
  return leads;
}

function slugOf(bot: BotRecord, index: number): string {
  const slug = blankToNull(bot.slug);
  if (slug) return slug.toLowerCase().replace(/[^a-z0-9_]+/g, "_");
  const fromName = bot.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return fromName || `bot_${index}`;
}

function roleLabel(role: string | null | undefined): string | null {
  const value = blankToNull(role);
  if (!value) return null;
  if (/outside/i.test(value)) return "Works outside the director tree";
  return value;
}

function wordLabel(value: string | null | undefined): string | null {
  const text = blankToNull(value);
  if (!text || looksLikeSlug(text)) return null;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function sentenceOrNull(value: string | null | undefined): string | null {
  const text = blankToNull(value);
  return text ? sentence(text) : null;
}

function looksLikeSlug(value: string): boolean {
  const text = value.trim();
  if (!text || /\s/.test(text)) return false;
  return text.includes("_") || /^[a-z0-9-]{12,}$/.test(text);
}
