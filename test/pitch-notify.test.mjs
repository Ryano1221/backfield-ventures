import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

const mode = process.env.PITCH_NOTIFY_TEST_MODE;
const EXPECTED_FROM = "Backfield Ventures <onboarding@resend.dev>";
const EXPECTED_TO = "ryan@backfieldventures.com";

if (!mode) {
  test("notifyPitch reports success only when Resend accepts the email", () => {
    for (const child of ["nokey", "send"]) {
      const env = { ...process.env, PITCH_NOTIFY_TEST_MODE: child };
      delete env.RESEND_FROM;
      env.RESEND_API_KEY = child === "nokey" ? "" : "re_test_key";
      const result = spawnSync(
        process.execPath,
        ["--import", "./test/register-alias.mjs", "--test", "--test-reporter", "tap", "test/pitch-notify.test.mjs"],
        { env, encoding: "utf8" },
      );
      assert.equal(result.status, 0, `${child}\n${result.stdout}\n${result.stderr}`);
    }
  });
} else if (mode === "nokey") {
  test("missing Resend key does not count as sent", async () => {
    const { notifyPitch } = await import("../src/lib/notify.ts");
    let called = false;
    globalThis.fetch = async () => {
      called = true;
      throw new Error("fetch should not run");
    };
    const ok = await notifyPitch({ company: "Acme", founderEmail: "founder@example.com" });
    assert.equal(ok, false);
    assert.equal(called, false);
  });
} else if (mode === "send") {
  test("Resend response decides delivery and recipients stay unchanged", async () => {
    const { notifyPitch } = await import("../src/lib/notify.ts");
    const calls = [];

    async function mockFetch(url, init) {
      calls.push({ url: String(url), init });
      const script = mockFetch.next;
      if (script === "ok") {
        return new Response(JSON.stringify({ id: "email_123" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (script === "empty") {
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (script === "reject") {
        return new Response(JSON.stringify({ message: "no", name: "internal_server_error" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
      throw new TypeError("network down");
    }

    globalThis.fetch = mockFetch;
    const payload = { company: "Acme", stage: "Seed", founderEmail: "founder@example.com" };

    mockFetch.next = "ok";
    assert.equal(await notifyPitch(payload), true);

    mockFetch.next = "empty";
    assert.equal(await notifyPitch(payload), false);

    mockFetch.next = "reject";
    assert.equal(await notifyPitch(payload), false);

    mockFetch.next = "throw";
    assert.equal(await notifyPitch(payload), false);

    assert.equal(calls.length, 4);
    for (const call of calls) {
      assert.equal(call.url, "https://api.resend.com/emails");
      assert.equal(call.init.headers.get("Authorization"), "Bearer re_test_key");
      const body = JSON.parse(call.init.body);
      assert.equal(body.from, EXPECTED_FROM);
      assert.equal(body.to, EXPECTED_TO);
      assert.equal(body.cc, undefined);
      assert.equal(body.bcc, undefined);
      assert.equal(body.reply_to, "founder@example.com");
    }
  });
}
