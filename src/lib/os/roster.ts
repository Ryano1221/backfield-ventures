import type { OfficeBot, OfficeData, OfficeEvent } from "./night";

export const TEAM_ORDER = ["Intelligence", "Executive", "Investment", "Network", "Growth", "Firm OS"] as const;

export const STATUS_COLOR: Record<OfficeBot["status"], string> = {
  Working: "#000000",
  "Needs Ryan": "#000000",
  Idle: "rgba(0,0,0,.3)",
  Paused: "#ffffff",
  Degraded: "#000000",
  Failed: "#000000",
};

export type StatusCounts = { working: number; needs: number; idle: number; paused: number };

export type RosterGroup = {
  id: string;
  name: string;
  bots: OfficeBot[];
  counts: StatusCounts;
};

export type DetailRow = { label: string; value: string };
export type DetailHandoff = { at: string; text: string };

export type HandoffRow = {
  key: string;
  day: string;
  time: string;
  from: string;
  to: string;
  kind: OfficeEvent["kind"];
  status: string | null;
  title: string;
};

const KIND_LABEL: Record<OfficeEvent["kind"], string> = {
  packet: "Packet",
  amendment: "Amendment",
  result: "Result",
  message: "Message",
};

export function kindLabel(kind: OfficeEvent["kind"]): string {
  return KIND_LABEL[kind] || kind;
}

export function statusCounts(bots: OfficeBot[]): StatusCounts {
  const counts: StatusCounts = { working: 0, needs: 0, idle: 0, paused: 0 };
  for (const bot of bots) {
    if (bot.status === "Working") counts.working += 1;
    else if (bot.status === "Needs Ryan") counts.needs += 1;
    else if (bot.status === "Paused") counts.paused += 1;
    else counts.idle += 1;
  }
  return counts;
}

export function countLine(counts: StatusCounts): string {
  return `${counts.working} working · ${counts.needs} needs you · ${counts.idle} idle · ${counts.paused} paused`;
}

export function nameMap(bots: OfficeBot[]): Map<string, string> {
  const names = new Map<string, string>();
  for (const bot of bots) names.set(bot.slug, bot.name);
  return names;
}

export function rosterGroups(data: OfficeData): RosterGroup[] {
  const teams = new Map<string, OfficeBot[]>();
  for (const name of TEAM_ORDER) teams.set(name, []);
  for (const bot of data.bots) {
    const name = (TEAM_ORDER as readonly string[]).includes(bot.team) ? bot.team : "Firm OS";
    teams.get(name)!.push(bot);
  }
  const groups: RosterGroup[] = [];
  const needs = data.bots.filter((bot) => bot.status === "Needs Ryan").sort(byTeamThenDesk);
  if (needs.length) groups.push({ id: "needs", name: "Needs you", bots: needs, counts: statusCounts(needs) });
  for (const name of TEAM_ORDER) {
    const bots = (teams.get(name) ?? []).slice().sort(byDesk);
    if (!bots.length) continue;
    groups.push({ id: name, name, bots, counts: statusCounts(bots) });
  }
  return groups;
}

export function botActivity(bot: OfficeBot, events: OfficeEvent[], names: Map<string, string>): string {
  if (bot.result.trim()) return bot.result.trim();
  for (let index = events.length - 1; index >= 0; index--) {
    const event = events[index];
    if (!event || (event.f !== bot.slug && event.t !== bot.slug)) continue;
    const other = event.f === bot.slug ? event.t : event.f;
    const direction = event.f === bot.slug ? "To" : "From";
    return `${direction} ${partyName(other, names)}: ${event.title} · ${event.at}`;
  }
  return bot.last ? `Last seen ${bot.last}` : "";
}

export function botDetail(bot: OfficeBot, events: OfficeEvent[], names: Map<string, string>): { role: string; rows: DetailRow[]; handoffs: DetailHandoff[] } {
  const role = bot.role === "Outside tree" ? "Works outside the director tree" : bot.role;
  const rows: DetailRow[] = [];
  if (bot.result) rows.push({ label: "Now", value: bot.result });
  if (bot.last) rows.push({ label: "Last seen", value: bot.last });
  if (bot.scope) rows.push({ label: "Job", value: bot.scope });
  if (bot.usage != null) rows.push({ label: "Usage", value: `${bot.usage}% of Backfield bot usage, last 7 days` });
  if (bot.source) rows.push({ label: "Source", value: bot.source });
  const handoffs = events
    .filter((event) => event.f === bot.slug || event.t === bot.slug)
    .slice(-5)
    .reverse()
    .map((event) => ({
      at: event.at.replace(" CT", ""),
      text: event.f === bot.slug ? `To ${partyName(event.t, names)}: ${event.title}` : `From ${partyName(event.f, names)}: ${event.title}`,
    }));
  return { role, rows, handoffs };
}

export function handoffRows(events: OfficeEvent[], names: Map<string, string>): HandoffRow[] {
  return [...events].reverse().map((event) => {
    const [day, clock] = event.at.replace(" CT", "").split(", ");
    return {
      key: `${event.ts}-${event.f}-${event.t}-${event.title}`,
      day: day || event.at,
      time: clock ? `${clock} CT` : "CT",
      from: partyName(event.f, names),
      to: partyName(event.t, names),
      kind: event.kind,
      status: event.status,
      title: event.full || event.title,
    };
  });
}

function partyName(slug: string, names: Map<string, string>): string {
  if (slug === "ryan") return "Ryan";
  return names.get(slug) || slug;
}

function leadRank(bot: OfficeBot): number {
  return bot.role === "Director" || bot.role === "Executive" ? 0 : 1;
}

function byDesk(a: OfficeBot, b: OfficeBot): number {
  return leadRank(a) - leadRank(b) || a.name.localeCompare(b.name);
}

function teamIndex(team: string): number {
  const index = TEAM_ORDER.indexOf(team as (typeof TEAM_ORDER)[number]);
  return index === -1 ? TEAM_ORDER.length : index;
}

function byTeamThenDesk(a: OfficeBot, b: OfficeBot): number {
  return teamIndex(a.team) - teamIndex(b.team) || byDesk(a, b);
}
