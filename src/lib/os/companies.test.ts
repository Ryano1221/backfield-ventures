import assert from "node:assert/strict";
import test from "node:test";
import { companyKey, trackedCompanies } from "./companies";
import type { Snapshot } from "./types";

function snap(over: Partial<Snapshot>): Snapshot {
  return { generated_at: "2026-11-06T15:00:00.000Z", pitches: [], bots: { bots: [] } as unknown as Snapshot["bots"], outreach: [], decisions: [], activity: [], interactions: [], crm: { people: [] } as unknown as Snapshot["crm"], ...over };
}

test("Best 3 picks, Handoff brands and CRM founders show up once each; pitches win", () => {
  const s = snap({
    decisions: [{ id: "d1", detail: { kind: "pack", picks: [{ slug: "weld", name: "WELD", one_liner: "Welding", website: "https://weld.example" }, { slug: "lelick", name: "Le Lick" }] } } as unknown as Snapshot["decisions"][number]],
    crm: { people: [{ id: "p1", name: "Ana Founder", firm: "Acme Robotics Inc.", track: "founder" }, { id: "p2", name: "Lou LP", firm: "Big Fund", track: "lp" }] } as unknown as Snapshot["crm"],
  });
  const rows = trackedCompanies(s, [{ company: "Omorpho", domain: null }]);
  const names = rows.map((r) => r.company);
  assert.ok(names.includes("WELD"));
  assert.ok(names.includes("GROWL"));
  assert.ok(names.includes("Acme Robotics Inc."));
  assert.ok(!names.includes("Big Fund"));
  assert.ok(!names.includes("Omorpho"), "a pitch with the same name wins");
  assert.equal(names.filter((n) => companyKey(n) === "lelick").length, 1, "Le Lick from Best 3 and The Handoff is one row");
  const lelick = rows.find((r) => companyKey(r.company) === "lelick")!;
  assert.equal(lelick.source, "Best 3, The Handoff");
  assert.equal(rows.find((r) => r.company === "WELD")?.status, "tracking");
  assert.equal(rows.find((r) => r.company === "Acme Robotics Inc.")?.founder, "Ana Founder");
});
