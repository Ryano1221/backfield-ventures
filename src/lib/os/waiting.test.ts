import assert from "node:assert/strict";
import test from "node:test";
import { buildFinder } from "./finder";
import { decisionNeedsPickup, PICKUP_LINE, ratingNeedsPickup, waitingActions, waitingNewestFirst, waitingTitle, waitingWho } from "./waiting";
import type { OsAction, Snapshot } from "./types";

test("search uses the people stage words", () => {
  const snapshot = {
    generated_at: "2026-11-04T18:00:00.000Z",
    pitches: [],
    bots: { bots: [] },
    outreach: [],
    decisions: [],
    activity: [],
    interactions: [],
    crm: { people: [{ id: "p1", name: "Ada", firm: "Harbor", track: "investor", stage: "im_in", owner: null, last_touch_at: null, last_touch_channel: null, next_step: null, next_step_due: null, email: null, linkedin: null, notes: null }] },
  } as Snapshot;
  const person = buildFinder(snapshot).find((item) => item.kind === "person");
  assert.equal(person?.hint, "Harbor · I'm in");
  assert.equal(person?.hint.includes("im_in"), false);
});

test("yes, no, reply, swap, and a rating say they are waiting on the office", () => {
  const yes = action("decide", "dec-1", { choice: "yes" });
  const swap = action("decide", "dec-2", { choice: "swap" });
  const edit = action("decide", "dec-3", { choice: "edit" });
  const acked = { ...action("decide", "dec-4", { choice: "no" }), acked_at: "2026-11-04T19:00:00.000Z", status: "done" as const };
  const rate = action("rate", "pitch_example", { rating: "great" });
  const actions = [yes, swap, edit, acked, rate];
  assert.equal(decisionNeedsPickup(actions, "dec-1"), true);
  assert.equal(decisionNeedsPickup(actions, "dec-2"), true);
  assert.equal(decisionNeedsPickup(actions, "dec-3"), false);
  assert.equal(decisionNeedsPickup(actions, "dec-4"), false);
  assert.equal(ratingNeedsPickup(actions, "pitch_example"), true);
  assert.equal(waitingActions(actions).some((row) => row.target_id === "dec-4"), false);
  const local = { ...action("decide", "dec-1", { choice: "approve" }), action_id: "local:abc" };
  assert.equal(waitingActions([local]).length, 0);
  assert.equal(waitingTitle(action("crm_stage", "fix-ada", { stage: "call_held" })), "Stage");
  assert.equal(waitingTitle(action("crm_stage", "fix-ada", { stage: "call_held" })).includes("fix-ada"), false);
  const named = waitingWho(action("crm_stage", "p1", { stage: "call_held" }), {
    generated_at: "2026-11-04T18:00:00.000Z",
    pitches: [],
    bots: { bots: [] },
    outreach: [],
    decisions: [],
    activity: [],
    interactions: [],
    crm: { people: [{ id: "p1", name: "Ada Sample", firm: null, track: "investor", stage: "call_held", owner: null, last_touch_at: null, last_touch_channel: null, next_step: null, next_step_due: null, email: null, linkedin: null, notes: null }] },
  });
  assert.equal(named, "Ada Sample");
  const bots = { generated_at: "2026-11-04T18:00:00.000Z", pitches: [], bots: { bots: [{ name: "Growth Director", slug: "growth-director", team: "Growth", status: "Working" }] }, outreach: [], decisions: [], activity: [], interactions: [], crm: { people: [] } } as unknown as Snapshot;
  assert.equal(waitingWho(action("bot_pause", "growth-director", {}), bots), "Growth Director");
  assert.equal(waitingWho(action("bot_resume", "Some Bot", {}), null), "Some Bot");
  assert.equal(waitingWho(action("free_text", "executive", { text: "hi" }), bots), "The office");
  const older = { ...action("bot_pause", "a", {}), action_id: "old", created_at: "2026-11-04T10:00:00.000Z" };
  const newer = { ...action("bot_resume", "a", {}), action_id: "new", created_at: "2026-11-04T12:00:00.000Z" };
  assert.deepEqual(waitingNewestFirst([older, newer]).map((row) => row.action_id), ["new", "old"]);
  assert.equal(PICKUP_LINE, "Saved. The office has not picked this up yet.");
});

function action(type: OsAction["type"], target: string, payload: OsAction["payload"]): OsAction {
  return {
    action_id: `${type}-${target}`,
    type,
    target_id: target,
    payload,
    created_at: "2026-11-04T18:00:00.000Z",
    idempotency_key: `${type}:${target}:1`,
    acked_at: null,
    result: null,
    status: "pending",
  };
}
