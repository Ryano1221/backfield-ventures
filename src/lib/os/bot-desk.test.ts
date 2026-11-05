import assert from "node:assert/strict";
import test from "node:test";
import { buildBotDesk, isDoneToday, isOverdueRoutine, isStaleBot, relativeTime, STALE_AFTER_MS, summaryCounts } from "./bot-desk";
import { validateSnapshot } from "./schema";
import type { DeskBot } from "./bot-desk";
import type { Snapshot } from "./types";

const NOW = Date.parse("2026-11-03T22:00:00.000Z");

test("summary counts needs, work, today, stale, and failed routines", () => {
  const desk = buildBotDesk(sample(), [], NOW);
  assert.equal(desk.summary.needs, 1);
  assert.equal(desk.summary.working, 1);
  assert.equal(desk.summary.idle, 1);
  assert.equal(desk.summary.paused, 1);
  assert.equal(desk.summary.doneToday, 2);
  assert.equal(desk.summary.stale, 1);
  assert.equal(desk.summary.failedRoutines, 1);
  assert.equal(desk.bots.find((bot) => bot.name === "Network Director")?.stale, false);
  assert.equal(desk.bots.find((bot) => bot.name === "Quiet Scout")?.stale, true);
  assert.equal(desk.bots.find((bot) => bot.name === "Paused Seat")?.stale, false);
  assert.equal(desk.bots.find((bot) => bot.name === "Quiet Scout")?.doneToday, false);
  const link = desk.bots.find((bot) => bot.name === "Network Director")?.decision;
  assert.equal(link?.id, "dec_sample");
  assert.match(link?.label || "", /Ada/);
  assert.equal(link?.label.includes("dec_sample"), false);
  assert.equal(JSON.stringify(desk).includes("pkt_hidden"), false);
  assert.equal(JSON.stringify(desk.feed).includes("fixture_network"), false);
});

test("stale is only an active bot with last activity more than 48 hours ago", () => {
  const recent = NOW - 2 * 60 * 60 * 1000;
  const old = NOW - STALE_AFTER_MS - 60_000;
  const edge = NOW - STALE_AFTER_MS;
  assert.equal(isStaleBot({ status: "Working", lastIso: new Date(old).toISOString() }, NOW), true);
  assert.equal(isStaleBot({ status: "Needs Ryan", lastIso: new Date(old).toISOString() }, NOW), true);
  assert.equal(isStaleBot({ status: "Working", lastIso: new Date(recent).toISOString() }, NOW), false);
  assert.equal(isStaleBot({ status: "Working", lastIso: new Date(edge).toISOString() }, NOW), false);
  assert.equal(isStaleBot({ status: "Paused", lastIso: new Date(old).toISOString() }, NOW), false);
  assert.equal(isStaleBot({ status: "Idle", lastIso: null }, NOW), false);
  assert.equal(isDoneToday(new Date(NOW).toISOString(), NOW), true);
  assert.equal(isDoneToday("2026-11-02T18:00:00.000Z", NOW), false);
  assert.equal(relativeTime(new Date(NOW - 2 * 60 * 60 * 1000).toISOString(), NOW), "2h ago");
  assert.equal(isOverdueRoutine({ status: "Succeeded", next: new Date(NOW - 60_000).toISOString() }, NOW), true);
  assert.equal(isOverdueRoutine({ status: "Succeeded", next: "not a date" }, NOW), false);
});

test("summaryCounts adds the buckets it is given", () => {
  const counts = summaryCounts(
    [
      stub("Needs Ryan", true, false),
      stub("Working", true, true),
      stub("Idle", false, false),
      stub("Paused", false, false),
    ],
    [{ failed: true }, { failed: false }],
  );
  assert.deepEqual(counts, { needs: 1, working: 1, idle: 1, paused: 1, doneToday: 2, stale: 1, failedRoutines: 1, degraded: 0, failed: 0 });
});

function stub(status: DeskBot["status"], doneToday: boolean, stale: boolean): Pick<DeskBot, "status" | "doneToday" | "stale"> {
  return { status, doneToday, stale };
}

function sample(): Snapshot {
  return {
    generated_at: new Date(NOW).toISOString(),
    pitches: [],
    outreach: [],
    crm: { people: [] },
    decisions: [
      {
        id: "dec_sample",
        title: "Email reply to Ada",
        since: "2026-11-03T12:00:00.000Z",
        link: null,
        context: "Waiting.",
        requested_by: "Network Director",
        created_at: "2026-11-03T20:00:00.000Z",
      },
    ],
    activity: [
      { timestamp: "2026-11-03T21:00:00.000Z", actor: "Network Director", summary: "Left the sample note for your yes." },
      { timestamp: "2026-11-03T21:30:00.000Z", actor: "fixture_network", summary: "Hidden slug actor." },
    ],
    interactions: [
      {
        timestamp: "2026-11-03T20:30:00.000Z",
        from: "network",
        to: "ryan",
        kind: "packet",
        packet_id: "pkt_hidden",
        title: "Sample note",
        status: "draft",
      },
    ],
    bots: {
      built_at: new Date(NOW).toISOString(),
      usage: { weekly_used_pct: 0.7, on_demand_cycle_usd: 12, weekly_reset: "Mon Nov 9" },
      routines: [
        { name: "Network digest", status: "Failed", last: "2026-11-03T16:00:00.000Z" },
        { name: "Investment score", status: "Succeeded", next: "2026-11-01T12:00:00.000Z" },
        { status: "Failed" },
      ],
      bots: [
        {
          name: "Network Director",
          slug: "network",
          team: "Network",
          role: "Director",
          status: "Needs Ryan",
          result: "The sample note is waiting on your yes.",
          last_iso: "2026-11-03T20:00:00.000Z",
          usage_share: 11,
          director: "network",
          scope: "Replies",
          registry_status: "active",
          source: "fixture",
        },
        {
          name: "Working Seat",
          slug: "working_seat",
          team: "Growth",
          role: "Specialist",
          status: "Working",
          result: "Scored the inbound pile.",
          last_iso: "2026-11-03T18:00:00.000Z",
          director: "growth",
        },
        {
          name: "Quiet Scout",
          slug: "quiet_scout",
          team: "Intelligence",
          role: "Specialist",
          status: "Idle",
          last_iso: "2026-10-30T15:00:00.000Z",
          director: "intelligence",
        },
        {
          name: "Paused Seat",
          slug: "paused_seat",
          team: "Firm OS",
          role: "Specialist",
          status: "Paused",
          last_iso: "2026-10-01T15:00:00.000Z",
          director: "firm_os",
        },
      ],
    },
  };
}

test("degraded and failed bots keep a text pill, and optional post and schedule fields survive", () => {
  const base = sample();
  const note = "F".repeat(500);
  const desk = buildBotDesk({
    ...base,
    bots: {
      ...base.bots,
      bots: [
        { ...base.bots.bots[0]!, name: "Fixture Degraded", status: "Degraded", next_run: "Nov 9 9:00am CT" },
        { ...base.bots.bots[0]!, name: "Fixture Failed", status: "Failed" },
      ],
    },
  }, [], NOW);
  const degraded = desk.bots.find((bot) => bot.name === "Fixture Degraded");
  assert.equal(degraded?.status, "Degraded");
  assert.equal(degraded?.statusLabel, "Degraded");
  assert.equal(degraded?.nextRun, "Nov 9 9:00am CT");
  assert.equal(desk.bots.find((bot) => bot.name === "Fixture Failed")?.statusLabel, "Failed");
  assert.equal(desk.summary.degraded, 1);
  assert.equal(desk.summary.failed, 1);
  const parsed = validateSnapshot({
    ...base,
    posts: [{ id: "post_sample", platform: "x", status: "brand_pass", gate: "Brand check pending" }],
    schedule: [{ platform: "linkedin", item: "FIXTURE sample post", note: `${note}EXTRA` }],
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.snapshot.posts?.[0]?.gate, "Brand check pending");
  assert.equal(parsed.snapshot.schedule?.[0]?.note?.length, 500);
  const absent = validateSnapshot(base);
  assert.equal(absent.ok, true);
  if (absent.ok) {
    assert.equal(absent.snapshot.posts, undefined);
    assert.equal(absent.snapshot.schedule, undefined);
  }
});
