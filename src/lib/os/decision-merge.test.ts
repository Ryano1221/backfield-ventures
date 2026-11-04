import assert from "node:assert/strict";
import test from "node:test";
import { answerLabel, draftHash, storedDecisionAnswer } from "./decision-merge";
import { buildToday } from "./night";
import type { OsAction, Snapshot } from "./types";

const NOW = Date.parse("2026-11-03T22:09:00.000Z");

test("answer labels are Approved, Edited, or Not now", () => {
  assert.equal(answerLabel(action("decide", { choice: "approve" })), "Approved");
  assert.equal(answerLabel(action("decide", { choice: "yes" })), "Approved");
  assert.equal(answerLabel(action("decide", { choice: "edit", edited_message: "New words." })), "Edited");
  assert.equal(answerLabel(action("decide", { choice: "skip" })), "Not now");
  assert.equal(answerLabel(action("decide", { choice: "not_now" })), "Not now");
  assert.equal(answerLabel(action("snooze", { until: "2026-11-04T14:00:00.000Z" })), "Not now");
});

test("an unacked answer wins over a snapshot that still lists the decision", () => {
  const approve = action("decide", { choice: "approve" }, { target_id: "dec_ada", created_at: "2026-11-03T22:09:00.000Z" });
  const answer = storedDecisionAnswer([approve], "dec_ada", NOW);
  assert.equal(answer?.label, "Approved");
  assert.equal(answer?.at, "2026-11-03T22:09:00.000Z");

  const model = buildToday(sample(), [approve], NOW);
  assert.equal(model.ready.some((card) => card.id === "dec_ada"), false);
  assert.equal(model.hold.length, 1);
  assert.equal(model.kpis.find((kpi) => kpi.label === "Needs you")?.value, "1");
  assert.equal(model.settled.length, 1);
  assert.equal(model.settled[0]?.label, "Approved");
  assert.equal(model.settled[0]?.name, "Ada Founder");
  assert.match(model.settled[0]?.at || "", /CT$/);
  assert.match(model.headline, /on hold/);
});

test("an acked answer stays answered, and a new draft opens the card again", () => {
  const edited = action("decide", { choice: "edit", edited_message: "Changed." }, { target_id: "dec_ada" });
  assert.equal(storedDecisionAnswer([edited], "dec_ada", NOW)?.label, "Edited");

  const skipped = action("decide", { choice: "skip" }, { target_id: "dec_ada" });
  const skippedModel = buildToday(sample(), [skipped], NOW);
  assert.equal(skippedModel.settled[0]?.label, "Not now");
  assert.equal(skippedModel.ready.length, 0);

  const failed = action("decide", { choice: "approve" }, { target_id: "dec_ada", status: "failed", acked_at: "2026-11-03T22:10:00.000Z" });
  assert.equal(storedDecisionAnswer([failed], "dec_ada", NOW), null);
  assert.equal(buildToday(sample(), [failed], NOW).ready.length, 1);

  const same = action(
    "decide",
    { choice: "approve", exact_message_hash: draftHash("Exact words that go out.") },
    { target_id: "dec_ada", status: "done", acked_at: "2026-11-03T15:13:00.000Z", created_at: "2026-11-03T14:54:00.000Z" },
  );
  const kept = buildToday(sample(), [same], NOW);
  assert.equal(kept.ready.some((card) => card.id === "dec_ada"), false);
  assert.equal(kept.settled[0]?.label, "Approved");
  assert.match(kept.settled[0]?.at || "", /CT$/);
  assert.equal(kept.kpis.find((kpi) => kpi.label === "Needs you")?.value, "1");

  const revised = action(
    "decide",
    { choice: "approve", exact_message_hash: draftHash("The previous draft.") },
    { target_id: "dec_ada", status: "done", acked_at: "2026-11-03T15:13:00.000Z" },
  );
  assert.equal(storedDecisionAnswer([revised], "dec_ada", NOW, { exact: "Exact words that go out." }), null);
  const reopened = buildToday(sample(), [revised], NOW);
  assert.equal(reopened.ready.some((card) => card.id === "dec_ada"), true);
  assert.equal(reopened.settled.length, 0);
});

test("an acked snooze stays Not now", () => {
  const snooze = action("snooze", { until: "2026-11-05T14:00:00.000Z" }, { target_id: "dec_ada", created_at: "2026-11-03T22:00:00.000Z", status: "done", acked_at: "2026-11-03T22:10:00.000Z" });
  const model = buildToday(sample(), [snooze], NOW);
  assert.equal(model.ready.length, 0);
  assert.equal(model.settled[0]?.label, "Not now");
});

function action(
  type: OsAction["type"],
  payload: OsAction["payload"],
  extra: Partial<OsAction> = {},
): OsAction {
  return {
    action_id: extra.action_id || "act_1",
    type,
    target_id: extra.target_id || "dec_ada",
    payload,
    created_at: extra.created_at || "2026-11-03T22:09:00.000Z",
    idempotency_key: extra.idempotency_key || `decide:${extra.target_id || "dec_ada"}`,
    acked_at: extra.acked_at ?? null,
    result: extra.result ?? null,
    status: extra.status || "pending",
  };
}

function sample(): Snapshot {
  return {
    generated_at: "2026-11-03T16:09:00-06:00",
    pitches: [],
    bots: { built_at: "2026-11-03T16:09:00-06:00", bots: [] },
    outreach: [],
    decisions: [
      {
        id: "dec_ada",
        title: "Email reply to Ada Founder",
        since: "2026-11-03T08:00:00-06:00",
        link: null,
        context: "She wrote about the round.",
        exact_message: "Exact words that go out.",
        person: { name: "Ada Founder", company: "Northwind" },
      },
      {
        id: "dec_pack",
        title: "October partner pack",
        since: "2026-10-28T12:00:00-06:00",
        link: null,
        context: "You put this on hold.",
      },
    ],
    activity: [],
    interactions: [],
    crm: { people: [] },
  };
}
