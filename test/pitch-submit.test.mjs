import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  PITCH_NOT_SENT_MESSAGE,
  pitchSubmissionSucceeded,
  pitchSubmissionSucceededSource,
  postPitch,
} from "../src/lib/pitch-submit.ts";

const drawerSucceeded = new Function(
  `${pitchSubmissionSucceededSource}; return pitchSubmissionSucceeded;`,
)();

const cases = [
  [200, { ok: true }, true],
  [201, { ok: true, error: null }, true],
  [200, { ok: true, error: "" }, true],
  [200, { ok: true, error: "   " }, true],
  [200, { ok: true, success: true }, true],
  [200, { ok: false }, false],
  [200, { ok: true, success: false }, false],
  [200, { ok: true, error: "nope" }, false],
  [200, { error: "nope" }, false],
  [200, null, false],
  [200, "ok", false],
  [200, [], false],
  [500, { ok: true }, false],
  [500, { ok: false }, false],
  [400, { ok: false }, false],
  [0, { ok: true }, false],
];

for (const [status, body, expected] of cases) {
  test(`pitch success check ${status} ${JSON.stringify(body)}`, () => {
    assert.equal(pitchSubmissionSucceeded(status, body), expected);
    assert.equal(drawerSucceeded(status, body), expected);
  });
}

test("failure copy is plain and does not mention a fund", () => {
  assert.equal(
    PITCH_NOT_SENT_MESSAGE,
    "Something went wrong and your pitch didn't send. Please try again.",
  );
  assert.equal(PITCH_NOT_SENT_MESSAGE.includes("—"), false);
  assert.equal(PITCH_NOT_SENT_MESSAGE.includes("–"), false);
  assert.equal(/fund|raise/i.test(PITCH_NOT_SENT_MESSAGE), false);
});

test("postPitch accepts only a confirmed success", async () => {
  const seen = [];
  const result = await postPitch(
    { company: "Acme" },
    {
      fetchImpl: async (url, init) => {
        seen.push({ url: String(url), method: init?.method, body: init?.body });
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    },
  );
  assert.equal(result.ok, true);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].url, "/api/pitch");
  assert.equal(seen[0].method, "POST");
  assert.equal(seen[0].body, JSON.stringify({ company: "Acme" }));
});

test("postPitch treats 500, a failing body, a network error, and a timeout as failure", async () => {
  const fiveHundred = await postPitch(
    {},
    {
      fetchImpl: async () =>
        new Response(JSON.stringify({ ok: false }), { status: 500 }),
    },
  );
  assert.equal(fiveHundred.ok, false);

  const lyingBody = await postPitch(
    {},
    {
      fetchImpl: async () =>
        new Response(JSON.stringify({ ok: false }), { status: 200 }),
    },
  );
  assert.equal(lyingBody.ok, false);

  const network = await postPitch(
    {},
    {
      fetchImpl: async () => {
        throw new TypeError("Failed to fetch");
      },
    },
  );
  assert.equal(network.ok, false);

  const nonJson = await postPitch(
    {},
    {
      fetchImpl: async () => new Response("nope", { status: 200 }),
    },
  );
  assert.equal(nonJson.ok, false);

  const timedOut = await postPitch(
    {},
    {
      timeoutMs: 20,
      fetchImpl: (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const err = new Error("aborted");
            err.name = "AbortError";
            reject(err);
          });
        }),
    },
  );
  assert.equal(timedOut.ok, false);
});

test("pitch clients no longer confirm before the response succeeds", () => {
  const layout = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
  const form = readFileSync(new URL("../src/app/pitch/PitchForm.tsx", import.meta.url), "utf8");
  const drawers = readFileSync(new URL("../src/components/BfvDrawers.tsx", import.meta.url), "utf8");
  const route = readFileSync(new URL("../src/app/api/pitch/route.ts", import.meta.url), "utf8");

  assert.match(layout, /pitchSubmissionSucceeded\(result\.status, result\.body\)/);
  assert.match(layout, /controller\.abort\(\)/);
  assert.match(layout, /if \(pitchSending\) return;/);
  assert.doesNotMatch(layout, /\.catch\(function\(\)\{bfvPitchConfirm\(\);\}\)/);
  assert.match(form, /postPitch\(/);
  assert.match(form, /setSubmitError\(PITCH_NOT_SENT_MESSAGE\)/);
  assert.doesNotMatch(form, /finally[\s\S]{0,80}setConfirmed\(true\)/);
  assert.match(drawers, /id="bfv-pitch-error"/);
  assert.match(drawers, /PITCH_NOT_SENT_MESSAGE/);
  assert.match(route, /if \(!delivered\) return NextResponse\.json\(\{ ok: false \}, \{ status: 500 \}\)/);
  assert.match(route, /return NextResponse\.json\(\{ ok: true \}\)/);
});
