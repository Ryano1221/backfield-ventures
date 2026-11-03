import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { decideOs } from "./host";
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
