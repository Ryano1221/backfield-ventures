import type { BotFeed, BotRecord, OutreachTrack, Pitch, Snapshot } from "./types";
import { STALE_AFTER_MS } from "./types";

export type PitchRow = Pitch & { receivedLabel: string };

export type BotView = {
  name: string;
  team: string;
  role: string;
  scope: string;
  status: string;
  registry: string;
  failed: boolean;
  last: string;
  result: string;
  source: string;
  usage: string | null;
};

export type Bar = { label: string; count: number };

export type TeamGroup = { team: string; bots: BotView[] };

export type OutreachView = {
  track: string;
  label: string;
  sent: number;
  floor: number;
  pct: number;
  met: boolean;
};

export type DashboardModel = {
  hasSnapshot: boolean;
  generatedAt: string | null;
  generatedLabel: string | null;
  relative: string | null;
  stale: boolean;
  botFeedLabel: string | null;
  kpis: {
    toReview: number | null;
    new7: number | null;
    new30: number | null;
    decisions: number | null;
    working: number | null;
    needsRyan: number | null;
    failed: number | null;
    outreachSent: number | null;
    outreachFloor: number | null;
    tracksUnder: number | null;
  };
  pitches: PitchRow[];
  sectors: Bar[];
  stages: Bar[];
  teams: TeamGroup[];
  routines: { name: string; status: string; last: string; note: string }[];
  usage: { weekly: string | null; onDemand: string | null; reset: string | null } | null;
  outreach: OutreachView[];
  decisions: { title: string; sinceLabel: string; relative: string; link: string | null }[];
  activity: { at: string; timeLabel: string; relative: string; actor: string; summary: string }[];
};

const TEAM_ORDER = ["Executive", "Investment", "Network", "Growth", "Intelligence", "Firm OS"];
const DAY = 24 * 60 * 60 * 1000;

const TRACK_LABELS: Record<string, string> = {
  athlete: "Athlete",
  fo_hnwi: "FO / HNWI",
  "fo/hnwi": "FO / HNWI",
  "fo / hnwi": "FO / HNWI",
  creator: "Creator",
  real_estate: "Real estate agents",
  real_estate_agents: "Real estate agents",
  "real estate agents": "Real estate agents",
  ig_dms: "IG DMs",
  "ig dms": "IG DMs",
  follows: "Follows",
};

export function buildDashboard(snapshot: Snapshot | null, now = Date.now()): DashboardModel {
  if (!snapshot) return emptyModel();
  const generatedMs = Date.parse(snapshot.generated_at);
  const pitches = snapshot.pitches.map((pitch) => ({
    ...pitch,
    receivedLabel: formatWhen(pitch.received),
  }));
  const outreach = snapshot.outreach.map(presentTrack);
  const sent = outreach.reduce((sum, row) => sum + row.sent, 0);
  const floor = outreach.reduce((sum, row) => sum + row.floor, 0);
  const bots = snapshot.bots.bots;
  return {
    hasSnapshot: true,
    generatedAt: snapshot.generated_at,
    generatedLabel: formatWhen(snapshot.generated_at, true),
    relative: relativeTime(generatedMs, now),
    stale: Number.isFinite(generatedMs) ? now - generatedMs > STALE_AFTER_MS : true,
    botFeedLabel: snapshot.bots.built_at ? formatWhen(snapshot.bots.built_at, true) : null,
    kpis: {
      toReview: pitches.filter((pitch) => pitch.status === "new" || pitch.status === "reviewing").length,
      new7: pitches.filter((pitch) => withinDays(pitch.received, 7, now)).length,
      new30: pitches.filter((pitch) => withinDays(pitch.received, 30, now)).length,
      decisions: snapshot.decisions.length,
      working: bots.filter((bot) => bot.status.trim().toLowerCase() === "working").length,
      needsRyan: bots.filter((bot) => bot.status.trim().toLowerCase() === "needs ryan").length,
      failed: bots.filter(isFailedBot).length,
      outreachSent: sent,
      outreachFloor: floor,
      tracksUnder: outreach.filter((row) => row.sent < row.floor).length,
    },
    pitches,
    sectors: bars(pitches.flatMap((pitch) => (pitch.sector ? [pitch.sector] : []))),
    stages: bars(pitches.flatMap((pitch) => (pitch.stage ? [pitch.stage] : []))),
    teams: groupBots(bots),
    routines: (snapshot.bots.routines ?? []).map((routine) => ({
      name: routine.name || "Routine",
      status: routine.status || "Unknown",
      last: routine.last || "",
      note: routine.note || "",
    })),
    usage: presentUsage(snapshot.bots),
    outreach,
    decisions: snapshot.decisions.map((decision) => ({
      title: decision.title,
      sinceLabel: formatWhen(decision.since, true),
      relative: relativeTime(Date.parse(decision.since), now),
      link: decision.link,
    })),
    activity: [...snapshot.activity]
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
      .map((item) => ({
        at: item.timestamp,
        timeLabel: formatWhen(item.timestamp, true),
        relative: relativeTime(Date.parse(item.timestamp), now),
        actor: item.actor,
        summary: item.summary,
      })),
  };
}

export function withinDays(value: string, days: number, now: number): boolean {
  const ms = receivedMs(value);
  if (!Number.isFinite(ms)) return false;
  const age = now - ms;
  return age >= -60_000 && age <= days * DAY;
}

export function isFailedBot(bot: Pick<BotRecord, "status" | "registry_status">): boolean {
  const status = bot.status.trim().toLowerCase();
  const registry = (bot.registry_status ?? "").trim().toLowerCase();
  return status.includes("fail") || registry === "failing";
}

export function relativeTime(ms: number, now: number): string {
  if (!Number.isFinite(ms)) return "";
  const delta = now - ms;
  const min = Math.round(delta / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

export function formatWhen(value: string, withTime = false): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, (month || 1) - 1, day || 1)));
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (!withTime) {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" }).format(date);
  }
  // Same shape as the rest of the OS: "Nov 3, 12:00pm CT".
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Chicago",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const period = get("dayPeriod").toLowerCase().replace(/\./g, "");
  return `${get("month")} ${get("day")}, ${get("hour")}:${get("minute")}${period} CT`;
}

function presentTrack(track: OutreachTrack): OutreachView {
  const key = track.track.trim().toLowerCase();
  const pct = track.floor > 0 ? Math.min(100, Math.round((track.sent / track.floor) * 100)) : track.sent > 0 ? 100 : 0;
  return {
    track: track.track,
    label: track.label || TRACK_LABELS[key] || track.track,
    sent: track.sent,
    floor: track.floor,
    pct,
    met: track.sent >= track.floor,
  };
}

function presentUsage(feed: BotFeed): DashboardModel["usage"] {
  const usage = feed.usage;
  if (!usage) return null;
  const weekly = typeof usage.weekly_used_pct === "number" ? String(usage.weekly_used_pct) : null;
  const onDemand =
    typeof usage.on_demand_cycle_usd === "number"
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(usage.on_demand_cycle_usd)
      : null;
  const reset = typeof usage.weekly_reset === "string" ? usage.weekly_reset : null;
  if (!weekly && !onDemand && !reset) return null;
  return { weekly, onDemand, reset };
}

function groupBots(bots: BotRecord[]): TeamGroup[] {
  const groups = new Map<string, BotView[]>();
  for (const bot of bots) {
    const view = presentBot(bot);
    const list = groups.get(view.team) ?? [];
    list.push(view);
    groups.set(view.team, list);
  }
  const names = [...groups.keys()].sort((a, b) => teamRank(a) - teamRank(b) || a.localeCompare(b));
  return names.map((team) => ({
    team,
    bots: (groups.get(team) ?? []).sort(compareBots),
  }));
}

function presentBot(bot: BotRecord): BotView {
  return {
    name: bot.name,
    team: bot.team,
    role: bot.role || "",
    scope: bot.scope || "",
    status: bot.status,
    registry: bot.registry_status || "",
    failed: isFailedBot(bot),
    last: bot.last || "",
    result: bot.result || "",
    source: bot.source || "",
    usage: typeof bot.usage_share === "number" ? `${bot.usage_share}%` : null,
  };
}

function compareBots(a: BotView, b: BotView): number {
  const role = roleRank(a.role) - roleRank(b.role);
  if (role) return role;
  const status = statusRank(a.status) - statusRank(b.status);
  if (status) return status;
  return a.name.localeCompare(b.name);
}

function teamRank(team: string): number {
  const index = TEAM_ORDER.indexOf(team);
  return index === -1 ? TEAM_ORDER.length : index;
}

function roleRank(role: string): number {
  const value = role.toLowerCase();
  if (value === "executive") return 0;
  if (value === "director") return 1;
  return 2;
}

function statusRank(status: string): number {
  const value = status.toLowerCase();
  if (value === "needs ryan") return 0;
  if (value === "working") return 1;
  if (value.includes("fail")) return 2;
  if (value === "idle") return 3;
  if (value === "paused") return 4;
  return 5;
}

function bars(labels: string[]): Bar[] {
  const counts = new Map<string, number>();
  for (const label of labels) {
    const key = label.trim() || "Unspecified";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const top = sorted.slice(0, 8).map(([label, count]) => ({ label, count }));
  const rest = sorted.slice(8).reduce((sum, [, count]) => sum + count, 0);
  if (rest) top.push({ label: "Other", count: rest });
  return top;
}

function receivedMs(value: string): number {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year, (month || 1) - 1, day || 1, 12);
  }
  return Date.parse(value);
}

function emptyModel(): DashboardModel {
  return {
    hasSnapshot: false,
    generatedAt: null,
    generatedLabel: null,
    relative: null,
    stale: false,
    botFeedLabel: null,
    kpis: {
      toReview: null,
      new7: null,
      new30: null,
      decisions: null,
      working: null,
      needsRyan: null,
      failed: null,
      outreachSent: null,
      outreachFloor: null,
      tracksUnder: null,
    },
    pitches: [],
    sectors: [],
    stages: [],
    teams: [],
    routines: [],
    usage: null,
    outreach: [],
    decisions: [],
    activity: [],
  };
}
