import assert from "node:assert/strict";
import test from "node:test";
import { aggregateEdges, buildFlow, filterHandoffs, flowLines, inFlowWindow, presentHandoffs, WEEK_MS } from "./flow";
import type { DeskBot } from "./bot-desk";
import type { Interaction, InteractionKind } from "./types";

const NOW = Date.parse("2026-11-04T05:30:00.000Z");

test("aggregateEdges counts each direction and drops a team handing off to itself", () => {
  const handoffs = presentHandoffs(
    [
      item("2026-11-03T15:00:00-06:00", "executive", "network"),
      item("2026-11-03T15:05:00-06:00", "executive", "network"),
      item("2026-11-03T15:10:00-06:00", "network", "executive"),
      item("2026-11-03T15:15:00-06:00", "executive", "executive"),
      item("2026-11-03T15:20:00-06:00", "growth", "executive"),
    ],
    [],
  );
  const edges = aggregateEdges(handoffs);
  assert.deepEqual(
    edges.map((edge) => [edge.from, edge.to, edge.count]),
    [
      ["executive", "network", 2],
      ["growth", "executive", 1],
      ["network", "executive", 1],
    ],
  );
  assert.equal(edges.some((edge) => edge.from === edge.to), false);
  assert.equal(edges[0]?.handoffs.length, 2);
  assert.ok(edges[0]!.handoffs[0]!.ms <= edges[0]!.handoffs[1]!.ms);
});

test("filterWindow keeps Chicago today, the past 7 days, and every real timestamp", () => {
  const rows = [
    { id: "today-evening", ms: Date.parse("2026-11-03T22:00:00-06:00") },
    { id: "today-late", ms: Date.parse("2026-11-04T05:00:00.000Z") },
    { id: "next-ct-day", ms: Date.parse("2026-11-04T06:30:00.000Z") },
    { id: "yesterday", ms: Date.parse("2026-11-02T18:00:00.000Z") },
    { id: "week-edge", ms: NOW - WEEK_MS },
    { id: "older", ms: NOW - WEEK_MS - 60_000 },
    { id: "soon", ms: NOW + 30_000 },
    { id: "future", ms: NOW + 2 * 60_000 },
  ];
  assert.deepEqual(
    filterHandoffs(rows, "today", NOW).map((row) => row.id),
    ["today-evening", "today-late", "soon", "future"],
  );
  assert.equal(filterHandoffs(rows, "today", NOW).some((row) => row.id === "next-ct-day"), false);
  assert.deepEqual(
    filterHandoffs(rows, "week", NOW).map((row) => row.id),
    ["today-evening", "today-late", "yesterday", "week-edge", "soon"],
  );
  assert.equal(filterHandoffs(rows, "all", NOW).length, rows.length);
  assert.equal(inFlowWindow(Number.NaN, "all", NOW), false);
  assert.equal(filterHandoffs([{ id: "bad", ms: Number.NaN }], "all", NOW).length, 0);
});

test("top flows read as plain directed sentences", () => {
  const counts: [string, string, number][] = [
    ["executive", "network", 25],
    ["executive", "firm_os", 23],
    ["investment", "executive", 22],
    ["growth", "executive", 20],
    ["network", "executive", 16],
    ["intelligence", "network", 2],
  ];
  const interactions: Interaction[] = [];
  for (const [from, to, count] of counts) {
    for (let i = 0; i < count; i++) interactions.push(item("2026-11-03T15:00:00-06:00", from, to, "packet", `FIXTURE ${from} ${to} ${i}`));
  }
  interactions.push(item("2026-11-03T16:00:00-06:00", "growth", "network", "result", "FIXTURE mixed result"));
  interactions.push(item("2026-11-03T16:05:00-06:00", "growth", "network", "message", "FIXTURE mixed message"));
  const edges = aggregateEdges(presentHandoffs(interactions, []));
  const lines = flowLines(edges);
  assert.equal(lines[0], "Executive sent Network 25 packets");
  assert.equal(lines[1], "Executive sent Firm OS 23 packets");
  assert.equal(lines[2], "Investment sent Executive 22 packets");
  assert.equal(lines[3], "Growth sent Executive 20 packets");
  assert.equal(lines[4], "Network sent Executive 16 packets");
  assert.equal(lines.length, 5);
  assert.equal(
    flowLines(edges, 20).find((line) => line.startsWith("Growth sent Network")),
    "Growth sent Network 2 handoffs",
  );
  const one = aggregateEdges(presentHandoffs([item("2026-11-03T15:00:00-06:00", "network", "growth", "message", "FIXTURE one note")], []));
  assert.deepEqual(flowLines(one), ["Network sent Growth 1 message"]);
});

test("buildFlow sizes teams from bots and filters the window", () => {
  const bots = [
    bot("exec", "Executive", "Working"),
    bot("net", "Network", "Needs Ryan"),
    bot("net-2", "Network", "Paused"),
    bot("firm", "Firm OS", "Idle"),
  ];
  const interactions = [
    item("2026-11-03T18:00:00-06:00", "executive", "network", "packet", "FIXTURE today packet"),
    item("2026-11-02T12:00:00-06:00", "executive", "firm_os", "packet", "FIXTURE yesterday packet"),
    item("2026-10-01T12:00:00-06:00", "network", "firm_os", "result", "FIXTURE old result"),
    item("not-a-date", "executive", "network", "packet", "FIXTURE dropped"),
    item("2026-11-03T19:00:00-06:00", "mystery", "network", "packet", "FIXTURE unknown sender"),
  ];
  const today = buildFlow(interactions, bots, "today", NOW);
  assert.equal(today.handoffs.length, 1);
  assert.equal(today.edges.length, 1);
  assert.equal(today.edges[0]?.count, 1);
  assert.deepEqual(
    today.nodes.map((node) => [node.key, node.count, node.counts.working, node.counts.needs, node.counts.paused, node.counts.idle]),
    [
      ["executive", 1, 1, 0, 0, 0],
      ["network", 2, 0, 1, 1, 0],
      ["firm_os", 1, 0, 0, 0, 1],
    ],
  );
  const week = buildFlow(interactions, bots, "week", NOW);
  assert.equal(week.handoffs.length, 2);
  assert.equal(week.edges.find((edge) => edge.to === "firm_os")?.count, 1);
  const all = buildFlow(interactions, bots, "all", NOW);
  assert.equal(all.handoffs.length, 3);
  assert.equal(all.edges.find((edge) => edge.from === "network" && edge.to === "firm_os")?.handoffs[0]?.kindLabel, "Result");
  assert.equal(all.edges.find((edge) => edge.from === "network")?.handoffs[0]?.status, "Open");
  assert.equal(JSON.stringify(all).includes("mystery"), false);
  assert.equal(JSON.stringify(all).includes("not-a-date"), false);
});

function item(
  timestamp: string,
  from: string,
  to: string,
  kind: InteractionKind = "packet",
  title = "FIXTURE sample handoff",
): Interaction {
  return { timestamp, from, to, kind, packet_id: null, title, status: "open" };
}

function bot(id: string, team: string, status: DeskBot["status"]): DeskBot {
  return {
    id,
    name: id,
    team,
    role: null,
    director: null,
    status,
    statusLabel: status === "Needs Ryan" ? "Needs you" : status,
    registry: null,
    scope: null,
    source: null,
    result: null,
    usage: null,
    lastIso: null,
    relative: null,
    ct: null,
    doneToday: false,
    stale: false,
    isLead: false,
    aliases: [id],
    decision: null,
    routines: [],
    handoffs: [],
  };
}
