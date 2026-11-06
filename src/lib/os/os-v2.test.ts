import assert from "node:assert/strict";
import test from "node:test";
import { diagnoseFunnel, parseFunnelHistory, recordFunnel, weekDeltas } from "./funnel-history";
import { parseHistory, recordOutreach, weekByTrack } from "./outreach-history";
import { applyRaiseOp, EMPTY_LEDGER, summarizeRaise, type RaiseLedger } from "./raise-model";
import { validateSnapshot } from "./schema";
import { readFileSync } from "node:fs";
import path from "node:path";

const NOW = Date.parse("2026-11-05T18:00:00.000Z");
const DAY = 86_400_000;

test("outreach history keeps a day per track and builds a week", () => {
  let history = parseHistory(null);
  for (let back = 9; back >= 0; back--) {
    const at = new Date(NOW - back * DAY).toISOString();
    history = recordOutreach(history, { generated_at: at, outreach: [{ track: "athlete", label: "Athlete", sent: 20 + back, floor: 25 }] });
  }
  history = recordOutreach(history, { generated_at: new Date(NOW).toISOString(), outreach: [{ track: "athlete", label: "Athlete", sent: 30, floor: 25 }] });
  const [week] = weekByTrack(history, NOW);
  assert.ok(week);
  assert.equal(week.days.length, 7);
  assert.equal(week.days[6]!.sent, 30, "a later snapshot for the same day replaces it");
  assert.equal(week.reportedDays, 7);
  assert.equal(week.hitDays, 3);
  assert.ok(week.lastWeekSent != null);
  assert.deepEqual(parseHistory("nope"), { days: {} });
});

test("as_of decides which day a row lands on", () => {
  const history = recordOutreach({ days: {} }, { generated_at: new Date(NOW).toISOString(), outreach: [{ track: "fo", sent: 3, floor: 10, as_of: "2026-11-04" }] });
  assert.deepEqual(Object.keys(history.days), ["2026-11-04"]);
});

test("funnel history gives this week vs last and names the weakest step", () => {
  const steps = (counts: number[]) => ["reached", "replied", "call", "materials", "soft", "committed"].map((key, index) => ({ key, label: key, count: counts[index]! }));
  let history = recordFunnel(parseFunnelHistory(null), steps([10, 6, 1, 0, 0, 0]), NOW - 8 * DAY);
  history = recordFunnel(history, steps([17, 11, 2, 0, 0, 0]), NOW);
  assert.deepEqual(weekDeltas(history, steps([17, 11, 2, 0, 0, 0]), NOW), { reached: 7, replied: 5, call: 1, materials: 0, soft: 0, committed: 0 });
  assert.equal(weekDeltas(recordFunnel({ days: {} }, steps([1, 1, 1, 0, 0, 0]), NOW), steps([1, 1, 1, 0, 0, 0]), NOW), null);
  const worst = diagnoseFunnel(steps([17, 11, 2, 0, 0, 0]));
  assert.equal(worst?.to, "call");
  assert.equal(worst?.rate, 18);
});

test("raise math: average check, LPs needed, and concentration", () => {
  let ledger: RaiseLedger = { ...EMPTY_LEDGER };
  for (const op of [
    { op: "settings", target_usd: "10m" },
    { op: "upsert", commitment: { name: "Example A", amount_usd: "2m", status: "committed" } },
    { op: "upsert", commitment: { name: "Example B", amount_usd: "1m", status: "wired" } },
    { op: "upsert", commitment: { name: "Example C", amount_usd: "250k", status: "soft" } },
  ]) {
    const result = applyRaiseOp(ledger, op, new Date(NOW));
    if (result.ok) ledger = result.ledger;
  }
  const summary = summarizeRaise(ledger, NOW);
  assert.equal(summary.avgCheck, 1_500_000);
  assert.equal(summary.lpsNeeded, 5);
  assert.equal(summary.topTwoShare, 92);
  assert.deepEqual(summary.topTwo, ["Example A", "Example B"]);
});

test("the snapshot keeps a bot's one-line next step", () => {
  const base = JSON.parse(readFileSync(path.join(process.cwd(), "src/fixtures/os-dashboard.sample.json"), "utf8"));
  base.crm.people[0].next_step_short = "Waiting on a call time";
  const result = validateSnapshot(base);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.snapshot.crm.people[0]!.next_step_short, "Waiting on a call time");
});
