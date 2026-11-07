import assert from "node:assert/strict";
import test from "node:test";
import { EMPTY_BOOK, type Lead } from "./leads/types";
import { applyOutreachOp, makeEnrollment, mergeRun, writtenSteps } from "./outreach/book";
import { runOutreach, type EngineDeps, type Mailer } from "./outreach/engine";
import { accessToken, rawMessage, sendMail, threadReply, type Fetch } from "./outreach/gmail";
import { autoEligible, buildSteps, dailyCap, inSendWindow, isOptOut, LP_FORBIDDEN, nextStep, OPT_OUT, shouldPause, templateSteps, zoneFor } from "./outreach/plan";
import { DEFAULT_SETTINGS, EMPTY_OUTREACH, type OutreachBook } from "./outreach/types";

function lead(over: Partial<Lead> = {}): Lead {
  return {
    id: "lead_founder_fixture",
    kind: "founder",
    key: "founder:fixture",
    company: "Fixture Snacks, Inc.",
    people: [{ name: "Fixture Founder", title: "Executive Officer" }],
    website: "https://fixturesnacks.example",
    location: "Austin, TX",
    signals: [{ label: "Raising", value: "$1M" }],
    contacts: [{ email: "fixture@example.com", name: "Fixture Founder", source: "website", confidence: "high", note: "" }],
    score: 90,
    reasons: [],
    draft: { subject: "Fixture Snacks + Backfield Ventures", body: "Hi Fixture,\n\nFirst email. Open to a quick call?\n\nBest,\nRyan", by: "template" },
    status: "new",
    to: null,
    source: "SEC Form D",
    source_url: null,
    note: "",
    found_at: "2026-11-01T00:00:00.000Z",
    updated_at: "2026-11-01T00:00:00.000Z",
    ...over,
  };
}

const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

test("templates follow the playbook: five short steps, questions, and LP notes never mention the fund", () => {
  for (const kind of ["founder", "partner", "lp"] as const) {
    const steps = templateSteps(kind, "Fixture Snacks, Inc.", "Fixture Founder", null);
    assert.equal(steps.length, 5, kind);
    for (const step of steps) {
      assert.ok(words(step.body) <= 130, `${kind}: ${words(step.body)} words`);
      assert.ok(!/—/.test(step.body), "no em dashes");
      assert.ok(step.body.startsWith("Hi Fixture,"), kind);
    }
    assert.ok(steps[1].body.includes("?") && steps[2].body.includes("?"), `${kind} follow-ups ask a question`);
    if (kind === "lp") for (const step of steps) assert.ok(!LP_FORBIDDEN.test(`${step.subject} ${step.body}`), step.body);
  }
});

test("steps get the cadence, thread subjects, and the opt-out line", () => {
  const steps = buildSteps(templateSteps("founder", "Fixture Snacks, Inc.", "Fixture Founder", { subject: "Fixture Snacks + Backfield Ventures", body: "Hi" }));
  assert.deepEqual(steps.map((s) => [s.kind, s.gap_days, s.new_thread]), [
    ["first", 0, true],
    ["value", 3, false],
    ["angle", 7, false],
    ["breakup", 7, false],
    ["nurture", 90, true],
  ]);
  assert.equal(steps[1].subject, "Re: Fixture Snacks + Backfield Ventures");
  assert.equal(steps[4].subject, "Fixture Snacks, checking back in");
  for (const step of steps) assert.ok(step.body.endsWith(OPT_OUT));
});

test("an AI step that mentions the fund in an LP email falls back to the template", () => {
  const lp = lead({ kind: "lp", draft: null });
  const ai = Array.from({ length: 5 }, (_, i) => ({ subject: `S${i}`, body: i === 2 ? "Would you consider an LP commitment to our fund?" : `Hi Fixture, AI step ${i}?` }));
  const steps = writtenSteps(lp, ai);
  assert.ok(!LP_FORBIDDEN.test(steps[2].body));
  assert.equal(steps[1].body, "Hi Fixture, AI step 1?");
});

test("time zones and the Tuesday to Thursday morning window", () => {
  assert.equal(zoneFor("Austin, TX"), "America/Chicago");
  assert.equal(zoneFor("Portland, OR"), "America/Los_Angeles");
  assert.equal(zoneFor(null), "America/Chicago");
  const tuesday830Central = new Date("2026-11-10T14:30:00Z");
  assert.ok(inSendWindow(tuesday830Central, "America/Chicago"));
  assert.ok(!inSendWindow(tuesday830Central, "America/Los_Angeles"));
  assert.ok(!inSendWindow(new Date("2026-11-09T14:30:00Z"), "America/Chicago"), "Monday is out");
});

test("follow-ups wait their gap; the daily cap ramps 20 to 50; bounces hold it and pause autopilot", () => {
  const e = makeEnrollment(lead(), "fixture@example.com", "you", "2026-11-10T14:00:00.000Z", null);
  assert.equal(nextStep(e, new Date("2026-11-10T14:00:00Z"))?.n, 1);
  e.steps[0].sent_at = "2026-11-10T14:30:00.000Z";
  assert.equal(nextStep(e, new Date("2026-11-12T14:30:00Z")), null);
  assert.equal(nextStep(e, new Date("2026-11-13T14:30:00Z"))?.n, 2);

  const book: OutreachBook = { ...EMPTY_OUTREACH, settings: { ...DEFAULT_SETTINGS, ramp_from: "2026-10-20T00:00:00.000Z" } };
  assert.equal(dailyCap(book.settings, book, new Date("2026-11-10T00:00:00Z")), 35);
  assert.equal(dailyCap(book.settings, book, new Date("2027-06-01T00:00:00Z")), 50);
  const sent = (status: "active" | "bounced", i: number) => ({ ...makeEnrollment(lead({ id: `l${i}` }), `p${i}@example.com`, "auto", "2026-11-09T00:00:00.000Z", null), status, steps: [{ ...e.steps[0], sent_at: "2026-11-09T15:00:00.000Z" }] });
  const bouncy: OutreachBook = { ...book, enrollments: [...Array.from({ length: 18 }, (_, i) => sent("active", i)), sent("bounced", 18), sent("bounced", 19)] };
  assert.equal(dailyCap(bouncy.settings, bouncy, new Date("2026-11-10T00:00:00Z")), 20);
  assert.match(shouldPause(bouncy, new Date("2026-11-10T00:00:00Z")) ?? "", /2 of the last 20/);
});

test("only safe leads start on their own", () => {
  const on: OutreachBook = { ...EMPTY_OUTREACH, settings: { ...DEFAULT_SETTINGS, enabled: true } };
  assert.ok(autoEligible(lead(), on));
  assert.ok(!autoEligible(lead(), EMPTY_OUTREACH), "autopilot off");
  assert.ok(!autoEligible(lead({ score: 79 }), on), "below the bar");
  assert.ok(!autoEligible(lead({ contacts: [{ email: "fixture@example.com", name: null, source: "guess", confidence: "low", note: "" }] }), on), "guessed address");
  assert.ok(!autoEligible(lead(), { ...on, suppress: ["fixture@example.com"] }), "opted out");
  assert.ok(!autoEligible(lead({ status: "skipped" }), on), "skipped");
  assert.ok(!autoEligible(lead(), { ...on, settings: { ...on.settings, kinds: { ...on.settings.kinds, founder: false } } }), "kind off");
  assert.ok(isOptOut("No thanks, please remove me"));
  assert.ok(!isOptOut("Sounds great, Tuesday works"));
});

test("autopilot can't switch on without Gmail; stopping by hand suppresses the address", () => {
  assert.deepEqual(applyOutreachOp(EMPTY_OUTREACH, { op: "settings", enabled: true }, []), { ok: false, error: "Connect Gmail first. Autopilot sends from your mailbox." });
  const on = applyOutreachOp(EMPTY_OUTREACH, { op: "settings", enabled: true, threshold: 70 }, [], "2026-11-10T00:00:00.000Z", true);
  assert.ok(on.ok);
  assert.equal(on.book.settings.ramp_from, "2026-11-10T00:00:00.000Z");
  assert.equal(on.book.settings.threshold, 70);
  const enrolled = applyOutreachOp(on.book, { op: "enroll", lead_id: "lead_founder_fixture" }, [lead()]);
  assert.ok(enrolled.ok);
  const stopped = applyOutreachOp(enrolled.book, { op: "stop", lead_id: "lead_founder_fixture" }, [lead()]);
  assert.ok(stopped.ok);
  assert.equal(stopped.book.enrollments[0].status, "stopped");
  assert.ok(stopped.book.suppress.includes("fixture@example.com"));
});

function fakeMailer(replies: Record<string, string> = {}, bounces: string[] = []) {
  const sent: { to: string; subject: string; inReplyTo: string | null; threadId: string | null }[] = [];
  const mailer: Mailer = {
    me: { email: "owner@example.com", name: "Ryan Arnold" },
    send: async (mail, threadId) => {
      sent.push({ to: mail.to, subject: mail.subject, inReplyTo: mail.inReplyTo, threadId });
      return { gmailId: `g${sent.length}`, threadId: threadId ?? `t-${mail.to}`, messageId: `<m${sent.length}@example.com>` };
    },
    reply: async (threadId) => ({ replied: threadId in replies, snippet: replies[threadId] ?? "" }),
    bounces: async () => bounces,
  };
  return { mailer, sent };
}

function deps(mailer: Mailer, now: string, over: Partial<EngineDeps> = {}): EngineDeps {
  return { mailer, now: () => new Date(now), pause: async () => undefined, timeLeft: () => 999_999, aiSteps: null, spacingMs: () => 0, maxSendsPerRun: 30, ...over };
}

test("a run starts sequences, sends in the window, follows up in the thread, and stops on a reply", async () => {
  const on: OutreachBook = { ...EMPTY_OUTREACH, settings: { ...DEFAULT_SETTINGS, enabled: true, ramp_from: "2026-11-10T00:00:00.000Z" } };
  const leads = { ...EMPTY_BOOK, leads: [lead(), lead({ id: "low", key: "founder:low", score: 60, contacts: [{ email: "low@example.com", name: null, source: "website", confidence: "high", note: "" }] })] };
  const { mailer, sent } = fakeMailer();

  const monday = await runOutreach(on, leads, deps(mailer, "2026-11-09T14:30:00Z"));
  assert.equal(monday.report.enrolled, 1);
  assert.equal(monday.report.sent, 0, "Monday is outside the window");

  const tuesday = await runOutreach(monday.book, monday.leads, deps(mailer, "2026-11-10T14:30:00Z"));
  assert.equal(tuesday.report.sent, 1);
  assert.deepEqual(sent[0], { to: "fixture@example.com", subject: "Fixture Snacks + Backfield Ventures", inReplyTo: null, threadId: null });
  assert.equal(tuesday.leads.leads.find((l) => l.id === "lead_founder_fixture")?.status, "contacted");

  const friday = await runOutreach(tuesday.book, tuesday.leads, deps(mailer, "2026-11-13T15:00:00Z"));
  assert.equal(friday.report.sent, 0, "Friday is outside the window");
  const nextWed = await runOutreach(friday.book, friday.leads, deps(mailer, "2026-11-18T14:30:00Z"));
  assert.equal(nextWed.report.sent, 1);
  assert.deepEqual(sent[1], { to: "fixture@example.com", subject: "Re: Fixture Snacks + Backfield Ventures", inReplyTo: "<m1@example.com>", threadId: "t-fixture@example.com" });

  const replied = fakeMailer({ "t-fixture@example.com": "Thanks Ryan, Thursday works" });
  const after = await runOutreach(nextWed.book, nextWed.leads, deps(replied.mailer, "2026-11-25T14:30:00Z"));
  assert.equal(after.report.replied, 1);
  assert.equal(after.book.enrollments[0].status, "replied");
  assert.equal(replied.sent.length, 0, "nothing more goes out after a reply");
});

test("opt-out replies and bounces stop for good; autopilot off still checks replies", async () => {
  const base = { ...EMPTY_OUTREACH, settings: { ...DEFAULT_SETTINGS, enabled: false } };
  const e = makeEnrollment(lead(), "fixture@example.com", "you", "2026-11-10T00:00:00.000Z", null);
  e.thread_id = "t1";
  e.steps[0].sent_at = "2026-11-10T14:30:00.000Z";
  const optOut = await runOutreach({ ...base, enrollments: [e] }, EMPTY_BOOK, deps(fakeMailer({ t1: "No thanks, please take me off your list" }).mailer, "2026-11-12T14:30:00Z"));
  assert.equal(optOut.book.enrollments[0].status, "opted_out");
  assert.ok(optOut.book.suppress.includes("fixture@example.com"));
  const bounced = await runOutreach({ ...base, enrollments: [e] }, EMPTY_BOOK, deps(fakeMailer({}, ["fixture@example.com"]).mailer, "2026-11-12T14:30:00Z"));
  assert.equal(bounced.book.enrollments[0].status, "bounced");
  assert.equal((await runOutreach(base, EMPTY_BOOK, deps(fakeMailer().mailer, "2026-11-10T14:30:00Z"))).report.note, "Autopilot is off. Checked replies only.");
});

test("the daily cap limits first emails, and follow-ups go first", async () => {
  const on: OutreachBook = { ...EMPTY_OUTREACH, settings: { ...DEFAULT_SETTINGS, enabled: true, start_cap: 3, ramp_from: "2026-11-10T00:00:00.000Z" } };
  const many = Array.from({ length: 6 }, (_, i) => lead({ id: `l${i}`, key: `founder:l${i}`, contacts: [{ email: `p${i}@example.com`, name: null, source: "website", confidence: "high", note: "" }] }));
  const { mailer, sent } = fakeMailer();
  const run = await runOutreach(on, { ...EMPTY_BOOK, leads: many }, deps(mailer, "2026-11-10T14:30:00Z"));
  assert.equal(run.report.enrolled, 3);
  assert.equal(sent.length, 3);
});

test("gmail: builds a plain-text reply, sends in the thread, refreshes tokens, and spots replies", async () => {
  const raw = Buffer.from(rawMessage({ from: "owner@example.com", fromName: "Ryan Arnold", to: "fixture@example.com", toName: "Fixture Founder", subject: "Re: Fixture café", body: "Hi\nthere", inReplyTo: "<m1@example.com>" }), "base64url").toString("utf8");
  assert.match(raw, /^From: Ryan Arnold <owner@example\.com>\r\nTo: Fixture Founder <fixture@example\.com>\r\nSubject: =\?UTF-8\?B\?/);
  assert.match(raw, /In-Reply-To: <m1@example\.com>\r\nReferences: <m1@example\.com>/);
  assert.match(raw, /\r\n\r\nHi\r\nthere\r\n$/);

  const calls: { url: string; body: string }[] = [];
  const fetcher: Fetch = async (url, init) => {
    calls.push({ url, body: String(init?.body ?? "") });
    const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
    if (url.endsWith("/token")) return json({ access_token: "a1" });
    if (url.endsWith("/messages/send")) return json({ id: "g1", threadId: "t1" });
    if (url.includes("/messages/g1")) return json({ id: "g1", threadId: "t1", payload: { headers: [{ name: "Message-ID", value: "<m9@example.com>" }] } });
    if (url.includes("/threads/t1")) return json({ messages: [{ id: "g1", payload: { headers: [{ name: "From", value: "Ryan <owner@example.com>" }] } }, { id: "g2", snippet: "Sounds good", payload: { headers: [{ name: "From", value: "Fixture <fixture@example.com>" }] } }] });
    return json({ error: { message: "nope" } }, 404);
  };
  assert.equal(await accessToken(fetcher, { clientId: "c", clientSecret: "s" }, "r"), "a1");
  assert.match(calls[0].body, /grant_type=refresh_token/);
  const result = await sendMail(fetcher, "a1", { from: "owner@example.com", fromName: "Ryan", to: "fixture@example.com", toName: null, subject: "Re: x", body: "b", inReplyTo: null }, "t1");
  assert.deepEqual(result, { gmailId: "g1", threadId: "t1", messageId: "<m9@example.com>" });
  assert.match(calls[1].body, /"threadId":"t1"/);
  assert.deepEqual(await threadReply(fetcher, "a1", "t1", "owner@example.com"), { replied: true, snippet: "Sounds good" });
});

test("a run's save keeps what Ryan changed meanwhile", () => {
  const before: OutreachBook = { ...EMPTY_OUTREACH, settings: { ...DEFAULT_SETTINGS, enabled: true }, enrollments: [makeEnrollment(lead(), "fixture@example.com", "auto", "2026-11-10T00:00:00.000Z", null)] };
  const latest: OutreachBook = { ...before, settings: { ...before.settings, enabled: false }, enrollments: [{ ...before.enrollments[0], status: "stopped", reason: "Stopped by you." }], suppress: ["fixture@example.com"] };
  const ran: OutreachBook = { ...before, enrollments: [{ ...before.enrollments[0] }] };
  const merged = mergeRun(before, latest, ran);
  assert.equal(merged.settings.enabled, false);
  assert.equal(merged.enrollments[0].status, "stopped");
  assert.ok(merged.suppress.includes("fixture@example.com"));
  const paused = mergeRun(before, before, { ...ran, settings: { ...ran.settings, enabled: false, paused_reason: "Paused: bounces" } });
  assert.equal(paused.settings.paused_reason, "Paused: bounces");
});
