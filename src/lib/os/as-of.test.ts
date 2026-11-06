import assert from "node:assert/strict";
import test from "node:test";
import { asOfTitle, asOfWord } from "./as-of";

test("fresh snapshots say today", () => {
  assert.equal(asOfWord(false, "Nov 3, 12:00pm CT"), "today");
  assert.equal(asOfTitle(false, "Nov 3, 12:00pm CT"), "Today");
});

test("stale snapshots name the snapshot's day", () => {
  assert.equal(asOfWord(true, "Nov 3, 12:00pm CT"), "on Nov 3");
  assert.equal(asOfTitle(true, "Nov 3, 12:00pm CT"), "On Nov 3");
  assert.equal(asOfWord(true, null), "at last update");
});
