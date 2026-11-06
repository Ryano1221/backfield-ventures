import assert from "node:assert/strict";
import test from "node:test";
import { applyLeadOp, askCandidates, EMPTY_LEADS, parseLeads, referrers, spvToFund, type LeadBook } from "./warm-leads";

const NOW = "2026-11-06T15:00:00.000Z";
let n = 0;
function step(book: LeadBook, op: Record<string, unknown>): LeadBook {
  const r = applyLeadOp(book, op, NOW, (p) => `${p}_${++n}`);
  if (!r.ok) throw new Error(r.error);
  return r.book;
}

test("asking someone, then logging the names they give, closes the ask and credits them", () => {
  let book = step(EMPTY_LEADS, { op: "ask", who: "Ada" });
  assert.equal(book.asks[0].status, "asked");
  book = step(book, { op: "add_lead", name: "Bo", referrer: "ada" });
  book = step(book, { op: "add_lead", name: "Cy", referrer: "Ada", firm: "Cy Family Office" });
  assert.equal(book.asks[0].status, "named");
  assert.equal(book.leads[0].source, "intro");
  book = step(book, { op: "lead_status", id: book.leads.find((l) => l.name === "Bo")!.id, status: "committed" });
  assert.deepEqual(referrers(book), [{ name: "Ada", leads: 2, meetings: 1, committed: 1 }]);
});

test("no duplicate leads; bad input refused; junk storage reads empty", () => {
  const book = step(EMPTY_LEADS, { op: "add_lead", name: "Bo" });
  assert.equal(applyLeadOp(book, { op: "add_lead", name: "bo" }).ok, false);
  assert.equal(applyLeadOp(book, { op: "add_lead", name: " " }).ok, false);
  assert.equal(applyLeadOp(book, { op: "lead_status", id: book.leads[0].id, status: "maybe" }).ok, false);
  assert.deepEqual(parseLeads("x"), EMPTY_LEADS);
});

test("who to ask skips people already asked; SPV investors already in Fund I or already leads drop out", () => {
  const book = step(EMPTY_LEADS, { op: "ask", who: "Ada" });
  assert.deepEqual(askCandidates(book, [{ name: "Ada", person_id: null, why: "x" }, { name: "Bo", person_id: null, why: "y" }, { name: "bo", person_id: null, why: "z" }]).map((c) => c.name), ["Bo"]);
  const withLead = step(book, { op: "add_lead", name: "Cy", source: "spv" });
  const rows = spvToFund([{ name: "Bo", personId: null, spvs: 2, committed: 1 }, { name: "Cy", personId: null, spvs: 1, committed: 1 }, { name: "Dee", personId: null, spvs: 1, committed: 1 }], ["dee"], withLead);
  assert.deepEqual(rows.map((r) => r.name), ["Bo"]);
});
