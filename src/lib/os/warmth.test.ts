import assert from "node:assert/strict";
import test from "node:test";
import { warmth } from "./warmth";

const NOW = Date.parse("2026-11-06T15:00:00.000Z");

test("a booked call from last week is hot; the same person a month later is cooling and going cold", () => {
  const fresh = warmth("call_booked", "2026-11-02T15:00:00.000Z", NOW);
  assert.equal(fresh.score, 86);
  assert.equal(fresh.band, "hot");
  assert.equal(fresh.goingCold, false);
  const stale = warmth("call_booked", "2026-08-01T15:00:00.000Z", NOW);
  assert.equal(stale.band, "cooling");
  assert.equal(stale.goingCold, true);
});

test("passed and do-not-contact are always cold; never-touched queued people are cold but not 'going cold'", () => {
  assert.equal(warmth("passed", "2026-11-05", NOW).score, 0);
  assert.equal(warmth("dnc", "2026-11-05", NOW).band, "cold");
  const queued = warmth("queued", null, NOW);
  assert.equal(queued.band, "cold");
  assert.equal(queued.goingCold, false);
});

test("people rows carry warmth from the snapshot", async () => {
  const { buildPeople } = await import("./night");
  const snap = {
    generated_at: "2026-11-06T15:00:00.000Z",
    pitches: [], bots: { bots: [] }, outreach: [], decisions: [], activity: [], interactions: [],
    crm: { people: [{ id: "a", name: "Ana", firm: null, track: "investor", stage: "call_held", owner: null, last_touch_at: "2026-09-01T15:00:00.000Z", last_touch_channel: null, next_step: null, next_step_due: null, email: null, linkedin: null, notes: null }] },
  } as unknown as Parameters<typeof buildPeople>[0];
  const row = buildPeople(snap).rows[0];
  assert.equal(row.goingCold, true);
  assert.equal(row.daysQuiet, 66);
  assert.equal(row.band, "cooling");
});
