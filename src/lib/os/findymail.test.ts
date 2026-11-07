import assert from "node:assert/strict";
import test from "node:test";
import { applySearchOp, cleanKey, credits, EMPTY_MAP, failureReason, findEmail, FindymailError, findymailKey, keyNote, leadFromContact, leadFromMatch, listContacts, listLists, searchResults, searchStatus, searchStep, startSearch, verifyEmail, type Fetch } from "./leads/findymail";
import { DEFAULT_LIMITS, runFinder } from "./leads/run";
import { setupChecklist } from "./leads/setup";
import { learnTaste, scoreLead } from "./leads/score";
import { EMPTY_BOOK } from "./leads/types";
import { makeEnrollment } from "./outreach/book";
import { runOutreach, type Mailer } from "./outreach/engine";
import { DEFAULT_SETTINGS, EMPTY_OUTREACH } from "./outreach/types";

type Call = { url: string; method: string; auth: string | null; body: unknown };

// Answers shaped like Findymail's documented examples.
function fakeFindymail(opts: { found?: Record<string, string>; verified?: Record<string, boolean>; status?: number } = {}) {
  const calls: Call[] = [];
  const contacts = Array.from({ length: 150 }, (_, i) => ({ id: i + 1, name: `Fixture Person${i + 1}`, email: i % 10 === 0 ? null : `p${i + 1}@example.com`, linkedin_url: "https://www.linkedin.com/in/example", company: "Example Family Office", job_title: "Principal" }));
  const fetcher: Fetch = async (url, init) => {
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    calls.push({ url, method: init?.method ?? "GET", auth: new Headers(init?.headers).get("authorization"), body });
    const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
    if (opts.status) return json({ error: "Not enough credits" }, opts.status);
    const path = new URL(url).pathname;
    if (path === "/api/search/name") {
      const email = opts.found?.[body.name];
      return json(email ? { contact: { name: body.name, domain: body.domain, email } } : { contact: null });
    }
    if (path === "/api/verify") return json({ email: body.email, verified: opts.verified?.[body.email] ?? true, provider: "Google" });
    if (path === "/api/lists") return json({ lists: [{ id: 16, name: "Family offices", created_at: "", updated_at: "", shared_with_team: false, is_owner: true }] });
    if (path === "/api/contacts/get/16") {
      const start = Number(new URL(url).searchParams.get("start") ?? 0);
      return json({ draw: 0, recordsTotal: contacts.length, recordsFiltered: contacts.length, data: contacts.slice(start, start + 100) });
    }
    if (path === "/api/credits") return json({ credits: 150, email: "owner@example.com", has_capacity: null, verifier_credits: 100 });
    return json({ error: "not found" }, 404);
  };
  return { fetcher, calls };
}

test("finder, verifier, lists and credits call Findymail the documented way", async () => {
  const { fetcher, calls } = fakeFindymail({ found: { "Fixture Founder": "Fixture@Example.com" }, verified: { "bad@example.com": false } });
  assert.equal(await findEmail(fetcher, "k1", "Fixture Founder", "fixture.example"), "fixture@example.com");
  assert.deepEqual(calls[0], { url: "https://app.findymail.com/api/search/name", method: "POST", auth: "Bearer k1", body: { name: "Fixture Founder", domain: "fixture.example" } });
  assert.equal(await findEmail(fetcher, "k1", "Nobody Example", "fixture.example"), null);
  assert.equal(await verifyEmail(fetcher, "k1", "ok@example.com"), true);
  assert.equal(await verifyEmail(fetcher, "k1", "bad@example.com"), false);
  assert.deepEqual(await listLists(fetcher, "k1"), [{ id: 16, name: "Family offices" }]);
  const contacts = await listContacts(fetcher, "k1", 16);
  assert.equal(contacts.length, 150, "pages until every contact is in");
  assert.equal(contacts[0].email, null);
  assert.deepEqual(await credits(fetcher, "k1"), { finder: 150, verifier: 100, capacity: null });
});

test("out of credits, paused or busy stops the caller", async () => {
  for (const status of [402, 423, 429]) {
    const { fetcher } = fakeFindymail({ status });
    await assert.rejects(findEmail(fetcher, "k1", "A Person", "x.example"), (error: unknown) => error instanceof FindymailError && error.stop);
  }
});

test("a list contact becomes a lead that scores for being on Ryan's list", () => {
  const lead = leadFromContact({ id: 7, name: "Fixture Person", email: "fp@example.com", linkedin: "https://www.linkedin.com/in/example", company: "Example Family Office", title: "Principal" }, "lp", "Family offices", "2026-11-07T00:00:00.000Z");
  assert.equal(lead.id, "lead_lp_fm7");
  assert.equal(lead.to, "fp@example.com");
  assert.deepEqual(lead.contacts[0].source, "vendor:Findymail");
  assert.deepEqual(lead.signals.map((s) => s.label), ["Title", "Company", "Findymail list"]);
  assert.ok(scoreLead(lead, learnTaste([])).reasons.includes("+15 on your Findymail list"));
});

test("a run pulls tagged list contacts in once and stops asking the finder when credits run out", async () => {
  const imported = [leadFromContact({ id: 1, name: "Fixture Person", email: "fp@example.com", linkedin: null, company: "Example FO", title: null }, "lp", "List", "2026-11-07T00:00:00.000Z"), leadFromContact({ id: 2, name: "Casey Example", email: null, linkedin: null, company: "Example FO2", title: null }, "lp", "List", "2026-11-07T00:00:00.000Z")];
  let vendorCalls = 0;
  const deps = {
    secText: async () => null,
    webText: async () => null,
    hasMx: async () => false,
    vendor: async () => {
      vendorCalls++;
      throw new FindymailError("Findymail: Not enough credits", true);
    },
    ai: null,
    research: null,
    imported: async () => imported,
    taste: learnTaste([]),
    now: new Date("2026-11-07T12:00:00Z"),
    pause: async () => undefined,
  };
  const first = await runFinder(EMPTY_BOOK, deps, { ...DEFAULT_LIMITS, days: 1 });
  assert.equal(first.run.added, 2);
  assert.equal(vendorCalls, 1, "stopped after the first out-of-credits answer");
  assert.ok(first.run.errors.some((e) => e.includes("Not enough credits")));
  const second = await runFinder(first.book, deps, { ...DEFAULT_LIMITS, days: 1 });
  assert.equal(second.run.added, 0, "contacts already on the list are not added twice");
});

test("autopilot checks the address with Findymail before the first email", async () => {
  const lead = leadFromContact({ id: 3, name: "Fixture Person", email: "fp@example.com", linkedin: null, company: "Example FO", title: null }, "lp", "List", "2026-11-07T00:00:00.000Z");
  const sent: string[] = [];
  const mailer: Mailer = {
    me: { email: "owner@example.com", name: "Ryan" },
    send: async (mail) => {
      sent.push(mail.to);
      return { gmailId: "g", threadId: "t", messageId: null };
    },
    reply: async () => ({ replied: false, snippet: "" }),
    bounces: async () => [],
  };
  const book = { ...EMPTY_OUTREACH, settings: { ...DEFAULT_SETTINGS, enabled: true }, enrollments: [makeEnrollment(lead, "fp@example.com", "you", "2026-11-09T00:00:00.000Z", null)] };
  const deps = { mailer, now: () => new Date("2026-11-10T14:30:00Z"), pause: async () => undefined, timeLeft: () => 999_999, aiSteps: null, spacingMs: () => 0, maxSendsPerRun: 10 };
  const rejected = await runOutreach(book, EMPTY_BOOK, { ...deps, verify: async () => false });
  assert.equal(sent.length, 0);
  assert.equal(rejected.book.enrollments[0].status, "bounced");
  assert.ok(rejected.book.suppress.includes("fp@example.com"));
  const unsure = await runOutreach(book, EMPTY_BOOK, { ...deps, verify: async () => null });
  assert.equal(unsure.report.sent, 1, "can't tell (no credits): the vetted address still goes");
});

test("saved searches: start weekly, collect when done, and become leads with verified emails", async () => {
  const calls: { path: string; body: unknown }[] = [];
  let status = "processing";
  const fetcher: Fetch = async (url, init) => {
    const path = new URL(url).pathname;
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    calls.push({ path, body });
    const json = (data: unknown) => new Response(JSON.stringify(data), { status: 200 });
    if (path === "/api/intellimatch/search") return json({ hash: "h1" });
    if (path === "/api/intellimatch/status") return json({ status });
    if (path === "/api/intellimatch/data") return json({ data: [{ id: 9, name: "Example Family Office", domain: "examplefo.example", description: "A single family office.", employee_count_range: "1-10", industries: ["Investment Management"], country: "US", match_score: 91, contact_name: "Fixture Principal", contact_email: "FP@examplefo.example", contact_job_title: "Principal", contact_linkedin_url: null }], meta: { current_page: 1, last_page: 1 } });
    return json({ error: "nope" });
  };
  const added = applySearchOp(EMPTY_MAP, { op: "search_add", kind: "lp", query: "Single family offices in Texas", titles: "Principal, Founder", limit: 25 }, "2026-11-07T00:00:00.000Z", () => "s1");
  assert.ok(added.ok);
  const search = added.map.searches[0];
  assert.deepEqual(search.titles, ["Principal", "Founder"]);
  assert.equal(searchStep(search, new Date("2026-11-07T12:00:00Z")), "start");
  assert.equal(await startSearch(fetcher, "k", search), "h1");
  assert.deepEqual(calls[0].body, { query: "Single family offices in Texas", limit: 25, config: { find_contact: true, find_email: true, require_email: true, find_phone: false, mode: "broad", target_job_titles: [["Principal", "Founder"]] } });
  assert.equal(searchStep({ ...search, hash: "h1" }, new Date()), "check");
  assert.equal(await searchStatus(fetcher, "k", "h1"), "processing");
  status = "success";
  assert.equal(await searchStatus(fetcher, "k", "h1"), "success");
  const matches = await searchResults(fetcher, "k", "h1");
  const lead = leadFromMatch(matches[0], search, "2026-11-08T00:00:00.000Z");
  assert.equal(lead.kind, "lp");
  assert.equal(lead.to, "fp@examplefo.example");
  assert.equal(lead.website, "https://examplefo.example");
  assert.ok(scoreLead(lead, learnTaste([])).reasons.includes("+10 matched your Findymail search"));
  assert.equal(searchStep({ ...search, last_run: "2026-11-08T00:00:00.000Z" }, new Date("2026-11-10T00:00:00Z")), "wait", "once a week");
  assert.equal(searchStep({ ...search, last_run: "2026-11-01T00:00:00.000Z" }, new Date("2026-11-10T00:00:00Z")), "start");
  assert.equal(applySearchOp(added.map, { op: "search_add", kind: "lp", query: "short" }, "x").ok, false);
  assert.equal(applySearchOp(added.map, { op: "search_remove", id: "s1" }, "x").ok && applySearchOp(added.map, { op: "search_remove", id: "s1" }, "x").ok, true);
});

test("a pasted key with invisible characters, quotes or a Bearer prefix still works; a request that throws says why", async () => {
  assert.equal(cleanKey("​abc|123\n").key, "abc|123");
  assert.equal(cleanKey("“abc|123”").key, "abc|123");
  assert.equal(cleanKey("Bearer abc|123").key, "abc|123");
  assert.equal(cleanKey("abc\n|123").key, "abc|123");
  assert.deepEqual(cleanKey("abcé123").bad, ["U+00E9"]);
  assert.equal(findymailKey({ FINDYMAIL_API_KEY: " ​abc|123 \n" }), "abc|123");
  assert.match(keyNote({ FINDYMAIL_API_KEY: "​abc|123\n" }) ?? "", /had 2 extra characters/);
  assert.equal(keyNote({ FINDYMAIL_API_KEY: "abc|123" }), null);
  assert.match(keyNote({ FINDYMAIL_API_KEY: "abcé123" }) ?? "", /U\+00E9/);

  let sent = "";
  const ok: Fetch = async (_url, init) => {
    sent = new Headers(init?.headers).get("authorization") ?? "";
    assert.ok(init?.signal, "every request has a timeout");
    return new Response(JSON.stringify({ lists: [] }), { status: 200 });
  };
  await listLists(ok, findymailKey({ FINDYMAIL_API_KEY: "“abc|123”\n" })!);
  assert.equal(sent, "Bearer abc|123");

  const throws: Fetch = async () => {
    throw Object.assign(new TypeError("fetch failed"), { cause: Object.assign(new Error("getaddrinfo ENOTFOUND app.findymail.com"), { code: "ENOTFOUND" }) });
  };
  await assert.rejects(listLists(throws, "abc"), (error: unknown) => error instanceof FindymailError && /\/lists failed \(fetch failed: ENOTFOUND: getaddrinfo ENOTFOUND/.test(error.message));
  const slow: Fetch = async () => {
    throw Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });
  };
  await assert.rejects(listLists(slow, "abc"), /no answer within 15 seconds/);
  assert.equal(failureReason("x"), "x");
});

test("the setup checklist says what's ready and what's missing, without secrets", () => {
  const now = Date.parse("2026-11-07T15:00:00Z");
  const items = setupChecklist({ lastAutoRun: "2026-11-07T11:17:00Z", lastCronAt: null, gmail: "owner@example.com", googleReady: true, aiReady: false, now }, { FINDYMAIL_API_KEY: "​abc|123" });
  const by = new Map(items.map((i) => [i.key, i]));
  assert.equal(by.get("daily")?.ok, true);
  assert.match(by.get("daily")?.detail ?? "", /4 hours ago/);
  assert.equal(by.get("hourly")?.ok, false);
  assert.match(by.get("hourly")?.detail ?? "", /GitHub repository secrets/);
  assert.equal(by.get("ai")?.ok, false);
  assert.equal(by.get("gmail")?.detail, "Sending from owner@example.com.");
  assert.equal(by.get("findymail")?.ok, true);
  assert.match(by.get("findymail")?.detail ?? "", /extra character/);
  assert.ok(!JSON.stringify(items).includes("abc|123"), "never shows the key");
  const stale = setupChecklist({ lastAutoRun: "2026-11-04T11:17:00Z", lastCronAt: "2026-11-01T13:00:00Z", gmail: null, googleReady: false, aiReady: true, now }, {});
  assert.equal(stale.find((i) => i.key === "daily")?.ok, false);
  assert.match(stale.find((i) => i.key === "daily")?.detail ?? "", /3 days ago.*CRON_SECRET/);
  assert.equal(stale.find((i) => i.key === "findymail")?.ok, false);
});
