import assert from "node:assert/strict";
import test from "node:test";
import type { DeskBot } from "./bot-desk";
import { buildLayout, eventFor, GRID, officeCounts, officeEvents, placeBots, resolveParty, route, ZONES } from "./office-space";

function bot(id: string, team: string, status: DeskBot["status"], over: Partial<DeskBot> = {}): DeskBot {
  return {
    id, name: id.replace(/-/g, " "), team, role: null, director: null, status, statusLabel: status, registry: null, scope: null, source: null,
    result: null, usage: null, lastIso: null, relative: null, ct: null, nextRun: null, doneToday: false, stale: false, isLead: false,
    aliases: [id, id.replace(/-/g, " ")], decision: null, routines: [], handoffs: [], ...over,
  };
}

const BOTS: DeskBot[] = [
  bot("bv-executive", "Executive", "Needs Ryan", { isLead: true, decision: { id: "d1", label: "Approve the Q4 plan" } }),
  bot("email-reader", "Executive", "Needs Ryan"),
  bot("growth-director", "Growth", "Needs Ryan", { isLead: true }),
  bot("instagram-comms", "Growth", "Needs Ryan"),
  bot("deal-scout", "Investment", "Working", { result: "Read 12 decks from The Handoff" }),
  bot("memo-writer", "Investment", "Idle"),
  bot("lp-mapper", "Network", "Paused"),
  bot("intro-bot", "Network", "Idle"),
  bot("snapshot-sync", "Firm OS", "Failed"),
];

test("layout: Executive sits in the glass office, other teams get pods with spare desks, all inside the floor", () => {
  const layout = buildLayout(BOTS);
  const exec = layout.desks.filter((d) => d.exec);
  assert.equal(exec.length, 2);
  assert.equal(exec[0].owner, "bv-executive", "the chief takes the first executive desk");
  assert.deepEqual(layout.pods.map((p) => p.team), ["Network", "Investment", "Growth", "Firm OS"]);
  // Each pod has its members plus two free desks.
  assert.equal(layout.desks.filter((d) => d.team === "Investment").length, 4);
  for (const d of layout.desks) assert.ok(d.x > 0 && d.x < GRID.w && d.y > 0 && d.y < GRID.h, `${d.id} is on the floor`);
});

test("placement follows real status: desk, glass office, lab, break room or lounge", () => {
  const layout = buildLayout(BOTS);
  const places = placeBots(BOTS, layout);
  assert.equal(places.get("deal-scout")?.place, "desk");
  assert.equal(places.get("deal-scout")?.atDesk, true);
  assert.equal(places.get("deal-scout")?.bubble, "Read 12 decks from The Handoff");
  assert.equal(places.get("lp-mapper")?.bubble, "Paused");
  assert.equal(places.get("lp-mapper")?.atDesk, true);
  assert.equal(places.get("bv-executive")?.place, "exec");
  assert.match(places.get("bv-executive")?.bubble ?? "", /Waiting on you: Approve the Q4 plan/);
  assert.equal(places.get("instagram-comms")?.place, "exec");
  assert.equal(places.get("snapshot-sync")?.place, "lab");
  assert.ok(["break", "lounge"].includes(places.get("memo-writer")!.place));
  // Inside the right rooms.
  const lab = ZONES.find((z) => z.key === "lab")!;
  const p = places.get("snapshot-sync")!;
  assert.ok(p.x >= lab.x && p.x <= lab.x + lab.w && p.y >= lab.y && p.y <= lab.y + lab.h);
  // The same input lands everyone in the same place.
  assert.deepEqual([...placeBots([...BOTS].reverse(), layout).entries()].sort(), [...places.entries()].sort());
});

test("counts: real statuses, and free desks are desks nobody is sitting at", () => {
  const layout = buildLayout(BOTS);
  const counts = officeCounts(BOTS, layout, placeBots(BOTS, layout));
  assert.deepEqual({ ...counts, desks: undefined, freeDesks: undefined }, { working: 1, needs: 4, idle: 2, paused: 1, failed: 1, desks: undefined, freeDesks: undefined });
  // Seated: deal-scout, lp-mapper and the chief's desk is empty because the chief is waiting on Ryan at the desk itself.
  assert.equal(counts.freeDesks, counts.desks - 3);
});

test("interactions become syncs in the lounge or handoffs in the glass office", () => {
  assert.equal(resolveParty("growth", BOTS), "growth-director", "a room name means its lead");
  assert.equal(resolveParty("Ryan", BOTS), "ryan");
  assert.equal(resolveParty("someone outside", BOTS), null);
  const handoff = eventFor({ timestamp: "2026-11-07T15:00:00Z", from: "deal-scout", to: "executive", kind: "packet", packet_id: null, title: "Research on Snaps", status: null }, BOTS);
  assert.equal(handoff?.kind, "handoff");
  assert.equal(handoff?.from, "deal-scout");
  assert.equal(handoff?.line, "deal scout handed Research on Snaps to bv executive");
  const sync = eventFor({ timestamp: "2026-11-07T15:05:00Z", from: "intro-bot", to: "investment", kind: "message", packet_id: null, title: "Warm intro to a founder", status: null }, BOTS);
  assert.equal(sync?.kind, "sync");
  assert.equal(sync?.to, "deal-scout");
  assert.equal(eventFor({ timestamp: "x", from: "nobody", to: "growth", kind: "message", packet_id: null, title: "t", status: null }, BOTS), null);
  assert.equal(officeEvents([{ timestamp: "2026-11-07T15:00:00Z", from: "ryan", to: "growth", kind: "message", packet_id: null, title: "Ping", status: null }], BOTS)[0].from, "growth-director");
});

test("routes leave a glass room by its door and travel the aisle", () => {
  const path = route({ x: 3, y: 4 }, { x: 5, y: 20 });
  assert.equal(path.at(-1)!.y, 20);
  assert.ok(path[0].x > 9, "first stop is the executive office door");
  assert.ok(path.some((p) => p.y === 16.8), "uses the aisle");
});
