import assert from "node:assert/strict";
import test from "node:test";
import { exactMessageHash } from "./actions";
import { normalizeDriveApprove, normalizeDriveEdit } from "./drive-actions";
import { approvedText, canApprove, decisionVersions, highlightAdded } from "./drive";
import type { Decision } from "./types";

const decision: Decision = {
  id: "fix-dec-1",
  title: "Email reply",
  since: "2026-11-03T13:51:00.000Z",
  link: null,
  subject: "Re: sample note",
  exact_message: "Older body",
  versions: [
    { version: 1, subject: "Re: sample note", body: "Hello there", at: "2026-11-03T17:00:00.000Z", by: "Bot, first draft" },
    { version: 2, subject: "Re: sample note", body: "Hello there today", at: "2026-11-03T18:00:00.000Z", by: "Bot", note: "Add a time" },
  ],
};

test("approve hashes the exact subject and body, and only the latest version", () => {
  const text = approvedText("Re: sample note", "Hello there today");
  assert.equal(text, "Re: sample note\n\nHello there today");
  const latest = normalizeDriveApprove(decision, { version: 2, sha256: "not-the-hash" });
  assert.equal(latest.ok, true);
  if (!latest.ok) return;
  assert.equal(latest.payload.sha256, exactMessageHash(text));
  assert.equal(latest.payload.text, text);
  assert.equal(latest.payload.version, 2);
  assert.equal(latest.payload.sha256 === "not-the-hash", false);
  const older = normalizeDriveApprove(decision, { version: 1 });
  assert.equal(older.ok, false);
  assert.equal(canApprove(decisionVersions(decision), 1), false);
  assert.equal(canApprove(decisionVersions(decision), 2), true);
});

test("an edit note stays on the latest version", () => {
  const ok = normalizeDriveEdit(decision, { base_version: 2, note: "Shorter" });
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.payload.note, "Shorter");
  const stale = normalizeDriveEdit(decision, { base_version: 1, note: "Shorter" });
  assert.equal(stale.ok, false);
});

test("a new version highlights only the words that changed", () => {
  const parts = highlightAdded("Hello there", "Hello there today");
  assert.equal(parts.filter((part) => part.added).map((part) => part.text).join(""), "today");
  assert.equal(parts.some((part) => part.text === "Hello" && part.added), false);
});
