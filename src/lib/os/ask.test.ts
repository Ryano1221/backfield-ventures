import assert from "node:assert/strict";
import test from "node:test";
import { askActions, dedupedAsks, normalizeAskPayload, officeStatus, routeAsk, whoLabel } from "./ask";
import type { OsAction } from "./types";

test("a typed ask stays text and routes to the owner", () => {
  const pack = routeAsk({
    text: "yes, swap SkyMD for LINEA",
    page: "/os",
    about: "example-pack",
    requestedBy: "investment",
  });
  assert.equal(pack.type, "free_text");
  assert.equal(pack.target_id, "investment");
  assert.equal(pack.payload.text, "yes, swap SkyMD for LINEA");
  assert.equal(pack.payload.choice, undefined);
  assert.equal(pack.payload.swaps, undefined);

  const bot = routeAsk({ text: "Why is this waiting?", page: "/os/bots", botName: "FIXTURE Executive" });
  assert.equal(bot.type, "bot_request");
  assert.equal(bot.target_id, "FIXTURE Executive");

  const open = routeAsk({ text: "What needs me?", page: "/os" });
  assert.equal(open.target_id, "executive");
  assert.equal(normalizeAskPayload({ text: "  " }).ok, false);
  assert.equal(normalizeAskPayload({ text: "n".repeat(2001) }).ok, false);
});

test("status moves from not picked up to picked up or did not land", () => {
  assert.deepEqual(officeStatus({ acked_at: null, status: "pending", result: null }, whoLabel("executive")), {
    line: "With Executive. Not picked up.",
    note: null,
    retry: false,
  });
  assert.deepEqual(officeStatus({ acked_at: "2026-11-04T20:00:00.000Z", status: "done", result: "Held the pack" }, "Executive"), {
    line: "Picked up.",
    note: "Held the pack",
    retry: false,
  });
  assert.deepEqual(officeStatus({ acked_at: "2026-11-04T20:00:00.000Z", status: "failed", result: "Registry owner is out" }, "Executive"), {
    line: "Did not land.",
    note: "Registry owner is out",
    retry: true,
  });
  const rows = [row("free_text", "executive"), row("decide", "dec-1"), row("bot_request", "Investment")];
  assert.deepEqual(askActions(rows).map((item) => item.type), ["bot_request", "free_text"]);
  const repeat = [row("free_text", "executive"), { ...row("free_text", "executive"), action_id: "later", created_at: "2026-11-04T19:00:00.000Z" }];
  assert.equal(dedupedAsks(repeat).length, 1);
  assert.equal(dedupedAsks(repeat)[0]?.action_id, "later");
});

function row(type: OsAction["type"], target: string): OsAction {
  return {
    action_id: type + target,
    type,
    target_id: target,
    payload: { text: "hello" },
    created_at: "2026-11-04T18:00:00.000Z",
    idempotency_key: `ask:${type}`,
    acked_at: null,
    result: null,
    status: "pending",
  };
}
