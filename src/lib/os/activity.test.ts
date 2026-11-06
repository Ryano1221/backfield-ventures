import assert from "node:assert/strict";
import test from "node:test";
import { groupActivityByDay, timeCt } from "./activity";
import { formatWhen } from "./metrics";

test("timeCt prints the house time in Chicago", () => {
  assert.equal(timeCt("2026-11-03T18:00:00.000Z", "x"), "12:00pm CT");
  assert.equal(timeCt("not a date", "fallback"), "fallback");
});

test("formatWhen with time matches the rest of the OS", () => {
  assert.equal(formatWhen("2026-11-03T18:00:00.000Z", true), "Nov 3, 12:00pm CT");
});

test("groupActivityByDay buckets by Chicago day and keeps order", () => {
  const item = (at: string, summary: string) => ({ at, timeLabel: at, actor: "Bot", summary });
  const days = groupActivityByDay([
    item("2026-11-04T15:00:00.000Z", "c"),
    item("2026-11-04T03:00:00.000Z", "b"), // 9pm Nov 3 in Chicago
    item("2026-11-03T18:00:00.000Z", "a"),
    item("garbage", "z"),
  ]);
  assert.deepEqual(days.map((d) => d.day), ["Wednesday, Nov 4", "Tuesday, Nov 3", "Undated"]);
  assert.deepEqual(days[1].items.map((i) => i.summary), ["b", "a"]);
  assert.equal(days[1].items[0].time, "9:00pm CT");
  assert.equal(days[2].items[0].time, "garbage");
});
