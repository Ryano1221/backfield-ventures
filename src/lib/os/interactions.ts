import { formatWhen, relativeTime } from "./metrics";
import type { BotRecord, DirectorKey, Interaction, Snapshot } from "./types";
import { DIRECTOR_KEYS } from "./types";

export const ORG_DIRECTORS = ["investment", "intelligence", "network", "growth", "firm_os"] as const;

export type OrgKey = DirectorKey | "other";

const DAY = 24 * 60 * 60 * 1000;
const DIRECTOR_LABELS: Record<OrgKey, string> = {
  ryan: "Ryan",
  executive: "Executive",
  investment: "Investment",
  intelligence: "Intelligence",
  network: "Network",
  growth: "Growth",
  firm_os: "Firm OS",
  other: "Other",
};

const PARTY_LABELS: Record<string, string> = {
  investment: "Investment",
  intelligence: "Intelligence",
  network: "Network",
  growth: "Growth",
  firm_os: "Firm OS",
  executive: "BV Executive",
  ryan: "Ryan",
};

export function displayParty(name: string): string {
  return PARTY_LABELS[name.trim().toLowerCase()] ?? name;
}

export type MapBot = {
  name: string;
  role: string;
  status: string;
  result: string;
  failed: boolean;
};

export type MapDirector = {
  key: OrgKey;
  label: string;
  traffic: number;
  needs: number;
  working: number;
  failed: number;
  lead: MapBot | null;
  specialists: MapBot[];
};

export type MapEdge = {
  from: OrgKey;
  to: OrgKey;
  count: number;
};

export type MapHandoff = {
  timestamp: string;
  timeLabel: string;
  relative: string;
  from: string;
  to: string;
  kind: Interaction["kind"];
  title: string;
  status: string | null;
  packetId: string | null;
  fromGroup: OrgKey;
  toGroup: OrgKey;
};

export type MapModel = {
  hasInteractions: boolean;
  ryan: MapDirector;
  executive: MapDirector;
  directors: MapDirector[];
  other: MapDirector;
  edges: MapEdge[];
  feed: MapHandoff[];
};

export function buildMap(snapshot: Snapshot | null, now = Date.now()): MapModel {
  const bots = snapshot?.bots.bots ?? [];
  const interactions = snapshot?.interactions ?? [];
  const feed = [...interactions]
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    .map((item) => presentHandoff(item, bots, now));
  const recent = feed.filter((item) => withinWeek(item.timestamp, now));
  const edges = undirectedEdges(recent);
  const traffic = new Map<OrgKey, number>();
  for (const item of recent) {
    bump(traffic, item.fromGroup);
    bump(traffic, item.toGroup);
  }
  return {
    hasInteractions: interactions.length > 0,
    ryan: group("ryan", bots, traffic),
    executive: group("executive", bots, traffic),
    directors: ORG_DIRECTORS.map((key) => group(key, bots, traffic)),
    other: group("other", bots, traffic),
    edges,
    feed,
  };
}

export function groupKey(bot: Pick<BotRecord, "director">): OrgKey {
  return bot.director ?? "other";
}

export function rollupEndpoint(endpoint: string, bots: BotRecord[]): OrgKey {
  const key = endpoint.trim().toLowerCase();
  if ((DIRECTOR_KEYS as readonly string[]).includes(key)) return key as DirectorKey;
  const bot = bots.find((item) => item.name.trim().toLowerCase() === key);
  if (!bot) return "other";
  return groupKey(bot);
}

function group(key: OrgKey, bots: BotRecord[], traffic: Map<OrgKey, number>): MapDirector {
  const members = bots.filter((bot) => groupKey(bot) === key).map(presentBot);
  const lead = key === "other" ? null : pickLead(members, key);
  const specialists = lead ? members.filter((bot) => bot !== lead) : members;
  return {
    key,
    label: DIRECTOR_LABELS[key],
    traffic: traffic.get(key) ?? 0,
    needs: members.filter((bot) => bot.status.toLowerCase() === "needs ryan").length,
    working: members.filter((bot) => bot.status.toLowerCase() === "working").length,
    failed: members.filter((bot) => bot.failed).length,
    lead,
    specialists,
  };
}

function pickLead(members: MapBot[], key: OrgKey): MapBot | null {
  const wanted = key === "executive" ? "executive" : key === "ryan" ? "ceo" : "director";
  return members.find((bot) => bot.role.toLowerCase() === wanted) ?? null;
}

function presentBot(bot: BotRecord): MapBot {
  const status = bot.status.trim().toLowerCase();
  const registry = (bot.registry_status ?? "").trim().toLowerCase();
  return {
    name: bot.name,
    role: bot.role || "",
    status: bot.status,
    result: bot.result || "",
    failed: status.includes("fail") || registry === "failing",
  };
}

function presentHandoff(item: Interaction, bots: BotRecord[], now: number): MapHandoff {
  return {
    timestamp: item.timestamp,
    timeLabel: formatWhen(item.timestamp, true),
    relative: relativeTime(Date.parse(item.timestamp), now),
    from: item.from,
    to: item.to,
    kind: item.kind,
    title: item.title,
    status: item.status,
    packetId: item.packet_id,
    fromGroup: rollupEndpoint(item.from, bots),
    toGroup: rollupEndpoint(item.to, bots),
  };
}

function undirectedEdges(items: MapHandoff[]): MapEdge[] {
  const counts = new Map<string, MapEdge>();
  for (const item of items) {
    if (item.fromGroup === item.toGroup) continue;
    const [from, to] = [item.fromGroup, item.toGroup].sort();
    const id = `${from}|${to}`;
    const existing = counts.get(id);
    if (existing) existing.count += 1;
    else counts.set(id, { from, to, count: 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.from.localeCompare(b.from));
}

function withinWeek(timestamp: string, now: number): boolean {
  const ms = Date.parse(timestamp);
  if (!Number.isFinite(ms)) return false;
  const age = now - ms;
  return age >= -60_000 && age <= 7 * DAY;
}

function bump(map: Map<OrgKey, number>, key: OrgKey) {
  map.set(key, (map.get(key) ?? 0) + 1);
}
