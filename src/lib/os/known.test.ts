import assert from "node:assert/strict";
import test from "node:test";
import { buildKnownIndex, knownFor } from "./leads/known";
import type { Lead } from "./leads/types";
import { autoEligible } from "./outreach/plan";
import { DEFAULT_SETTINGS, EMPTY_OUTREACH } from "./outreach/types";
import type { CrmPerson, Pitch } from "./types";

const crm = (over: Partial<CrmPerson>): CrmPerson => ({ id: "p1", name: "Fixture Person", firm: "Example Family Office", track: "lp", stage: "Intro", owner: null, last_touch_at: null, last_touch_channel: null, next_step: null, next_step_due: null, email: "fp@example.com", linkedin: null, notes: null, ...over }) as CrmPerson;

function lead(over: Partial<Lead> = {}): Lead {
  return { id: "l1", kind: "lp", key: "k", company: "Example Family Office", people: [{ name: "Fixture Person", title: null }], website: null, location: null, signals: [], contacts: [], score: 95, reasons: [], draft: null, status: "new", to: null, source: "x", source_url: null, note: "", found_at: "", updated_at: "", ...over };
}

test("people Ryan already knows are recognised, and common names elsewhere aren't", () => {
  const index = buildKnownIndex({
    crm: [crm({}), crm({ id: "p2", name: "Casey Example", firm: null, email: null, stage: "Committed" })],
    pitches: [{ company: "Fixture Snacks, Inc.", status: "reviewing", ryan_rating: "good" } as Pitch],
    warm: [{ name: "Ada Example", firm: "Example Partners", status: "intro_made" }],
  });
  assert.deepEqual(knownFor(lead({ contacts: [{ email: "FP@example.com", name: null, source: "x", confidence: "high", note: "" }], people: [] }), index), { where: "Relationships", name: "Fixture Person", detail: "Intro" });
  assert.equal(knownFor(lead(), index)?.where, "Relationships", "same name, same firm");
  assert.equal(knownFor(lead({ company: "Some Other Fund" }), index), null, "same name at another firm is someone else");
  assert.equal(knownFor(lead({ people: [{ name: "Casey Example", title: null }], company: "Anywhere" }), index)?.detail, "Committed", "a CRM contact with no firm matches by name");
  assert.equal(knownFor(lead({ people: [{ name: "Ada Example", title: null }], company: "Example Partners" }), index)?.where, "Warm leads");
  assert.deepEqual(knownFor(lead({ kind: "founder", company: "Fixture Snacks Inc", people: [] }), index), { where: "Deals", name: "Fixture Snacks, Inc.", detail: "rated good" });
  assert.equal(knownFor(lead({ people: [{ name: "Fixture", title: null }] }), index), null, "a first name alone is never enough");

  const on = { ...EMPTY_OUTREACH, settings: { ...DEFAULT_SETTINGS, enabled: true } };
  const reachable = lead({ contacts: [{ email: "new@example.com", name: null, source: "x", confidence: "high", note: "" }] });
  assert.ok(autoEligible(reachable, on));
  assert.ok(!autoEligible(reachable, on, false, true), "known people never get an automatic sequence");
});
