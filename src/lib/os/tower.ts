import type { DeskBot } from "./bot-desk";
import { plainBotText } from "./night";
import type { Interaction } from "./types";

/**
 * The office tower: one floor per team, top floor first. Every placement and
 * every line of the floor log comes from the snapshot, so the scene is a true
 * picture of what the bots are doing, not decoration.
 */

export type Spot = "standup" | "desk" | "coffee" | "ryan" | "asleep";

export type TowerBot = {
  id: string;
  name: string;
  short: string;
  number: number;
  status: DeskBot["status"];
  statusLabel: string;
  spot: Spot;
  lead: boolean;
  /** What the bot's monitor shows. */
  screen: "bars" | "check" | "flag" | "alert" | "off";
  line: string | null;
  relative: string | null;
};

export type Walk = {
  key: string;
  from: string;
  to: string;
  fromId: string | null;
  toId: string | null;
  title: string;
  kind: Interaction["kind"];
};

export type Floor = {
  key: string;
  label: string;
  level: number;
  lead: TowerBot | null;
  bots: TowerBot[];
  walks: Walk[];
  log: string[];
  counts: { working: number; needs: number; idle: number; paused: number };
};

export const FLOOR_ORDER = ["Executive", "Network", "Investment", "Intelligence", "Growth", "Firm OS"] as const;

const WALK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function buildTower(bots: DeskBot[], interactions: Interaction[], now: number): Floor[] {
  const byTeam = new Map<string, DeskBot[]>();
  for (const bot of bots) {
    const team = bot.team || "Firm OS";
    byTeam.set(team, [...(byTeam.get(team) ?? []), bot]);
  }
  const teams = [...byTeam.keys()].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  const alias = new Map<string, DeskBot>();
  for (const bot of bots) for (const name of bot.aliases) alias.set(name.trim().toLowerCase(), bot);

  let number = 0;
  const floors = teams.map((team, index) => {
    const members = byTeam.get(team) ?? [];
    const leadBot = members.find((bot) => bot.isLead) ?? null;
    const doneToday = members.filter((bot) => !bot.isLead && bot.doneToday && bot.status === "Working");
    // The lead runs the standup. Bots that finished today report in; on a
    // quiet day the two most recently active teammates join instead.
    const joiners = doneToday.length
      ? doneToday
      : members.filter((bot) => !bot.isLead && bot.status === "Working" && bot.lastIso).sort((a, b) => Date.parse(b.lastIso || "") - Date.parse(a.lastIso || ""));
    const huddle = Boolean(leadBot && leadBot.status === "Working" && joiners.length);
    const standing = new Set(huddle ? joiners.slice(0, doneToday.length ? 3 : 2).map((bot) => bot.id) : []);
    const placed = members.map((bot) => {
      number += 1;
      return place(bot, number, standing, huddle);
    });
    const lead = placed.find((bot) => bot.lead) ?? null;
    const walks = floorWalks(members, interactions, alias, now);
    return {
      key: slug(team),
      label: team,
      level: teams.length - index,
      lead,
      bots: placed,
      walks,
      log: floorLog(team, placed, walks, index === 0),
      counts: {
        working: placed.filter((bot) => bot.status === "Working").length,
        needs: placed.filter((bot) => bot.status === "Needs Ryan").length,
        idle: placed.filter((bot) => bot.status === "Idle").length,
        paused: placed.filter((bot) => bot.status === "Paused").length,
      },
    } satisfies Floor;
  });
  return floors;
}

function rank(team: string): number {
  const at = FLOOR_ORDER.indexOf(team as (typeof FLOOR_ORDER)[number]);
  return at === -1 ? FLOOR_ORDER.length : at;
}

function place(bot: DeskBot, number: number, standing: Set<string>, huddle: boolean): TowerBot {
  let spot: Spot = "desk";
  let screen: TowerBot["screen"] = "bars";
  if (bot.status === "Needs Ryan") {
    spot = "ryan";
    screen = "flag";
  } else if (bot.status === "Paused") {
    spot = "asleep";
    screen = "off";
  } else if (bot.status === "Idle") {
    spot = "coffee";
    screen = "off";
  } else if (bot.status === "Failed" || bot.status === "Degraded") {
    screen = "alert";
  } else if (bot.isLead && huddle) {
    spot = "standup";
  } else if (standing.has(bot.id)) {
    spot = "standup";
    screen = "check";
  } else if (bot.doneToday) {
    screen = "check";
  }
  return {
    id: bot.id,
    name: bot.name,
    short: shortName(bot.name),
    number,
    status: bot.status,
    statusLabel: bot.statusLabel,
    spot,
    lead: bot.isLead,
    screen,
    line: bot.result ? clip(plainBotText(bot.result), 120) : null,
    relative: bot.relative,
  };
}

function floorWalks(members: DeskBot[], interactions: Interaction[], alias: Map<string, DeskBot>, now: number): Walk[] {
  const ids = new Set(members.map((bot) => bot.id));
  const out: Walk[] = [];
  const recent = [...interactions]
    .filter((row) => {
      const at = Date.parse(row.timestamp);
      return Number.isFinite(at) && now - at < WALK_WINDOW_MS && now - at > -60_000;
    })
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  const seen = new Set<string>();
  for (const row of recent) {
    const dedupe = `${row.from}|${row.to}|${row.title}`.toLowerCase();
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    const from = alias.get(row.from.trim().toLowerCase()) ?? null;
    const to = alias.get(row.to.trim().toLowerCase()) ?? null;
    // A walk belongs to the floor of whoever carries the folder.
    if (!from || !ids.has(from.id)) continue;
    out.push({
      key: `${row.timestamp}-${row.from}-${row.to}`,
      from: from.name,
      to: to?.name ?? (row.to.toLowerCase() === "ryan" ? "Ryan" : titleCase(row.to)),
      fromId: from.id,
      toId: to?.id ?? null,
      title: clip(plainBotText(row.title), 40),
      kind: row.kind,
    });
    if (out.length >= 3) break;
  }
  return out;
}

function floorLog(team: string, bots: TowerBot[], walks: Walk[], top: boolean): string[] {
  const lines: string[] = [];
  const lead = bots.find((bot) => bot.lead);
  const standup = bots.filter((bot) => bot.spot === "standup" && !bot.lead);
  if (lead && standup.length) lines.push(`Standup: ${lead.name} at the whiteboard with ${list(standup.map((bot) => bot.name))}.`);
  for (const walk of walks) {
    const verb = walk.kind === "result" ? "hands" : walk.kind === "amendment" ? "brings a fix for" : walk.kind === "message" ? "passes a note on" : "walks";
    lines.push(`Handoff: ${walk.from} ${verb} "${walk.title}" to ${walk.to}.`);
  }
  for (const bot of bots.filter((row) => row.spot === "ryan")) {
    lines.push(top ? `${bot.name} waits at the Ryan door with a green flag.` : `${bot.name} takes the green flag up the lift to the Ryan door.`);
  }
  const alerts = bots.filter((bot) => bot.screen === "alert");
  if (alerts.length) lines.push(`Snag: ${list(alerts.map((bot) => bot.name))} ${alerts.length === 1 ? "hit" : "hit"} a problem on the last run.`);
  const coffee = bots.filter((bot) => bot.spot === "coffee");
  if (coffee.length) lines.push(`Coffee bar: ${list(coffee.map((bot) => bot.name))} (idle today).`);
  const asleep = bots.filter((bot) => bot.spot === "asleep");
  if (asleep.length) lines.push(`Asleep at their desks (paused): ${list(asleep.map((bot) => bot.name))}.`);
  if (!lines.length) {
    const working = bots.filter((bot) => bot.status === "Working").length;
    lines.push(working ? `${team}: ${working} at their desks, heads down.` : `${team}: quiet floor.`);
  }
  return lines;
}

export function shortName(name: string): string {
  const clean = name.replace(/^(FIXTURE|BV|Backfield)\s+/i, "").trim();
  return clean.length > 16 ? `${clean.slice(0, 15).trimEnd()}…` : clean;
}

function list(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function clip(value: string, max: number): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s.,;:-]+$/, "")}…`;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function titleCase(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
