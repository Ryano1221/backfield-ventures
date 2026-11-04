import assert from "node:assert/strict";
import test from "node:test";
import { botActivity, botDetail, countLine, rosterGroups } from "./roster";
import type { OfficeBot, OfficeData, OfficeEvent } from "./night";

test("roster puts Needs you first and keeps the map's team order", () => {
  const data = office([
    bot("growth-1", "Growth Specialist", "Growth", "Specialist", "Working"),
    bot("net", "Network Director", "Network", "Director", "Needs Ryan"),
    bot("exec", "BV Executive", "Executive", "Executive", "Idle"),
    bot("intel", "Intelligence Director", "Intelligence", "Director", "Paused"),
    bot("spec", "Network Scout", "Network", "Specialist", "Needs Ryan"),
  ]);
  const groups = rosterGroups(data);
  assert.deepEqual(
    groups.map((group) => group.name),
    ["Needs you", "Intelligence", "Executive", "Network", "Growth"],
  );
  assert.deepEqual(
    groups[0]?.bots.map((item) => item.name),
    ["Network Director", "Network Scout"],
  );
  assert.deepEqual(
    groups.find((group) => group.name === "Network")?.bots.map((item) => item.name),
    ["Network Director", "Network Scout"],
  );
  assert.equal(groups.find((group) => group.name === "Network")?.counts.needs, 2);
  assert.equal(groups.find((group) => group.name === "Intelligence")?.counts.paused, 1);
  assert.equal(countLine(groups[0]!.counts), "0 working · 2 needs you · 0 idle · 0 paused");
});

test("a bot row prefers what it is doing, then the latest handoff in CT", () => {
  const names = new Map([
    ["net", "Network Director"],
    ["inv", "Investment Director"],
  ]);
  const working = bot("net", "Network Director", "Network", "Director", "Working", "Drafting the sample note.");
  assert.equal(botActivity(working, [handoff("inv", "net", "Earlier")], names), "Drafting the sample note.");

  const quiet = bot("net", "Network Director", "Network", "Director", "Idle", "");
  const events = [
    handoff("inv", "net", "Score Northwind", "2026-11-02T17:50:00.000Z", "Nov 2, 11:50am CT"),
    handoff("net", "inv", "Packet draft", "2026-11-03T17:50:00.000Z", "Nov 3, 11:50am CT"),
  ];
  assert.equal(botActivity(quiet, events, names), "To Investment Director: Packet draft · Nov 3, 11:50am CT");
  const detail = botDetail(quiet, events, names);
  assert.equal(detail.rows.some((row) => row.label === "Now"), false);
  assert.equal(detail.handoffs[0]?.text, "To Investment Director: Packet draft");
  assert.match(detail.handoffs[0]?.at || "", /Nov 3, 11:50am/);
});

function office(bots: OfficeBot[]): OfficeData {
  return { built: "2026-11-03T18:00:00.000Z", built_ct: "Nov 3, 12:00pm CT", bots, events: [] };
}

function bot(slug: string, name: string, team: string, role: string, status: OfficeBot["status"], result = "Working the desk."): OfficeBot {
  return {
    slug,
    name,
    team,
    role,
    status,
    statusLabel: status === "Needs Ryan" ? "Needs you" : status,
    last: "Nov 3, 12:00pm CT",
    result,
    scope: "Sample job",
    source: "",
    usage: null,
  };
}

function handoff(from: string, to: string, title: string, ts = "2026-11-03T17:50:00.000Z", at = "Nov 3, 11:50am CT"): OfficeEvent {
  return { ts, at, f: from, t: to, kind: "packet", status: "draft", title, full: title };
}
