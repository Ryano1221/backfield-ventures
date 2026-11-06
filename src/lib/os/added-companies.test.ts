import assert from "node:assert/strict";
import test from "node:test";
import { applyAddedOp, EMPTY_ADDED, parseAdded } from "./added-companies";

const NOW = "2026-11-06T15:00:00.000Z";

test("a LinkedIn pitch can be logged by hand, once, with a cleaned-up website", () => {
  const r = applyAddedOp(EMPTY_ADDED, { op: "add", name: " Acme ", website: "acme.co", source: "LinkedIn", founder: "Ana" }, NOW, () => "add_1");
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.book.companies[0], { id: "add_1", name: "Acme", website: "https://acme.co/", founder: "Ana", source: "LinkedIn", note: "", added_at: NOW });
  assert.equal(applyAddedOp(r.book, { op: "add", name: "acme" }).ok, false);
  assert.equal(applyAddedOp(r.book, { op: "add", name: "" }).ok, false);
  assert.equal(applyAddedOp(r.book, { op: "add", name: "B", website: "javascript:alert(1)" }).ok, false);
  const removed = applyAddedOp(r.book, { op: "remove", id: "add_1" });
  assert.ok(removed.ok && removed.book.companies.length === 0);
  assert.deepEqual(parseAdded("nope").companies, []);
});
