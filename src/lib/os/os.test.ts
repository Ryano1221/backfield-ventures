import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { decideOs } from "./host";
import { buildMap, displayParty, groupKey } from "./interactions";
import { buildDashboard, isFailedBot } from "./metrics";
import { STALE_AFTER_MS } from "./types";
import { LoginLimiter } from "./rate-limit";
import { validateSnapshot } from "./schema";
import { mintSessionToken, passwordsMatch, sessionSecret, verifySessionToken } from "./session";
import { readSnapshot, writeSnapshot } from "./store";
import type { Snapshot } from "./types";

const NOW = Date.parse("2026-11-03T20:00:00.000Z");

function sample(overrides: Partial<Snapshot> = {}): Snapshot {
  const result = validateSnapshot({
    generated_at: new Date(NOW - 60 * 60 * 1000).toISOString(),
    pitches: [
      {
        company: "North Sample",
        sector: "Sports",
        stage: "Seed",
        received: "2026-11-02",
        founder: "Ada Sample",
        status: "New",
        score: 8,
        source: "inbound",
        deck: "https://example.com/deck",
      },
      {
        company: "Old Sample",
        sector: "CPG",
        stage: "Series A",
        received: "2026-08-01",
        founder: "Bea Sample",
        status: "passed",
        score: null,
        source: "referral",
        deck: null,
      },
    ],
    bots: {
      built_at: "2026-11-03T13:39:59.002558-06:00",
      today: "2026-11-03",
      bots: [
        {
          name: "Sample Director",
          slug: "sample_director",
          team: "Investment",
          role: "Director",
          scope: "Scores deals",
          registry_status: "active",
          status: "Working",
          last: "Nov 3, 10:37am CT",
          last_iso: "2026-11-03T10:37:51-06:00",
          source: "heartbeat ledger",
          result: "Set a round check",
          usage_share: 8,
        },
        {
          name: "Sample Rail",
          team: "Intelligence",
          role: "Specialist",
          registry_status: "failing",
          status: "Idle",
          last: "unknown",
          last_iso: null,
          source: "unknown",
          result: "unknown",
          usage_share: null,
        },
      ],
      routines: [{ name: "Heartbeat sample", status: "Succeeded", last: "Nov 3, 11:41am CT" }],
      usage: { weekly_used_pct: 0.7, on_demand_cycle_usd: 50.46, weekly_reset: "Mon Nov 9" },
    },
    outreach: [
      { track: "athlete", sent: 20, floor: 25 },
      { track: "ig_dms", sent: 10, floor: 8, label: "IG DMs" },
    ],
    decisions: [{ title: "Reply to the sample note", since: "2026-11-03T15:00:00.000Z", link: "https://example.com/note" }],
    activity: [
      { timestamp: "2026-11-03T16:00:00.000Z", actor: "Sample Director", summary: "Logged the round check." },
    ],
    ...overrides,
  });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("fixture");
  return result.snapshot;
}

test("schema accepts the bot-office feed and normalizes pitch status", () => {
  const snapshot = sample();
  assert.equal(snapshot.pitches[0]?.status, "new");
  assert.equal(snapshot.bots.bots.length, 2);
  assert.equal(snapshot.bots.bots[1]?.usage_share, null);
  assert.equal(snapshot.bots.routines?.[0]?.name, "Heartbeat sample");
  assert.equal(snapshot.outreach[1]?.label, "IG DMs");
});

test("schema rejects a bad status, a script URL, and a missing timestamp", () => {
  const badStatus = validateSnapshot({ ...sample(), pitches: [{ ...sample().pitches[0], status: "maybe" }] });
  assert.equal(badStatus.ok, false);
  const script = validateSnapshot({
    ...sample(),
    pitches: [{ ...sample().pitches[0], deck: "javascript:alert(1)" }],
  });
  assert.equal(script.ok, false);
  const missing = validateSnapshot({ pitches: [], bots: [], outreach: [], decisions: [], activity: [] });
  assert.equal(missing.ok, false);
});

test("schema accepts a bare bot array", () => {
  const result = validateSnapshot({ ...sample(), bots: sample().bots.bots });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.snapshot.bots.bots[0]?.team, "Investment");
});

test("session cookie is signed and rejects tampering", () => {
  const secret = "test-secret";
  const token = mintSessionToken(secret, 1_700_000_000);
  assert.equal(verifySessionToken(token, secret, 1_700_000_000), true);
  assert.equal(verifySessionToken(token, "other", 1_700_000_000), false);
  assert.equal(verifySessionToken(`${token}x`, secret, 1_700_000_000), false);
  assert.equal(verifySessionToken(token, secret, 1_700_000_000 + 60 * 60 * 24 * 31), false);
  assert.equal(passwordsMatch("correct", "correct"), true);
  assert.equal(passwordsMatch("nope", "correct"), false);
  assert.equal(passwordsMatch("correct", undefined), false);
  assert.ok(sessionSecret({ OS_DASHBOARD_PASSWORD: "desk-password" }));
  assert.equal(sessionSecret({}), null);
});

test("host routing keeps the public site and locks the dashboard", () => {
  assert.equal(decideOs({ host: "backfieldventures.com", pathname: "/", authed: false, vercelEnv: "production" }).kind, "public");
  assert.equal(decideOs({ host: "www.backfieldventures.com", pathname: "/pitch", authed: false, vercelEnv: "production" }).kind, "public");
  assert.equal(decideOs({ host: "backfieldventures.com", pathname: "/os", authed: true, vercelEnv: "production" }).kind, "not-found");
  assert.equal(decideOs({ host: "backfieldventures.com", pathname: "/api/os/ingest", authed: false, vercelEnv: "production" }).kind, "not-found");
  assert.equal(decideOs({ host: "backfieldventures.com", pathname: "/fund1", authed: false, vercelEnv: "production" }).kind, "public");

  const osHome = decideOs({ host: "os.backfieldventures.com", pathname: "/", authed: false });
  assert.deepEqual(osHome, { kind: "redirect", pathname: "/login" });
  const osAuthed = decideOs({ host: "os.backfieldventures.com", pathname: "/", authed: true });
  assert.deepEqual(osAuthed, { kind: "rewrite", pathname: "/os" });
  const login = decideOs({ host: "os.localhost:3000", pathname: "/login", authed: false });
  assert.deepEqual(login, { kind: "rewrite", pathname: "/os/login" });
  assert.equal(decideOs({ host: "os.backfieldventures.com", pathname: "/pitch", authed: true }).kind, "not-found");
  assert.equal(decideOs({ host: "os.backfieldventures.com", pathname: "/api/pitch", authed: true }).kind, "not-found");
  assert.equal(decideOs({ host: "os.backfieldventures.com", pathname: "/api/os/snapshot", authed: false }).kind, "unauthorized");
  assert.deepEqual(decideOs({ host: "os.backfieldventures.com", pathname: "/api/ingest", authed: false }), {
    kind: "rewrite",
    pathname: "/api/os/ingest",
  });
  assert.equal(decideOs({ host: "os.backfieldventures.com", pathname: "/robots.txt", authed: false }).kind, "robots");

  assert.deepEqual(decideOs({ host: "preview.vercel.app", pathname: "/os", authed: false, vercelEnv: "preview" }), {
    kind: "redirect",
    pathname: "/os/login",
  });
  assert.equal(decideOs({ host: "preview.vercel.app", pathname: "/api/os/snapshot", authed: false, vercelEnv: "preview" }).kind, "unauthorized");
  assert.equal(decideOs({ host: "preview.vercel.app", pathname: "/", authed: false, vercelEnv: "preview" }).kind, "public");
  assert.equal(decideOs({ host: "localhost:3000", pathname: "/handoff", authed: false }).kind, "public");
  assert.deepEqual(decideOs({ host: "os.backfieldventures.com", pathname: "/bots", authed: true }), {
    kind: "rewrite",
    pathname: "/os/bots",
  });
  assert.deepEqual(decideOs({ host: "os.backfieldventures.com", pathname: "/bots", authed: false }), {
    kind: "redirect",
    pathname: "/login",
  });
  assert.deepEqual(decideOs({ host: "preview.vercel.app", pathname: "/os/bots", authed: false, vercelEnv: "preview" }), {
    kind: "redirect",
    pathname: "/os/login",
  });
  assert.equal(decideOs({ host: "preview.vercel.app", pathname: "/os/bots", authed: true, vercelEnv: "preview" }).kind, "os-next");
  assert.deepEqual(decideOs({ host: "os.backfieldventures.com", pathname: "/crm", authed: true }), {
    kind: "rewrite",
    pathname: "/os/crm",
  });
  assert.equal(decideOs({ host: "os.backfieldventures.com", pathname: "/api/os/decisions/answered", authed: false }).kind, "os-next");
  assert.equal(decideOs({ host: "os.backfieldventures.com", pathname: "/api/os/actions/pending", authed: false }).kind, "os-next");
  assert.equal(decideOs({ host: "preview.vercel.app", pathname: "/api/os/action", authed: false, vercelEnv: "preview" }).kind, "unauthorized");
  assert.equal(decideOs({ host: "preview.vercel.app", pathname: "/api/os/decide", authed: false, vercelEnv: "preview" }).kind, "unauthorized");
});

test("dashboard metrics flag stale snapshots and count the operating picture", () => {
  const fresh = buildDashboard(sample(), NOW);
  assert.equal(fresh.stale, false);
  assert.equal(fresh.kpis.toReview, 1);
  assert.equal(fresh.kpis.new7, 1);
  assert.equal(fresh.kpis.new30, 1);
  assert.equal(fresh.kpis.working, 1);
  assert.equal(fresh.kpis.failed, 1);
  assert.equal(fresh.kpis.tracksUnder, 1);
  assert.equal(fresh.kpis.outreachSent, 30);
  assert.equal(fresh.outreach[0]?.label, "Athlete");
  assert.equal(isFailedBot({ status: "Idle", registry_status: "failing" }), true);

  const staleAt = new Date(NOW - STALE_AFTER_MS - 1000).toISOString();
  const stale = buildDashboard({ ...sample(), generated_at: staleAt }, NOW);
  assert.equal(stale.stale, true);
  const edge = buildDashboard({ ...sample(), generated_at: new Date(NOW - STALE_AFTER_MS).toISOString() }, NOW);
  assert.equal(edge.stale, false);
  assert.equal(buildDashboard(null, NOW).hasSnapshot, false);
  assert.equal(buildDashboard(null, NOW).kpis.toReview, null);
});

test("failed logins lock after repeated attempts", () => {
  const limiter = new LoginLimiter(5, 1000, 5000);
  for (let i = 0; i < 4; i++) limiter.recordFailure("1.2.3.4", 0);
  assert.equal(limiter.check("1.2.3.4", 0).allowed, true);
  limiter.recordFailure("1.2.3.4", 0);
  assert.equal(limiter.check("1.2.3.4", 0).allowed, false);
  limiter.recordSuccess("1.2.3.4");
  assert.equal(limiter.check("1.2.3.4", 0).allowed, true);
});

test("interactions are optional and bots without a director stay in other", () => {
  const plain = validateSnapshot({ ...sample() });
  assert.equal(plain.ok, true);
  if (plain.ok) assert.deepEqual(plain.snapshot.interactions, []);

  const now = Date.parse("2026-11-03T20:00:00.000Z");
  const withHandoffs = validateSnapshot({
    ...sample(),
    bots: {
      bots: [
        { name: "FIXTURE Executive", team: "Fixture", role: "Executive", status: "Working", director: "executive" },
        { name: "FIXTURE Investor", team: "Fixture", role: "Director", status: "Working", director: "investment" },
        { name: "FIXTURE Scout", team: "Fixture", role: "Specialist", status: "Idle", director: "investment" },
        { name: "FIXTURE Loose", team: "Fixture", role: "Specialist", status: "Idle" },
      ],
    },
    interactions: [
      {
        timestamp: "2026-11-03T18:00:00.000Z",
        from: "executive",
        to: "investment",
        kind: "Packet",
        packet_id: "pkt_fixture",
        title: "FIXTURE score the sample",
        status: "open",
      },
      {
        timestamp: "2026-11-02T18:00:00.000Z",
        from: "FIXTURE Scout",
        to: "FIXTURE Investor",
        kind: "result",
        packet_id: null,
        title: "FIXTURE note",
        status: null,
      },
      {
        timestamp: "2026-10-01T18:00:00.000Z",
        from: "network",
        to: "growth",
        kind: "message",
        packet_id: null,
        title: "FIXTURE old note",
        status: "done",
      },
    ],
  });
  assert.equal(withHandoffs.ok, true);
  if (!withHandoffs.ok) return;
  assert.equal(withHandoffs.snapshot.bots.bots[1]?.director, "investment");
  const map = buildMap(withHandoffs.snapshot, now);
  assert.equal(map.executive.lead?.name, "FIXTURE Executive");
  assert.equal(map.directors.find((group) => group.key === "investment")?.specialists.length, 1);
  assert.equal(map.other.specialists.length, 1);
  assert.equal(groupKey({}), "other");
  assert.equal(map.edges.some((edge) => edge.count === 1 && edge.from === "executive" && edge.to === "investment"), true);
  assert.equal(map.edges.some((edge) => edge.from === "growth" || edge.to === "growth"), false);
  assert.equal(map.feed.length, 3);

  const badKind = validateSnapshot({
    ...sample(),
    interactions: [{ timestamp: now, from: "a", to: "b", kind: "ping", packet_id: null, title: "No", status: null }],
  });
  assert.equal(badKind.ok, false);
  const longTitle = validateSnapshot({
    ...sample(),
    interactions: [{ timestamp: "2026-11-03T18:00:00.000Z", from: "a", to: "b", kind: "message", packet_id: null, title: "x".repeat(161), status: null }],
  });
  assert.equal(longTitle.ok, false);
  const badDirector = validateSnapshot({
    ...sample(),
    bots: { bots: [{ name: "FIXTURE", team: "Fixture", status: "Idle", director: "bronze" }] },
  });
  assert.equal(badDirector.ok, false);

  const many = Array.from({ length: 40 }, (_, index) => ({
    name: `FIXTURE Bot ${index + 1}`,
    team: "Fixture",
    role: "Specialist",
    status: "Idle",
    director: ["investment", "intelligence", "network", "growth", "firm_os"][index % 5],
  }));
  const crowded = validateSnapshot({ ...sample(), bots: { bots: many } });
  assert.equal(crowded.ok, true);
  if (crowded.ok) {
    const crowdedMap = buildMap(crowded.snapshot, now);
    assert.equal(crowdedMap.other.specialists.length, 0);
    assert.equal(
      crowdedMap.directors.reduce((sum, group) => sum + group.specialists.length, 0),
      40,
    );
  }
});

test("crm lists and decision answers use only real fields", async () => {
  const { mkdtemp, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const path = await import("node:path");
  const { isHot, needsFollowUp } = await import("./crm");
  const { ackAnswers, exactMessageHash, readAnswers, recordAnswer } = await import("./answers");
  const now = Date.parse("2026-11-03T20:00:00.000Z");
  const due = { id: "1", name: "A", firm: null, track: "investor" as const, stage: "Talking", owner: null, last_touch_at: null, last_touch_channel: null, next_step: "Call", next_step_due: "2026-11-01", email: null, linkedin: null, notes: null };
  const recent = { ...due, id: "2", last_touch_at: "2026-11-02T12:00:00.000Z", next_step_due: null };
  assert.equal(needsFollowUp(due, now), true);
  assert.equal(needsFollowUp(recent, now), false);
  assert.equal(isHot(recent, now), true);
  assert.equal(isHot(due, now), false);
  const bare = validateSnapshot({ ...sample() });
  assert.equal(bare.ok, true);
  if (bare.ok) assert.deepEqual(bare.snapshot.crm.people, []);

  const dir = await mkdtemp(path.join(tmpdir(), "bfv-dec-"));
  const env = { OS_SNAPSHOT_FILE: path.join(dir, "snap.json") };
  try {
    assert.equal(await recordAnswer({ decision_id: "d1", choice: "yes", note: null, decided_at: "2026-11-03T20:00:00.000Z", exact_message_hash: exactMessageHash("Send this") }, env), "stored");
    assert.equal(await recordAnswer({ decision_id: "d1", choice: "no", note: null, decided_at: "2026-11-03T20:01:00.000Z", exact_message_hash: null }, env), "duplicate");
    assert.deepEqual(await ackAnswers(["d1"], env), ["d1"]);
    assert.equal((await readAnswers(env))[0]?.acked_at != null, true);
    assert.deepEqual(await ackAnswers(["d1"], env), []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("handoff parties use display names for director keys only", () => {
  assert.equal(displayParty("investment"), "Investment");
  assert.equal(displayParty("intelligence"), "Intelligence");
  assert.equal(displayParty("network"), "Network");
  assert.equal(displayParty("growth"), "Growth");
  assert.equal(displayParty("firm_os"), "Firm OS");
  assert.equal(displayParty("executive"), "BV Executive");
  assert.equal(displayParty("ryan"), "Ryan");
  assert.equal(displayParty("  Executive "), "BV Executive");
  assert.equal(displayParty("FIXTURE Scout"), "FIXTURE Scout");
});

test("file snapshot round trip stays empty without a fixture in production", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "bfv-os-"));
  const file = path.join(dir, "snapshot.json");
    const env = { OS_SNAPSHOT_FILE: file };
  try {
    assert.equal(await readSnapshot(env), null);
    const snapshot = sample();
    await writeSnapshot(snapshot, env);
    const stored = await readSnapshot(env);
    assert.equal(stored?.pitches[0]?.company, "North Sample");
    assert.equal(stored?.bots.bots.length, 2);

    const blocked = await readSnapshot({
      OS_DASHBOARD_FIXTURES: "1",
      VERCEL_ENV: "production",
      OS_SNAPSHOT_FILE: path.join(dir, "missing.json"),
    });
    assert.equal(blocked, null);

    const fixture = await readSnapshot({
      OS_DASHBOARD_FIXTURES: "1",
      VERCEL_ENV: "preview",
      OS_SNAPSHOT_FILE: path.join(dir, "missing.json"),
    });
    assert.equal(fixture?.pitches[0]?.company, "FIXTURE Northwind Sample");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
