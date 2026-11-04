import { ctDay } from "./bot-desk";
import type { DeskBot } from "./bot-desk";
import { formatCt } from "./night";
import type { Interaction, InteractionKind } from "./types";

export const FLOW_WINDOWS = ["today", "week", "all"] as const;
export type FlowWindow = (typeof FLOW_WINDOWS)[number];

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const CLOCK_SKEW_MS = 60_000;

const TEAM_ORDER = ["intelligence", "executive", "investment", "network", "growth", "firm_os", "ryan"] as const;

const TEAM_LABEL: Record<string, string> = {
  intelligence: "Intelligence",
  executive: "Executive",
  investment: "Investment",
  network: "Network",
  growth: "Growth",
  firm_os: "Firm OS",
  ryan: "Ryan",
};

const TEAM_SHORT: Record<string, string> = {
  intelligence: "Intel",
  executive: "Exec",
  investment: "Invest",
  network: "Network",
  growth: "Growth",
  firm_os: "Firm",
  ryan: "Ryan",
};

const LABEL_KEY: Record<string, string> = {
  intelligence: "intelligence",
  executive: "executive",
  investment: "investment",
  network: "network",
  growth: "growth",
  "firm os": "firm_os",
  ryan: "ryan",
};

const DIRECTORS = new Set(Object.keys(TEAM_LABEL));

const KIND_NOUN: Record<InteractionKind, string> = {
  packet: "packet",
  amendment: "amendment",
  result: "result",
  message: "message",
};

const KIND_LABEL: Record<InteractionKind, string> = {
  packet: "Packet",
  amendment: "Amendment",
  result: "Result",
  message: "Message",
};

export type FlowHandoff = {
  id: string;
  ms: number;
  timestamp: string;
  from: string;
  to: string;
  fromLabel: string;
  toLabel: string;
  kind: InteractionKind;
  kindLabel: string;
  title: string;
  status: string | null;
  ct: string;
  packetId: string | null;
};

export type FlowEdge = {
  key: string;
  from: string;
  to: string;
  fromLabel: string;
  toLabel: string;
  count: number;
  handoffs: FlowHandoff[];
};

export type FlowCounts = {
  working: number;
  needs: number;
  idle: number;
  paused: number;
};

export type FlowNode = {
  key: string;
  label: string;
  short: string;
  count: number;
  counts: FlowCounts;
  botIds: string[];
};

export type FlowModel = {
  window: FlowWindow;
  nodes: FlowNode[];
  edges: FlowEdge[];
  handoffs: FlowHandoff[];
  lines: string[];
  maxCount: number;
};

export function teamKeyOfBot(bot: Pick<DeskBot, "team">): string {
  return LABEL_KEY[bot.team.trim().toLowerCase()] || "firm_os";
}

export function endpointTeam(raw: string, bots: Pick<DeskBot, "id" | "name" | "team" | "aliases">[]): string | null {
  const key = raw.trim().toLowerCase();
  if (!key) return null;
  if (DIRECTORS.has(key)) return key;
  const named = LABEL_KEY[key];
  if (named) return named;
  const bot = bots.find((item) => item.id === key || item.aliases.includes(key) || item.name.trim().toLowerCase() === key);
  return bot ? teamKeyOfBot(bot) : null;
}

export function inFlowWindow(ms: number, window: FlowWindow, now: number): boolean {
  if (!Number.isFinite(ms)) return false;
  if (window === "all") return true;
  if (window === "today") {
    const day = ctDay(new Date(ms).toISOString());
    const today = ctDay(new Date(now).toISOString());
    return Boolean(day && today && day === today);
  }
  const age = now - ms;
  return age >= -CLOCK_SKEW_MS && age <= WEEK_MS;
}

export function aggregateEdges(handoffs: FlowHandoff[]): FlowEdge[] {
  const groups = new Map<string, FlowEdge>();
  for (const handoff of handoffs) {
    if (handoff.from === handoff.to) continue;
    const key = `${handoff.from}|${handoff.to}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      existing.handoffs.push(handoff);
      continue;
    }
    groups.set(key, {
      key,
      from: handoff.from,
      to: handoff.to,
      fromLabel: handoff.fromLabel,
      toLabel: handoff.toLabel,
      count: 1,
      handoffs: [handoff],
    });
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
}

export function flowLines(edges: FlowEdge[], limit = 5): string[] {
  return edges.slice(0, limit).map((edge) => {
    const kinds = new Set(edge.handoffs.map((handoff) => handoff.kind));
    const word = kinds.size === 1 ? plural(KIND_NOUN[edge.handoffs[0]!.kind], edge.count) : plural("handoff", edge.count);
    return `${edge.fromLabel} sent ${edge.toLabel} ${edge.count.toLocaleString("en-US")} ${word}`;
  });
}

export function filterHandoffs<T extends { ms: number }>(items: T[], window: FlowWindow, now: number): T[] {
  return items.filter((item) => inFlowWindow(item.ms, window, now));
}

export function presentHandoffs(interactions: Interaction[], bots: Pick<DeskBot, "id" | "name" | "team" | "aliases">[]): FlowHandoff[] {
  const out: FlowHandoff[] = [];
  interactions.forEach((item, index) => {
    const ms = Date.parse(item.timestamp);
    if (!Number.isFinite(ms)) return;
    const from = endpointTeam(item.from, bots);
    const to = endpointTeam(item.to, bots);
    if (!from || !to || from === to) return;
    const title = item.title.trim();
    if (!title) return;
    const ct = formatCt(item.timestamp, true);
    if (!ct) return;
    out.push({
      id: `${item.timestamp}|${from}|${to}|${index}`,
      ms,
      timestamp: item.timestamp,
      from,
      to,
      fromLabel: TEAM_LABEL[from] || from,
      toLabel: TEAM_LABEL[to] || to,
      kind: item.kind,
      kindLabel: KIND_LABEL[item.kind] || item.kind,
      title,
      status: statusLabel(item.status),
      ct,
      packetId: item.packet_id,
    });
  });
  out.sort((a, b) => a.ms - b.ms || a.id.localeCompare(b.id));
  return out;
}

export function buildFlow(
  interactions: Interaction[],
  bots: DeskBot[],
  window: FlowWindow,
  now: number,
): FlowModel {
  const handoffs = filterHandoffs(presentHandoffs(interactions, bots), window, now);
  const edges = aggregateEdges(handoffs);
  const used = new Set<string>();
  for (const bot of bots) used.add(teamKeyOfBot(bot));
  for (const handoff of handoffs) {
    used.add(handoff.from);
    used.add(handoff.to);
  }
  const nodes = TEAM_ORDER.filter((key) => used.has(key)).map((key) => nodeFor(key, bots));
  return {
    window,
    nodes,
    edges,
    handoffs,
    lines: flowLines(edges),
    maxCount: edges.reduce((max, edge) => Math.max(max, edge.count), 0),
  };
}

export function defaultFlowWindow(interactions: Interaction[], bots: DeskBot[], now: number): FlowWindow {
  const presented = presentHandoffs(interactions, bots);
  if (presented.some((item) => inFlowWindow(item.ms, "today", now))) return "today";
  if (presented.some((item) => inFlowWindow(item.ms, "week", now))) return "week";
  return "all";
}

export function priorityBot(bots: DeskBot[]): DeskBot | null {
  if (!bots.length) return null;
  return [...bots].sort((a, b) => statusRank(a.status) - statusRank(b.status) || a.name.localeCompare(b.name))[0] ?? null;
}

function nodeFor(key: string, bots: DeskBot[]): FlowNode {
  const mine = bots.filter((bot) => teamKeyOfBot(bot) === key);
  const counts: FlowCounts = { working: 0, needs: 0, idle: 0, paused: 0 };
  for (const bot of mine) {
    if (bot.status === "Working") counts.working += 1;
    else if (bot.status === "Needs Ryan") counts.needs += 1;
    else if (bot.status === "Paused") counts.paused += 1;
    else counts.idle += 1;
  }
  return {
    key,
    label: TEAM_LABEL[key] || key,
    short: TEAM_SHORT[key] || TEAM_LABEL[key] || key,
    count: mine.length,
    counts,
    botIds: mine.map((bot) => bot.id),
  };
}

function statusLabel(value: string | null): string | null {
  const text = value?.trim();
  if (!text) return null;
  const words = text.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function plural(word: string, count: number): string {
  return count === 1 ? word : `${word}s`;
}

function statusRank(status: DeskBot["status"]): number {
  if (status === "Needs Ryan") return 0;
  if (status === "Working") return 1;
  return 2;
}
