import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { normalizeDecidePayload } from "./actions";
import { waitingOnYou } from "./nav";
import { buildToday, ctDate, plainBotText, stageChipCount, summarizeBotResult } from "./night";
import { validateSnapshot } from "./schema";
import type { Decision, Snapshot } from "./types";

const sample = (): Snapshot => JSON.parse(readFileSync(path.join(process.cwd(), "src/fixtures/os-dashboard.sample.json"), "utf8"));
const NOW = Date.parse("2026-11-05T17:00:00.000Z");

test("Not now only sends a choice the server accepts", () => {
  const snapshot = sample();
  const bare: Decision = { ...snapshot.decisions[0], id: "bare-1", options: [] } as Decision;
  const model = buildToday({ ...snapshot, decisions: [bare] }, [], NOW);
  const card = [...model.ready, ...model.hold, ...model.open].find((item) => item.id === "bare-1");
  assert.ok(card);
  if (card.notNow.kind === "decide") {
    const result = normalizeDecidePayload(bare, { choice: card.notNow.choice });
    assert.equal(result.ok, true, `server refused ${card.notNow.choice}`);
  }
  const withOptions: Decision = { ...bare, id: "opts-1", options: [{ value: "approve", label: "Approve" }, { value: "later", label: "Later" }] } as Decision;
  const model2 = buildToday({ ...snapshot, decisions: [withOptions] }, [], NOW);
  const card2 = [...model2.ready, ...model2.hold, ...model2.open][0];
  assert.deepEqual(card2?.notNow, { kind: "decide", choice: "later" });
});

test("waitingOnYou counts a bot with a card once", () => {
  const count = waitingOnYou({
    ready: [{ requestedBy: "Growth Director" }],
    hold: [],
    open: [{ requestedBy: null }],
    waiting: [{ name: "growth director" }, { name: "Example Reader" }],
  });
  assert.deepEqual(count, { cards: 2, bots: 1, total: 3 });
});

test("bot asks drop packet ids and file names", () => {
  assert.equal(plainBotText("Email double opt-in on or off (SCOPE.md pkt_00000001) still open"), "Email double opt-in on or off still open");
  assert.equal(plainBotText("Correction DM unanswered per pkt_00000002 (11/4 2:11pm CT)"), "Correction DM unanswered (11/4 2:11pm CT)");
  assert.equal(plainBotText("Call Wed 11/18 9:30am CT (Example Co)"), "Call Wed 11/18 9:30am CT (Example Co)");
});

test("long bot results cut at a word with one ellipsis", () => {
  const out = summarizeBotResult("alpha beta gamma delta ".repeat(20));
  assert.ok(out.length <= 160);
  assert.ok(out.endsWith("…"));
  assert.ok(!out.endsWith(" …"));
  assert.equal((out.match(/…/g) || []).length, 1);
  assert.match(out.slice(0, -1), /(alpha|beta|gamma|delta)$/);
});

test("stage chips follow the track filter, LP included", () => {
  const rows = [
    { imIn: true, track: "investor", lp: true, stage: "call_held" },
    { imIn: false, track: "investor", lp: false, stage: "call_held" },
    { imIn: false, track: "founder", lp: false, stage: "intro" },
  ];
  assert.equal(stageChipCount(rows, "lp", "call_held"), 1);
  assert.equal(stageChipCount(rows, "investor", "call_held"), 2);
  assert.equal(stageChipCount(rows, "founder", "all"), 1);
  assert.equal(stageChipCount(rows, "lp", "im_in"), 1);
});

test("snapshot keeps outreach freshness, warmups, briefs, and send state", () => {
  const base = sample();
  const result = validateSnapshot({
    ...base,
    outreach: [{ track: "athlete", sent: 3, floor: 10, as_of: "2026-11-05", last_send_date: "2026-11-05", base_floor: 8, floor_source: "make-up" }],
    warmups: [{ name: "Example Target", when_ct: "before noon" }, { nope: true }],
    briefs: [{ name: "Example Call", note: "Sample brief." }],
    answered_decisions: [{ id: "a1", send_state: "approved_waiting", send_at_ct: "4:30pm CT" }, { id: "a2", send_state: "bogus" }],
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.snapshot.outreach[0]?.as_of, "2026-11-05");
  assert.equal(result.snapshot.outreach[0]?.base_floor, 8);
  assert.equal(result.snapshot.warmups?.length, 1);
  assert.equal(result.snapshot.briefs?.[0]?.note, "Sample brief.");
  assert.equal(result.snapshot.answered_decisions?.[0]?.send_state, "approved_waiting");
  assert.equal(result.snapshot.answered_decisions?.[1]?.send_state, undefined);
});

test("outreach counts from another day are marked stale", () => {
  const base = sample();
  assert.equal(ctDate(NOW), "2026-11-05");
  const fresh = buildToday({ ...base, outreach: [{ track: "athlete", sent: 3, floor: 10, as_of: "2026-11-05" }] }, [], NOW);
  const old = buildToday({ ...base, outreach: [{ track: "athlete", sent: 3, floor: 10, as_of: "2026-11-04" }] }, [], NOW);
  assert.equal(fresh.kpis.find((kpi) => kpi.label === "Outreach today")?.stale, false);
  assert.equal(old.kpis.find((kpi) => kpi.label === "Outreach today")?.stale, true);
});

test("the tower puts every bot somewhere and narrates each floor", async () => {
  const { buildBotDesk } = await import("./bot-desk");
  const { buildTower } = await import("./tower");
  const snapshot = sample();
  const desk = buildBotDesk(snapshot, [], NOW);
  const floors = buildTower(desk.bots, snapshot.interactions, NOW);
  assert.ok(floors.length > 1);
  assert.equal(floors.reduce((sum, floor) => sum + floor.bots.length, 0), desk.bots.length);
  assert.equal(floors[0]?.level, floors.length);
  for (const floor of floors) assert.ok(floor.log.length > 0);
  const flagged = floors.flatMap((floor) => floor.bots).filter((bot) => bot.spot === "ryan");
  assert.equal(flagged.length, desk.bots.filter((bot) => bot.status === "Needs Ryan").length);
  const text = JSON.stringify(floors);
  assert.equal(/pkt_/.test(text), false);
});
