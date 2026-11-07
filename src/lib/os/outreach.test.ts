import assert from "node:assert/strict";
import test from "node:test";
import { EMPTY_BOOK, type Lead } from "./leads/types";
import { applyOutreachOp, makeEnrollment, mergeRun, writtenSteps } from "./outreach/book";
import { runOutreach, type EngineDeps, type Mailer } from "./outreach/engine";
import { accessToken, isAutoReply, messageText, rawMessage, sendMail, stripQuoted, threadReply, type Fetch } from "./outreach/gmail";
import { autoEligible, buildDigest, buildSteps, dailyCap, gmailThreadUrl, inSendWindow, isOptOut, LP_FORBIDDEN, nextStep, OPT_OUT, outreachStats, repliesWaiting, stepDates, shouldPause, templateSteps, zoneFor } from "./outreach/plan";
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
  assert.deepEqual(await threadReply(fetcher, "a1", "t1", "owner@example.com"), { replied: true, snippet: "Sounds good", auto: false, messageId: "g2" });
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

test("a reply is kept for Ryan to answer until he marks it done", async () => {
  const e = makeEnrollment(lead(), "fixture@example.com", "you", "2026-11-10T00:00:00.000Z", null);
  e.thread_id = "t9";
  e.steps[0].sent_at = "2026-11-10T14:30:00.000Z";
  const run = await runOutreach({ ...EMPTY_OUTREACH, enrollments: [e] }, EMPTY_BOOK, deps(fakeMailer({ t9: "Happy to chat, how's Thursday?" }).mailer, "2026-11-11T14:30:00Z"));
  const waiting = repliesWaiting(run.book);
  assert.equal(waiting.length, 1);
  assert.deepEqual(waiting[0].reply, { at: "2026-11-11T14:30:00.000Z", snippet: "Happy to chat, how's Thursday?", handled_at: null, triage: null });
  assert.equal(gmailThreadUrl("t9"), "https://mail.google.com/mail/u/0/#all/t9");
  const done = applyOutreachOp(run.book, { op: "handled", lead_id: e.lead_id }, [], "2026-11-11T15:00:00.000Z");
  assert.ok(done.ok);
  assert.equal(repliesWaiting(done.book).length, 0);
  const optOut = await runOutreach({ ...EMPTY_OUTREACH, enrollments: [e] }, EMPTY_BOOK, deps(fakeMailer({ t9: "No thanks" }).mailer, "2026-11-11T14:30:00Z"));
  assert.equal(repliesWaiting(optOut.book).length, 0, "an opt-out is not a reply to answer");
});

test("reply rate counts delivered first emails over the last 30 days", () => {
  const sent = (i: number, status: "active" | "replied" | "bounced" | "opted_out", at = "2026-11-05T15:00:00.000Z") => {
    const e = makeEnrollment(lead({ id: `s${i}` }), `s${i}@example.com`, "auto", at, null);
    e.steps[0].sent_at = at;
    return { ...e, status };
  };
  const book: OutreachBook = { ...EMPTY_OUTREACH, enrollments: [...Array.from({ length: 8 }, (_, i) => sent(i, "active")), sent(8, "replied"), sent(9, "bounced"), sent(10, "opted_out"), sent(11, "replied", "2026-08-01T15:00:00.000Z")] };
  assert.deepEqual(outreachStats(book, new Date("2026-11-10T00:00:00Z")), { emailed: 11, replied: 1, bounced: 1, optedOut: 1, replyRate: 10 });
});

test("unsent emails can be edited; sent ones and fund talk in LP emails can't", () => {
  const e = makeEnrollment(lead(), "fixture@example.com", "you", "2026-11-10T00:00:00.000Z", null);
  e.steps[0].sent_at = "2026-11-10T14:30:00.000Z";
  const book: OutreachBook = { ...EMPTY_OUTREACH, enrollments: [e] };
  assert.deepEqual(applyOutreachOp(book, { op: "edit_step", lead_id: e.lead_id, n: 1, body: "x" }, []), { ok: false, error: "That email already went out." });
  const edited = applyOutreachOp(book, { op: "edit_step", lead_id: e.lead_id, n: 2, subject: "ignored", body: `Hi Fixture, new text?\n\n${OPT_OUT}` }, []);
  assert.ok(edited.ok);
  const step = edited.book.enrollments[0].steps[1];
  assert.equal(step.body, `Hi Fixture, new text?\n\n${OPT_OUT}`, "the opt-out line stays exactly once");
  assert.equal(step.subject, "Re: Fixture Snacks + Backfield Ventures", "follow-ups keep the thread subject");

  const lp = makeEnrollment(lead({ id: "lp1", kind: "lp", draft: null }), "lp@example.com", "you", "2026-11-10T00:00:00.000Z", null);
  const first = applyOutreachOp({ ...EMPTY_OUTREACH, enrollments: [lp] }, { op: "edit_step", lead_id: "lp1", n: 1, subject: "A new hello", body: "Hi, want to see startups?" }, []);
  assert.ok(first.ok);
  assert.equal(first.book.enrollments[0].steps[1].subject, "Re: A new hello");
  assert.equal(applyOutreachOp({ ...EMPTY_OUTREACH, enrollments: [lp] }, { op: "edit_step", lead_id: "lp1", n: 2, body: "Would you commit to our fund?" }, []).ok, false);

  const dates = stepDates(e, new Date("2026-11-11T00:00:00Z"));
  assert.deepEqual(dates.map((d) => [d.n, d.at.slice(0, 10), d.sent]), [
    [1, "2026-11-10", true],
    [2, "2026-11-17", false],
    [3, "2026-11-24", false],
    [4, "2026-12-01", false],
    [5, "2027-03-02", false],
  ]);
});

test("the morning summary lists replies and new top leads, once a day after 7am Central", async () => {
  const replied = makeEnrollment(lead({ id: "r1" }), "r1@example.com", "auto", "2026-11-09T00:00:00.000Z", null);
  replied.steps[0].sent_at = "2026-11-10T14:30:00.000Z";
  replied.status = "replied";
  replied.reply = { at: "2026-11-10T16:00:00.000Z", snippet: "Thursday works", handled_at: null };
  const fresh = lead({ id: "n1", company: "Fixture Fresh", score: 88, found_at: "2026-11-10T11:30:00.000Z" });
  const old = lead({ id: "n2", company: "Fixture Old", score: 95, found_at: "2026-10-01T00:00:00.000Z" });
  const book: OutreachBook = { ...EMPTY_OUTREACH, settings: { ...DEFAULT_SETTINGS, digest: true, last_digest: "2026-11-09" }, enrollments: [replied] };
  const digest = buildDigest(book, [fresh, old], "2026-11-09", new Date("2026-11-11T13:30:00Z"), "https://os.example/leads");
  assert.equal(digest?.subject, "Backfield leads: 1 reply, 1 new lead");
  assert.match(digest?.body ?? "", /Fixture Founder, Fixture Snacks, Inc\.: "Thursday works"/);
  assert.match(digest?.body ?? "", /Fixture Fresh \(88\)/);
  assert.ok(!digest?.body.includes("Fixture Old"));
  assert.equal(buildDigest({ ...EMPTY_OUTREACH }, [], null, new Date("2026-11-11T13:30:00Z"), "x"), null, "nothing to say, no email");

  const { mailer, sent } = fakeMailer();
  const early = await runOutreach(book, { ...EMPTY_BOOK, leads: [fresh] }, deps(mailer, "2026-11-11T11:30:00Z"));
  assert.equal(sent.length, 0, "5:30am Central is too early");
  const morning = await runOutreach(early.book, { ...EMPTY_BOOK, leads: [fresh] }, deps(mailer, "2026-11-11T13:30:00Z"));
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "owner@example.com");
  assert.equal(morning.book.settings.last_digest, "2026-11-11");
  await runOutreach(morning.book, { ...EMPTY_BOOK, leads: [fresh] }, deps(mailer, "2026-11-11T15:30:00Z"));
  assert.equal(sent.length, 1, "once a day");
  assert.equal(mergeRun(book, { ...book, settings: { ...book.settings, threshold: 70 } }, morning.book).settings.last_digest, "2026-11-11", "survives a settings change mid-run");
});

test("out-of-office answers don't count as replies; a person's does", async () => {
  const msg = (headers: Record<string, string>, snippet = "") => ({ id: "m", threadId: "t", snippet, payload: { headers: Object.entries(headers).map(([name, value]) => ({ name, value })) } });
  assert.ok(isAutoReply(msg({ "Auto-Submitted": "auto-replied" })));
  assert.ok(!isAutoReply(msg({ "Auto-Submitted": "no" })));
  assert.ok(isAutoReply(msg({ Subject: "Automatic reply: Fixture Snacks + Backfield Ventures" })));
  assert.ok(isAutoReply(msg({ Subject: "Out of Office" })));
  assert.ok(isAutoReply(msg({ Precedence: "auto_reply" })));
  assert.ok(isAutoReply(msg({ Subject: "Re: Fixture Snacks" }, "I'm currently out of the office until Monday with limited access to email.")));
  assert.ok(!isAutoReply(msg({ Subject: "Re: Fixture Snacks" }, "Thanks Ryan, happy to chat. I'm out next week but free after.")));

  const fetcher: Fetch = async () =>
    new Response(JSON.stringify({ messages: [
      { id: "1", payload: { headers: [{ name: "From", value: "Ryan <owner@example.com>" }] } },
      { id: "2", snippet: "I'm out of the office until Monday", payload: { headers: [{ name: "From", value: "F <fixture@example.com>" }, { name: "Auto-Submitted", value: "auto-replied" }] } },
    ] }));
  assert.deepEqual(await threadReply(fetcher, "a", "t", "owner@example.com"), { replied: false, snippet: "", auto: true });

  const e = makeEnrollment(lead(), "fixture@example.com", "you", "2026-11-10T00:00:00.000Z", null);
  e.thread_id = "t1";
  e.steps[0].sent_at = "2026-11-10T14:30:00.000Z";
  const mailer: Mailer = { ...fakeMailer().mailer, reply: async () => ({ replied: false, snippet: "", auto: true }) };
  const first = await runOutreach({ ...EMPTY_OUTREACH, enrollments: [e] }, EMPTY_BOOK, deps(mailer, "2026-11-11T14:30:00Z"));
  assert.equal(first.book.enrollments[0].status, "active", "the sequence carries on");
  const second = await runOutreach(first.book, EMPTY_BOOK, deps(mailer, "2026-11-11T15:30:00Z"));
  assert.equal(second.book.log.filter((l) => l.text.includes("automatic reply")).length, 1, "noted once");
});

test("a reply is read in full, quoted history dropped, and triaged; a clear no is respected for good", async () => {
  assert.equal(stripQuoted("Sounds great, Thursday works.\n\n> Hi Fixture,\n> earlier text\n"), "Sounds great, Thursday works.");
  assert.equal(stripQuoted("Thanks!\nOn Tue, Nov 10, 2026 at 9:30 AM Ryan <owner@example.com> wrote:\nHi Fixture"), "Thanks!");
  const fetcher: Fetch = async () =>
    new Response(JSON.stringify({ id: "m1", payload: { mimeType: "multipart/alternative", parts: [{ mimeType: "text/plain", body: { data: Buffer.from("Yes, let's talk.\r\n\r\n> old").toString("base64url") } }, { mimeType: "text/html", body: { data: "" } }] } }));
  assert.equal(await messageText(fetcher, "a", "m1"), "Yes, let's talk.");

  const e = makeEnrollment(lead(), "fixture@example.com", "you", "2026-11-10T00:00:00.000Z", null);
  e.thread_id = "t1";
  e.steps[0].sent_at = "2026-11-10T14:30:00.000Z";
  const base = fakeMailer().mailer;
  const mailer = (snippet: string): Mailer => ({ ...base, reply: async () => ({ replied: true, snippet, messageId: "m1" }), readReply: async () => `${snippet} (full)` });
  const seen: string[] = [];
  const triage = async (_e: unknown, text: string) => {
    seen.push(text);
    return text.startsWith("Yes") ? { intent: "interested" as const, summary: "Wants a call.", suggested: "Great, which times work?\n\nBest,\nRyan" } : { intent: "not_interested" as const, summary: "Passing.", suggested: "Thanks.\n\nBest,\nRyan" };
  };
  const yes = await runOutreach({ ...EMPTY_OUTREACH, enrollments: [e] }, EMPTY_BOOK, deps(mailer("Yes, keen"), "2026-11-11T14:30:00Z", { triage }));
  assert.deepEqual(seen, ["Yes, keen (full)"], "triage reads the full reply");
  assert.equal(yes.book.enrollments[0].reply?.triage?.intent, "interested");
  assert.ok(!yes.book.suppress.includes("fixture@example.com"));
  const no = await runOutreach({ ...EMPTY_OUTREACH, enrollments: [e] }, EMPTY_BOOK, deps(mailer("We'll pass for now, thanks"), "2026-11-11T14:30:00Z", { triage }));
  assert.ok(no.book.suppress.includes("fixture@example.com"));
});
