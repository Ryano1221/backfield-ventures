import assert from "node:assert/strict";
import { inspect } from "node:util";
import { afterEach, before, beforeEach, describe, test } from "node:test";
import { NextRequest } from "next/server";

const SHEET = "https://sheet.example/macros/exec";
const API_KEY = "bh_test_key_do_not_log";
const SHEET_SECRET = "sheet-secret-do-not-log";
const PUB = "pub_test_handoff";
const NOTICE_TO = "ryan@backfieldventures.com";
const BEEHIIV_URL = `https://api.beehiiv.com/v2/publications/${PUB}/subscriptions`;

process.env.RESEND_API_KEY = "re_test_key";

let POST;
const calls = [];
const state = {
  sheet: "ok",
  beehiiv: "ok",
  resendContact: "ok",
  resendEmail: "ok",
};
const originalFetch = globalThis.fetch;

function header(init, name) {
  const headers = init?.headers;
  if (!headers) return undefined;
  if (typeof headers.get === "function") return headers.get(name);
  const found = Object.keys(headers).find((key) => key.toLowerCase() === name.toLowerCase());
  return found ? headers[found] : undefined;
}

function beehiivCalls() {
  return calls.filter((call) => call.url.includes("api.beehiiv.com"));
}

function sheetPosts() {
  return calls.filter((call) => call.url.startsWith(SHEET) && call.method === "POST");
}

function emailCalls() {
  return calls.filter((call) => call.url === "https://api.resend.com/emails");
}

function contactCalls() {
  return calls.filter((call) => call.url.startsWith("https://api.resend.com/contacts"));
}

function installFetch() {
  calls.length = 0;
  globalThis.fetch = async (url, init) => {
    const target = String(url);
    const method = init?.method ?? "GET";
    calls.push({ url: target, method, init });

    if (target.startsWith(SHEET)) {
      if (method === "POST") {
        if (state.sheet === "fail") return new Response("no", { status: 500 });
        return new Response(null, {
          status: 302,
          headers: { location: `${SHEET}?followed=1` },
        });
      }
      return Response.json({ ok: state.sheet !== "fail" });
    }

    if (target.includes("api.beehiiv.com")) {
      if (state.beehiiv === "timeout") {
        return new Promise((resolve, reject) => {
          const signal = init?.signal;
          if (!signal) {
            reject(new Error("missing abort signal"));
            return;
          }
          const fail = () => {
            const reason = signal.reason;
            reject(reason instanceof Error ? reason : new DOMException("timeout", "TimeoutError"));
          };
          if (signal.aborted) fail();
          else signal.addEventListener("abort", fail, { once: true });
        });
      }
      if (state.beehiiv === "network") throw new TypeError("Failed to fetch");
      if (state.beehiiv === "ok") {
        return Response.json({ data: { id: "sub_123", status: "validating" }, warnings: [] });
      }
      const status = Number(state.beehiiv);
      return Response.json(
        {
          errors: [{ code: `HTTP_${status}`, message: `rejected sabrina@example.com ${API_KEY}` }],
        },
        { status },
      );
    }

    if (target.startsWith("https://api.resend.com/contacts")) {
      if (state.resendContact === "fail") {
        return Response.json({ message: "no", name: "internal_server_error" }, { status: 500 });
      }
      return Response.json({ id: "contact_123" });
    }

    if (target === "https://api.resend.com/emails") {
      if (state.resendEmail === "fail") {
        return Response.json({ message: "no", name: "internal_server_error" }, { status: 500 });
      }
      return Response.json({ id: "email_123" });
    }

    throw new Error(`unexpected fetch ${method} ${target}`);
  };
}

function resetEnv() {
  delete process.env.HANDOFF_BEEHIIV_ENABLED;
  delete process.env.HANDOFF_RESEND_ENABLED;
  delete process.env.HANDOFF_BEEHIIV_DOUBLE_OPT;
  delete process.env.BEEHIIV_API_KEY;
  delete process.env.BEEHIIV_PUBLICATION_ID;
  delete process.env.HANDOFF_WEBHOOK_URL;
  process.env.HANDOFF_SHEET_URL = SHEET;
  process.env.HANDOFF_SHEET_SECRET = SHEET_SECRET;
  process.env.HANDOFF_SEGMENT_ID = "seg_handoff";
  process.env.HANDOFF_TEST_SEGMENT_ID = "seg_test";
  process.env.HANDOFF_TEST_TOKEN = "test-token";
  process.env.HANDOFF_TO_EMAIL = NOTICE_TO;
  state.sheet = "ok";
  state.beehiiv = "ok";
  state.resendContact = "ok";
  state.resendEmail = "ok";
}

function subscribe(extra = {}) {
  return {
    type: "subscribe",
    name: "Sabrina Ionescu",
    email: "Sabrina@Example.com",
    ...extra,
  };
}

async function post(body, headers = {}) {
  const logs = [];
  const origError = console.error;
  const origLog = console.log;
  console.error = (...args) => {
    logs.push(inspect(args, { depth: 6 }));
  };
  console.log = (...args) => {
    logs.push(inspect(args, { depth: 6 }));
  };
  try {
    const req = new NextRequest("https://www.backfieldventures.com/api/handoff-subscribe", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
    const res = await POST(req);
    const text = logs.join("\n");
    const email = typeof body?.email === "string" ? body.email.toLowerCase() : "";
    if (email) assert.equal(text.toLowerCase().includes(email), false, text);
    assert.equal(text.includes(API_KEY), false, text);
    assert.equal(text.includes(SHEET_SECRET), false, text);
    return { status: res.status, json: await res.json(), logs: text };
  } finally {
    console.error = origError;
    console.log = origLog;
  }
}

function assertNoEmpty(value) {
  if (Array.isArray(value)) {
    for (const item of value) assertNoEmpty(item);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    assert.notEqual(child, "", key);
    assert.notEqual(child, null, key);
    assert.notEqual(child, undefined, key);
    assertNoEmpty(child);
  }
}

describe("handoff beehiiv signup", { concurrency: false }, () => {
  before(async () => {
    ({ POST } = await import("../src/app/api/handoff-subscribe/route.ts"));
  });

  beforeEach(() => {
    resetEnv();
    installFetch();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("flag off: no beehiiv fetch and the public response stays { ok: true }", async () => {
    const result = await post(subscribe({ src: "ig" }));
    assert.equal(result.status, 200);
    assert.deepEqual(result.json, { ok: true });
    assert.equal(beehiivCalls().length, 0);
    assert.equal(sheetPosts().length, 1);
    assert.equal(contactCalls().length, 1);
    assert.equal(emailCalls().length, 2);
    const subjects = emailCalls().map((call) => JSON.parse(call.init.body).subject);
    assert.equal(subjects[0], "You're on the roster.");
    assert.match(subjects[1], /^The Handoff subscribe:/);

    for (const flag of ["", "false", "1", "TRUE"]) {
      process.env.HANDOFF_BEEHIIV_ENABLED = flag;
      calls.length = 0;
      const again = await post(subscribe());
      assert.equal(again.status, 200);
      assert.deepEqual(again.json, { ok: true });
      assert.equal(beehiivCalls().length, 0);
    }
  });

  test("flag on with a missing key or publication id skips beehiiv and still returns 200", async () => {
    process.env.HANDOFF_BEEHIIV_ENABLED = "true";
    process.env.BEEHIIV_PUBLICATION_ID = PUB;
    delete process.env.BEEHIIV_API_KEY;

    const missingKey = await post(subscribe());
    assert.equal(missingKey.status, 200);
    assert.deepEqual(missingKey.json, { ok: true });
    assert.equal(beehiivCalls().length, 0);
    assert.equal(sheetPosts().length, 1);
    assert.match(missingKey.logs, /missing_config/);

    process.env.BEEHIIV_API_KEY = API_KEY;
    delete process.env.BEEHIIV_PUBLICATION_ID;
    calls.length = 0;
    const missingPub = await post(subscribe());
    assert.equal(missingPub.status, 200);
    assert.equal(beehiivCalls().length, 0);
    assert.equal(sheetPosts().length, 1);
    assert.match(missingPub.logs, /missing_config/);
  });

  test("flag on sends one beehiiv subscription and keeps the sheet row", async () => {
    process.env.HANDOFF_BEEHIIV_ENABLED = "true";
    process.env.BEEHIIV_API_KEY = API_KEY;
    process.env.BEEHIIV_PUBLICATION_ID = PUB;

    const result = await post(subscribe({
      src: "ig-bio",
      utm_source: "should-not-be-beehiiv-utm-source",
      utm_medium: "social",
      utm_campaign: "",
      utm_term: "   ",
      utm_content: "",
      referrer: "instagram.com",
    }));
    assert.equal(result.status, 200);
    assert.deepEqual(result.json, { ok: true });
    assert.equal(beehiivCalls().length, 1);

    const call = beehiivCalls()[0];
    assert.equal(call.url, BEEHIIV_URL);
    assert.equal(call.method, "POST");
    assert.equal(header(call.init, "authorization"), `Bearer ${API_KEY}`);
    assert.equal(header(call.init, "content-type"), "application/json");
    assert.ok(call.init.signal instanceof AbortSignal);

    const body = JSON.parse(call.init.body);
    assert.equal(body.email, "sabrina@example.com");
    assert.equal(body.reactivate_existing, false);
    assert.equal(body.send_welcome_email, false);
    assert.equal(body.double_opt_override, "on");
    assert.equal(body.utm_source, "ig-bio");
    assert.equal(body.utm_medium, "social");
    assert.equal(body.referring_site, "instagram.com");
    assert.equal(Object.hasOwn(body, "utm_campaign"), false);
    assert.equal(Object.hasOwn(body, "utm_term"), false);
    assert.equal(Object.hasOwn(body, "utm_content"), false);
    assert.deepEqual(body.custom_fields, [
      { name: "First Name", value: "Sabrina" },
      { name: "Last Name", value: "Ionescu" },
    ]);
    assertNoEmpty(body);

    const sheet = JSON.parse(sheetPosts()[0].init.body);
    assert.equal(sheet.source, "handoff-public");
    assert.equal(sheet.email, "sabrina@example.com");
    assert.equal(sheet.name, "Sabrina Ionescu");
    assert.equal(
      sheet.signupSource,
      "ig-bio utm_source=should-not-be-beehiiv-utm-source utm_medium=social",
    );

    process.env.HANDOFF_BEEHIIV_DOUBLE_OPT = "off";
    calls.length = 0;
    await post(subscribe({ src: "ig-bio", referrer: "instagram.com" }));
    assert.equal(JSON.parse(beehiivCalls()[0].init.body).double_opt_override, "off");

    process.env.HANDOFF_BEEHIIV_DOUBLE_OPT = "not_set";
    calls.length = 0;
    await post(subscribe({ src: "ig-bio" }));
    assert.equal(JSON.parse(beehiivCalls()[0].init.body).double_opt_override, "not_set");

    process.env.HANDOFF_BEEHIIV_DOUBLE_OPT = "yes";
    calls.length = 0;
    await post(subscribe({ src: "ig-bio" }));
    assert.equal(JSON.parse(beehiivCalls()[0].init.body).double_opt_override, "on");
  });

  test("beehiiv 400, 429, 500, network, and timeout still return 200 when the sheet write succeeded", { timeout: 20_000 }, async () => {
    process.env.HANDOFF_BEEHIIV_ENABLED = "true";
    process.env.BEEHIIV_API_KEY = API_KEY;
    process.env.BEEHIIV_PUBLICATION_ID = PUB;

    for (const status of [400, 429, 500]) {
      state.beehiiv = String(status);
      calls.length = 0;
      const result = await post(subscribe());
      assert.equal(result.status, 200);
      assert.deepEqual(result.json, { ok: true });
      assert.equal(sheetPosts().length, 1);
      assert.equal(beehiivCalls().length, 1);
      assert.match(result.logs, new RegExp(`\\[handoff-subscribe\\] beehiiv failed.*${status}`));
      assert.match(result.logs, new RegExp(`HTTP_${status}`));
    }

    state.beehiiv = "network";
    calls.length = 0;
    const network = await post(subscribe());
    assert.equal(network.status, 200);
    assert.equal(sheetPosts().length, 1);
    assert.equal(beehiivCalls().length, 1);
    assert.match(network.logs, /beehiiv failed.*network/);

    state.beehiiv = "timeout";
    calls.length = 0;
    const started = Date.now();
    const timedOut = await post(subscribe());
    const elapsed = Date.now() - started;
    assert.equal(timedOut.status, 200);
    assert.deepEqual(timedOut.json, { ok: true });
    assert.equal(sheetPosts().length, 1);
    assert.equal(beehiivCalls().length, 1);
    assert.ok(elapsed >= 4500, `timeout returned in ${elapsed}ms`);
    assert.match(timedOut.logs, /beehiiv failed/);
    assert.match(timedOut.logs, /timeout/);
  });

  test("sheet failure still returns 200 when beehiiv succeeds", async () => {
    process.env.HANDOFF_BEEHIIV_ENABLED = "true";
    process.env.HANDOFF_RESEND_ENABLED = "false";
    process.env.BEEHIIV_API_KEY = API_KEY;
    process.env.BEEHIIV_PUBLICATION_ID = PUB;
    state.sheet = "fail";

    const result = await post(subscribe({ src: "ig-bio" }));
    assert.equal(result.status, 200);
    assert.deepEqual(result.json, { ok: true });
    assert.equal(sheetPosts().length, 1);
    assert.equal(beehiivCalls().length, 1);
    assert.equal(contactCalls().length, 0);
    assert.equal(JSON.parse(beehiivCalls()[0].init.body).utm_source, "ig-bio");
  });

  test("every enabled path failing returns 500", async () => {
    state.sheet = "fail";
    state.resendContact = "fail";
    const unchanged = await post(subscribe());
    assert.equal(unchanged.status, 500);
    assert.deepEqual(unchanged.json, { ok: false });
    assert.equal(beehiivCalls().length, 0);
    assert.equal(emailCalls().length, 0);

    process.env.HANDOFF_BEEHIIV_ENABLED = "true";
    process.env.BEEHIIV_API_KEY = API_KEY;
    process.env.BEEHIIV_PUBLICATION_ID = PUB;
    state.beehiiv = "500";
    calls.length = 0;
    const allFailed = await post(subscribe());
    assert.equal(allFailed.status, 500);
    assert.deepEqual(allFailed.json, { ok: false });
    assert.equal(sheetPosts().length, 1);
    assert.equal(beehiivCalls().length, 1);
    assert.ok(contactCalls().length >= 1);
    assert.equal(emailCalls().length, 0);
  });

  test("HANDOFF_RESEND_ENABLED=false skips the contact and confirmation, and still sends the notice", async () => {
    process.env.HANDOFF_RESEND_ENABLED = "false";
    const result = await post(subscribe());
    assert.equal(result.status, 200);
    assert.deepEqual(result.json, { ok: true });
    assert.equal(contactCalls().length, 0);
    assert.equal(emailCalls().length, 1);
    const body = JSON.parse(emailCalls()[0].init.body);
    assert.equal(body.to, NOTICE_TO);
    assert.match(body.subject, /^The Handoff subscribe:/);
    assert.equal(
      emailCalls().some((call) => JSON.parse(call.init.body).subject === "You're on the roster."),
      false,
    );
  });

  test("test mode skips beehiiv and reports beehiiv skipped", async () => {
    process.env.HANDOFF_BEEHIIV_ENABLED = "true";
    process.env.BEEHIIV_API_KEY = API_KEY;
    process.env.BEEHIIV_PUBLICATION_ID = PUB;

    const result = await post(subscribe({ src: "ig" }), { "x-handoff-test": "test-token" });
    assert.equal(result.status, 200);
    assert.deepEqual(result.json, {
      ok: true,
      test: true,
      sheet: true,
      resend: true,
      beehiiv: "skipped",
    });
    assert.equal(beehiivCalls().length, 0);
    assert.equal(emailCalls().length, 0);
    assert.equal(JSON.parse(sheetPosts()[0].init.body).source, "handoff-TEST");
  });

  test("name split sends First Name and Last Name, and a single name sends First Name only", async () => {
    process.env.HANDOFF_BEEHIIV_ENABLED = "true";
    process.env.BEEHIIV_API_KEY = API_KEY;
    process.env.BEEHIIV_PUBLICATION_ID = PUB;

    const sabrina = await post(subscribe());
    assert.equal(sabrina.status, 200);
    assert.deepEqual(JSON.parse(beehiivCalls()[0].init.body).custom_fields, [
      { name: "First Name", value: "Sabrina" },
      { name: "Last Name", value: "Ionescu" },
    ]);

    calls.length = 0;
    const cher = await post({ type: "subscribe", name: "Cher", email: "cher@example.com" });
    assert.equal(cher.status, 200);
    const body = JSON.parse(beehiivCalls()[0].init.body);
    assert.deepEqual(body.custom_fields, [{ name: "First Name", value: "Cher" }]);
    assert.equal(body.utm_source, "handoff-public");
    assert.equal(Object.hasOwn(body, "referring_site"), false);
    assert.equal(JSON.stringify(body).includes("Last Name"), false);
  });
});
