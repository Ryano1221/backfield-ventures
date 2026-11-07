import type { BotStatus, DeskBot } from "./bot-desk";
import type { Interaction } from "./types";

/**
 * The live Backfield Ventures office: where every bot is right now, worked out
 * from its real status. Coordinates are floor tiles on an isometric grid; the
 * component turns them into screen positions and animates the walks between.
 *
 *   x runs down and to the right, y runs down and to the left.
 *   The two back walls sit along y = 0 (right wall) and x = 0 (left wall).
 */

export const GRID = { w: 34, h: 26 } as const;

export type ZoneKey = "exec" | "lab" | "pods" | "lounge" | "break" | "lobby";

export type Zone = { key: ZoneKey; label: string; x: number; y: number; w: number; h: number; glass: boolean };

/** Fixed rooms. The pods area in the middle is filled per team at build time. */
export const ZONES: Zone[] = [
  { key: "exec", label: "Executive office", x: 1, y: 1, w: 8, h: 7, glass: true },
  { key: "lab", label: "Sports data lab", x: 25, y: 1, w: 8, h: 7, glass: true },
  { key: "pods", label: "Team pods", x: 10, y: 1, w: 14, h: 15, glass: false },
  { key: "lounge", label: "Film study lounge", x: 1, y: 17, w: 9, h: 8, glass: false },
  { key: "break", label: "Break room", x: 25, y: 17, w: 8, h: 8, glass: false },
  { key: "lobby", label: "The field", x: 11, y: 18, w: 13, h: 7, glass: false },
];

export type Point = { x: number; y: number };

export type Desk = { id: string; x: number; y: number; team: string; owner: string | null; facing: 1 | -1; exec: boolean };

export type Pod = { team: string; x: number; y: number; w: number; h: number };

export type Place = "desk" | "exec" | "lab" | "lounge" | "break" | "lobby";

export type Placement = {
  id: string;
  x: number;
  y: number;
  place: Place;
  /** The desk this bot owns, lit while it works there. */
  desk: string | null;
  atDesk: boolean;
  facing: 1 | -1;
  bubble: string | null;
};

export type OfficeLayout = { desks: Desk[]; pods: Pod[]; ryan: Point; execDesk: Point };

const RYAN: Point = { x: 4.4, y: 3.2 };
const EXEC_DESK: Point = { x: 2.6, y: 5.6 };

/** Teams in a steady order, so desks don't shuffle between refreshes. */
export const TEAM_ORDER = ["Executive", "Network", "Investment", "Intelligence", "Growth", "Firm OS"];

function byId(a: DeskBot, b: DeskBot) {
  return a.id.localeCompare(b.id);
}

/** True for BV Executive, the chief of staff who takes handoffs in the glass office. */
export function isChief(bot: Pick<DeskBot, "team" | "isLead">): boolean {
  return bot.isLead && bot.team === "Executive";
}

/**
 * Desks: the Executive team sits in the glass office; every other team gets a
 * pod of facing desks in its own neon, with two spare desks each so "free desks"
 * means something. Pods flow left to right and wrap.
 */
export function buildLayout(bots: DeskBot[]): OfficeLayout {
  const desks: Desk[] = [];
  const pods: Pod[] = [];
  const rank = (team: string) => (TEAM_ORDER.includes(team) ? TEAM_ORDER.indexOf(team) : 99);
  const teams = [...new Set(bots.map((b) => b.team))].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));

  // Executive desks inside the glass office: the chief's desk, then two rows.
  const exec = bots.filter((b) => b.team === "Executive").sort((a, b) => Number(isChief(b)) - Number(isChief(a)) || byId(a, b));
  const execSpots: Point[] = [EXEC_DESK, { x: 6.6, y: 5.6 }, { x: 6.6, y: 3.0 }, { x: 2.6, y: 2.4 }, { x: 4.6, y: 6.6 }, { x: 7.6, y: 2.0 }];
  exec.slice(0, execSpots.length).forEach((bot, i) => desks.push({ id: `exec-${i}`, x: execSpots[i].x, y: execSpots[i].y, team: "Executive", owner: bot.id, facing: i % 2 ? -1 : 1, exec: true }));
  const overflow = exec.slice(execSpots.length);

  const pods_area = ZONES.find((z) => z.key === "pods")!;
  let cx = pods_area.x + 0.6;
  let cy = pods_area.y + 1.2;
  let rowH = 0;
  for (const team of teams) {
    const members = team === "Executive" ? overflow : bots.filter((b) => b.team === team).sort(byId);
    if (team === "Executive" && !members.length) continue;
    const seats = members.length + 2;
    const cols = Math.max(2, Math.ceil(seats / 2));
    const w = cols * 1.25 + 0.6;
    const h = 3.2;
    if (cx + w > pods_area.x + pods_area.w + 0.2 && cx > pods_area.x + 1) {
      cx = pods_area.x + 0.6;
      cy += rowH + 1.6;
      rowH = 0;
    }
    pods.push({ team, x: cx, y: cy, w, h });
    for (let i = 0; i < cols * 2; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const owner = members[i]?.id ?? null;
      if (i >= seats) break;
      desks.push({ id: `${team}-${i}`, x: cx + 0.6 + col * 1.25, y: cy + (row ? 2.35 : 0.85), team, owner, facing: row ? -1 : 1, exec: false });
    }
    cx += w + 1.1;
    rowH = Math.max(rowH, h);
  }
  return { desks, pods, ryan: RYAN, execDesk: EXEC_DESK };
}

/** Spots to stand or sit, filled in order, so the same bot lands in the same place each refresh. */
function spots(zone: ZoneKey): Point[] {
  const z = ZONES.find((r) => r.key === zone)!;
  const out: Point[] = [];
  if (zone === "lounge") {
    // Sofas around the film-study screen, then standing room.
    const c = { x: z.x + 4.4, y: z.y + 4.2 };
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      out.push({ x: c.x + Math.cos(a) * 2.6, y: c.y + Math.sin(a) * 2.2 });
    }
  }
  if (zone === "break") {
    for (const [tx, ty] of [[2, 3], [5, 3], [2, 6], [5, 6]]) {
      out.push({ x: z.x + tx - 0.7, y: z.y + ty }, { x: z.x + tx + 0.7, y: z.y + ty });
    }
  }
  if (zone === "lab") {
    for (let i = 0; i < 8; i++) out.push({ x: z.x + 1.4 + (i % 4) * 1.6, y: z.y + 4.6 + Math.floor(i / 4) * 1.4 });
  }
  if (zone === "exec") {
    // The handoff line in front of Ryan's chair.
    // Spaced so each bot stays easy to tap.
    // Right of Ryan's chair and clear of the chief's desk, spaced so each bot stays easy to tap.
    for (let i = 0; i < 9; i++) out.push({ x: 4.2 + (i % 3) * 1.6 + Math.floor(i / 3) * 0.4, y: 4.6 + Math.floor(i / 3) * 1.25 });
  }
  // Overflow: a loose grid across the zone.
  for (let gy = 1; gy < z.h; gy += 1.3) for (let gx = 1; gx < z.w; gx += 1.3) out.push({ x: z.x + gx, y: z.y + gy });
  return out;
}

const trim = (text: string | null | undefined, n = 64) => {
  const value = (text || "").replace(/\s+/g, " ").trim();
  return value.length > n ? `${value.slice(0, n - 1).trimEnd()}…` : value || null;
};

/**
 * Where each bot is right now, from its real status:
 * working at its desk with the screen on, paused at its desk with it off,
 * waiting on Ryan in the handoff line of the glass office, failed in the lab,
 * idle in the break room or the lounge.
 */
export function placeBots(bots: DeskBot[], layout: OfficeLayout): Map<string, Placement> {
  const out = new Map<string, Placement>();
  const deskOf = new Map(layout.desks.filter((d) => d.owner).map((d) => [d.owner!, d]));
  const used: Record<ZoneKey, number> = { exec: 0, lab: 0, pods: 0, lounge: 0, break: 0, lobby: 0 };
  const take = (zone: ZoneKey): Point => {
    const list = spots(zone);
    return list[used[zone]++ % list.length];
  };
  const idle: DeskBot[] = [];
  for (const bot of [...bots].sort(byId)) {
    const desk = deskOf.get(bot.id) ?? null;
    const at = (p: Point, place: Place, atDesk: boolean, bubble: string | null, facing: 1 | -1 = 1) => out.set(bot.id, { id: bot.id, x: p.x, y: p.y, place, desk: desk?.id ?? null, atDesk, facing, bubble });
    const status: BotStatus = bot.status;
    if (status === "Working" && desk) at({ x: desk.x, y: desk.y + (desk.facing === 1 ? -0.45 : 0.45) }, desk.exec ? "exec" : "desk", true, trim(bot.result || bot.scope) ?? "Working", desk.facing);
    else if (status === "Paused" && desk) at({ x: desk.x, y: desk.y + (desk.facing === 1 ? -0.45 : 0.45) }, desk.exec ? "exec" : "desk", true, "Paused", desk.facing);
    else if (status === "Needs Ryan") at(isChief(bot) ? { x: layout.execDesk.x, y: layout.execDesk.y - 0.45 } : take("exec"), "exec", isChief(bot), bot.decision ? `Waiting on you: ${trim(bot.decision.label, 48)}` : "Waiting on you");
    else if (status === "Failed" || status === "Degraded") at(take("lab"), "lab", false, status === "Failed" ? "Failed" : "Running rough", -1);
    else if (isChief(bot) && desk) at({ x: desk.x, y: desk.y - 0.45 }, "exec", true, null);
    else idle.push(bot);
  }
  // Idle bots: alternate the break room and the lounge, then spill onto the field.
  idle.forEach((bot, i) => {
    const desk = deskOf.get(bot.id) ?? null;
    const zone: ZoneKey = used.break < 8 && (i % 2 === 0 || used.lounge >= 10) ? "break" : used.lounge < 10 ? "lounge" : "lobby";
    const p = take(zone);
    out.set(bot.id, { id: bot.id, x: p.x, y: p.y, place: zone === "lobby" ? "lobby" : zone, desk: desk?.id ?? null, atDesk: false, facing: i % 2 ? 1 : -1, bubble: null });
  });
  return out;
}

export type OfficeCounts = { working: number; needs: number; idle: number; paused: number; failed: number; freeDesks: number; desks: number };

export function officeCounts(bots: DeskBot[], layout: OfficeLayout, places: Map<string, Placement>): OfficeCounts {
  const seated = new Set([...places.values()].filter((p) => p.atDesk && p.desk).map((p) => p.desk));
  return {
    working: bots.filter((b) => b.status === "Working").length,
    needs: bots.filter((b) => b.status === "Needs Ryan").length,
    idle: bots.filter((b) => b.status === "Idle").length,
    paused: bots.filter((b) => b.status === "Paused").length,
    failed: bots.filter((b) => b.status === "Failed" || b.status === "Degraded").length,
    desks: layout.desks.length,
    freeDesks: layout.desks.filter((d) => !seated.has(d.id)).length,
  };
}

const ROOM_TEAM: Record<string, string> = { executive: "Executive", network: "Network", investment: "Investment", intelligence: "Intelligence", growth: "Growth", firm_os: "Firm OS" };

/** Who an interaction's from/to names: a bot id, "ryan", or null when it's no one in the office. */
export function resolveParty(value: string, bots: DeskBot[]): string | null {
  const key = value.trim().toLowerCase();
  if (!key) return null;
  if (key === "ryan") return "ryan";
  const exact = bots.find((b) => b.aliases.includes(key) || b.id === key || b.name.trim().toLowerCase() === key);
  if (exact) return exact.id;
  const team = ROOM_TEAM[key.replace(/\s+/g, "_")];
  if (team) {
    const lead = bots.find((b) => b.team === team && b.isLead) ?? bots.filter((b) => b.team === team).sort(byId)[0];
    return lead?.id ?? null;
  }
  return null;
}

export type OfficeEvent = {
  key: string;
  at: string;
  kind: "sync" | "handoff";
  /** Who walks over. For a handoff to Ryan this is the only one who moves. */
  from: string;
  /** The other party: a bot id, or "ryan". */
  to: string;
  title: string;
  line: string;
};

const VERB: Record<Interaction["kind"], string> = { packet: "handed", amendment: "sent changes on", result: "sent results on", message: "messaged about" };

/**
 * A real interaction as something that happens in the office: a handoff when it
 * goes to the chief of staff or Ryan (in the glass office), otherwise a sync in
 * the lounge. Interactions with no one in the office are left out.
 */
export function eventFor(item: Interaction, bots: DeskBot[]): OfficeEvent | null {
  const from = resolveParty(item.from, bots);
  const to = resolveParty(item.to, bots);
  if (!from || !to || from === to) return null;
  const mover = from === "ryan" ? to : from;
  const other = from === "ryan" ? "ryan" : to;
  const chief = bots.find(isChief)?.id ?? null;
  const handoff = other === "ryan" || other === chief || mover === chief;
  const name = (id: string) => (id === "ryan" ? "Ryan" : bots.find((b) => b.id === id)?.name ?? id);
  const title = (item.title || "").replace(/\s+/g, " ").trim() || "an update";
  return {
    key: `${item.timestamp}|${item.from}|${item.to}|${item.kind}`,
    at: item.timestamp,
    kind: handoff ? "handoff" : "sync",
    from: mover,
    to: other,
    title,
    line: `${name(from)} ${VERB[item.kind]} ${title.length > 70 ? `${title.slice(0, 69)}…` : title} ${item.kind === "message" ? "with" : "to"} ${name(to)}`,
  };
}

/** Interactions as office events, newest first. */
export function officeEvents(items: Interaction[], bots: DeskBot[]): OfficeEvent[] {
  return items
    .map((item) => eventFor(item, bots))
    .filter((e): e is OfficeEvent => Boolean(e))
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** Two facing spots in the lounge for a sync, picked by how many syncs are already running. */
export function huddleSpots(slot: number): [Point, Point] {
  const z = ZONES.find((r) => r.key === "lounge")!;
  const c = { x: z.x + 4.4, y: z.y + 4.2 };
  const a = ((slot % 4) / 4) * Math.PI * 2 + 0.4;
  const r = 1.2;
  return [
    { x: c.x + Math.cos(a) * r - 0.5, y: c.y + Math.sin(a) * r },
    { x: c.x + Math.cos(a) * r + 0.5, y: c.y + Math.sin(a) * r },
  ];
}

/** The spot in front of the chief's desk, or Ryan's chair, for a handoff in person. */
export function handoffSpot(to: string, layout: OfficeLayout, chief: string | null): Point {
  if (to === "ryan" || !chief) return { x: layout.ryan.x + 0.9, y: layout.ryan.y + 0.9 };
  return { x: layout.execDesk.x + 1.1, y: layout.execDesk.y + 0.2 };
}

/**
 * The route between two points: out of the room through its door, along the
 * corridor, and in through the other room's door. Straight lines through glass
 * walls look cheap.
 */
export function route(from: Point, to: Point): Point[] {
  const door = (p: Point): Point | null => {
    const zone = ZONES.find((z) => z.glass && p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h);
    if (!zone) return null;
    return zone.key === "exec" ? { x: zone.x + zone.w + 0.6, y: zone.y + zone.h - 1.2 } : { x: zone.x - 0.6, y: zone.y + zone.h - 1.2 };
  };
  const path: Point[] = [];
  const out = door(from);
  const into = door(to);
  if (out) path.push(out);
  // The main aisle runs between the pods and the field.
  const aisle = 16.8;
  if (Math.abs(from.y - to.y) > 3 || out || into) {
    path.push({ x: (path.at(-1) ?? from).x, y: aisle });
    path.push({ x: (into ?? to).x, y: aisle });
  }
  if (into) path.push(into);
  path.push(to);
  return path;
}
