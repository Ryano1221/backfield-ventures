import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { subscribersToCsv } from "./csv";
import {
  ADDRESS,
  DISCLAIMER,
  HANDOFF_CLOSING,
  HANDOFF_FROM,
  HANDOFF_REPLY_TO,
  SAMPLE_UNSUB_URL,
  checksPass,
  hasBlockedPhrase,
  hasLongDash,
  reviewSend,
} from "./copy";
import { osHrefs } from "../os/nav";
import { fileSignupToSheet } from "./sheet";
import { sendEmail } from "./send";
import { parseSubscribe, subscribe } from "./subscribe";
import { HANDOFF_HTML, HANDOFF_SUBJECT, HANDOFF_TEXT, WELCOME_TEXT, getDraft, handoffClosingPresent } from "./templates";
import { BEST3_TEXT } from "./template-text";
import { unsubscribeByToken } from "./unsubscribe";

function codes(values: number[]): string {
  return String.fromCharCode(...values);
}

test("plain text templates match the mockup files", () => {
  const handoff = readFileSync("docs/email-admin/mockups/c-handoff-email.txt", "utf8");
  const best3 = readFileSync("docs/email-admin/mockups/d-best3-email.txt", "utf8");
  assert.equal(HANDOFF_TEXT, handoff);
  assert.equal(BEST3_TEXT, best3);
  assert.equal(handoffClosingPresent(HANDOFF_TEXT), true);
  assert.equal(HANDOFF_TEXT.includes(HANDOFF_CLOSING), true);
  assert.equal(HANDOFF_TEXT.includes(DISCLAIMER), true);
  assert.equal(WELCOME_TEXT.includes(DISCLAIMER), true);
  assert.equal(WELCOME_TEXT.includes(ADDRESS), true);
  assert.equal(getDraft("welcome")?.enabled, false);
  assert.equal(getDraft("best-3")?.channel, "gmail");
});

test("issue checks pass and a long dash or blocked phrase fails", () => {
  const draft = getDraft("issue-01");
  assert.ok(draft);
  const checks = reviewSend({
    subject: draft.subject,
    text: draft.text,
    html: draft.html,
    requireIssue: true,
  });
  assert.equal(checksPass(checks), true);
  assert.equal(draft.subject, HANDOFF_SUBJECT);
  const dashed = `${draft.text} ${String.fromCharCode(0x2014)}`;
  assert.equal(hasLongDash(dashed), true);
  assert.equal(
    checksPass(reviewSend({ subject: draft.subject, text: dashed, html: draft.html, requireIssue: true })),
    false,
  );
  const blocked = `Note about ${codes([102, 117, 110, 100])} plans`;
  assert.equal(hasBlockedPhrase(blocked), true);
  assert.equal(hasBlockedPhrase(draft.text), false);
});

test("subscribe accepts a real address, rejects a bad one, and keeps a magnet off The Handoff", async () => {
  assert.equal(parseSubscribe({ name: "", email: "ada@example.com", list: "handoff" }).ok, false);
  assert.equal(parseSubscribe({ name: "Ada Example", email: "not-an-email", list: "handoff" }).ok, false);
  assert.equal(parseSubscribe({ name: "Ada Example", email: "ada@example.com", list: "missing" }).ok, false);

  const calls: number[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    calls.push(1);
    throw new Error("network");
  }) as typeof fetch;
  try {
    const handoff = await subscribe(
      { name: "Ada Example", email: "Ada@Example.com", list: "handoff", optInHandoff: false },
      {},
    );
    assert.equal(handoff.ok, true);
    assert.equal(handoff.dryRun, true);
    assert.equal(handoff.status, "active");
    assert.deepEqual(handoff.joined, ["handoff"]);
    assert.equal(handoff.sheet.skipped, true);
    assert.equal(handoff.confirmationSent, false);
    assert.equal(calls.length, 0);

    const magnet = await subscribe(
      { name: "Ada Example", email: "ada@example.com", list: "sample-list", optInHandoff: false },
      {},
    );
    assert.deepEqual(magnet.joined, ["sample-list"]);

    const opted = await subscribe(
      { name: "Ada Example", email: "ada@example.com", list: "sample-list", optInHandoff: true },
      {},
    );
    assert.deepEqual(opted.joined, ["sample-list", "handoff"]);

    const pending = await subscribe(
      { name: "Ada Example", email: "ada@example.com", list: "handoff", optInHandoff: false },
      { DOUBLE_OPT_IN: "true" },
    );
    assert.equal(pending.status, "pending");
    assert.equal(pending.confirmationSent, false);
    assert.equal(calls.length, 0);
  } finally {
    globalThis.fetch = original;
  }
});

test("unsubscribe token accepts a new link, rejects an unknown link, and rejects a used link", () => {
  const rows = [{ token: "OK-TOKEN", email: "a@example.com", listId: "handoff", used: false }];
  const first = unsubscribeByToken("OK-TOKEN", {}, rows);
  const second = unsubscribeByToken("OK-TOKEN", {}, rows);
  assert.equal(first.ok, true);
  assert.equal(first.dryRun, true);
  assert.equal(second.ok, false);
  if (!second.ok) assert.equal(second.reason, "used");

  const unknown = unsubscribeByToken("NO-SUCH-TOKEN", {});
  assert.equal(unknown.ok, false);
  if (!unknown.ok) assert.equal(unknown.reason, "unknown");

  const used = unsubscribeByToken("USED-TOKEN", {});
  assert.equal(used.ok, false);
  if (!used.ok) assert.equal(used.reason, "used");

  const sample = unsubscribeByToken("SAMPLE-TOKEN", {});
  const sampleAgain = unsubscribeByToken("SAMPLE-TOKEN", {});
  assert.equal(sample.ok, true);
  assert.equal(sampleAgain.ok, true);
});

test("dry-run send returns dryRun and never calls fetch", () => {
  const calls: number[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    calls.push(1);
    throw new Error("network");
  }) as typeof fetch;
  try {
    const result = sendEmail(
      {
        from: HANDOFF_FROM,
        replyTo: HANDOFF_REPLY_TO,
        to: "owner@example.com",
        subject: HANDOFF_SUBJECT,
        html: HANDOFF_HTML,
        text: HANDOFF_TEXT,
        unsubscribeUrl: SAMPLE_UNSUB_URL,
      },
      { EMAIL_SEND_ENABLED: "false" },
    );
    assert.equal(result.dryRun, true);
    assert.equal(result.message.from, HANDOFF_FROM);
    assert.equal(result.message.replyTo, HANDOFF_REPLY_TO);
    assert.equal(result.message.headers["List-Unsubscribe"], `<${SAMPLE_UNSUB_URL}>`);
    assert.equal(calls.length, 0);
    const stillDry = sendEmail(
      {
        from: HANDOFF_FROM,
        replyTo: HANDOFF_REPLY_TO,
        to: "owner@example.com",
        subject: HANDOFF_SUBJECT,
        html: "<p>Hi</p>",
        text: "Hi",
        unsubscribeUrl: SAMPLE_UNSUB_URL,
      },
      { EMAIL_SEND_ENABLED: "true" },
    );
    assert.equal(stillDry.dryRun, true);
    assert.equal(calls.length, 0);
  } finally {
    globalThis.fetch = original;
  }
  const source = readFileSync("src/lib/email/send.ts", "utf8");
  assert.equal(source.includes("fetch("), false);
});

test("sheet stub makes no call when the flag is unset", async () => {
  const calls: number[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    calls.push(1);
    throw new Error("network");
  }) as typeof fetch;
  try {
    const skipped = await fileSignupToSheet(
      { name: "Ada Example", email: "ada@example.com", source: "handoff", signupSource: "handoff" },
      {},
    );
    assert.deepEqual(skipped, { skipped: true });
    const also = await fileSignupToSheet(
      { name: "Ada Example", email: "ada@example.com", source: "handoff", signupSource: "handoff" },
      { EMAIL_SHEET_WRITE_ENABLED: "false" },
    );
    assert.deepEqual(also, { skipped: true });
    assert.equal(calls.length, 0);
  } finally {
    globalThis.fetch = original;
  }
});

test("email links and csv stay on the dashboard paths", () => {
  assert.equal(osHrefs(true).email, "/email");
  assert.equal(osHrefs(false).email, "/os/email");
  const csv = subscribersToCsv([
    {
      name: 'Sample "Reader"',
      email: "reader.one@example.com",
      source: "Handoff page",
      tags: ["Handoff", "List: Sample List"],
      joined: "2026-11-02",
    },
  ]);
  assert.match(csv, /"name","email","source","tags","joined"/);
  assert.match(csv, /"Sample ""Reader"""/);
  assert.match(csv, /Handoff; List: Sample List/);
});
