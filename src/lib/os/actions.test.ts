import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { ackActions, exactMessageHash, normalizeDecidePayload, readActions, recordAction } from "./actions";
import { ackAnswers, readAnswers, recordAnswer } from "./answers";
import { validateSnapshot } from "./schema";
import type { Decision } from "./types";

test("optional pitch fields and unknown crm stage stay blank", () => {
  const result = validateSnapshot({
    generated_at: "2026-11-03T18:00:00.000Z",
    pitches: [
      {
        company: "Bare Co",
        received: "2026-11-03",
        status: "new",
        score: null,
        sector: "unknown",
        founder: "",
        title: "Bare round",
        summary: "Internal deal note",
        domain: "https://bare.example",
        logo_url: "https://bare.example/logo.png",
      },
      {
        company: "Old Shape",
        sector: "Sports",
        stage: "Seed",
        received: "2026-11-02",
        founder: "Ada Sample",
        status: "reviewing",
        score: 4,
        source: "inbound",
        deck: null,
      },
    ],
    bots: [],
    outreach: [],
    decisions: [
      {
        title: "Send the note",
        since: "2026-11-03T12:00:00.000Z",
        link: null,
        summary: "Short summary",
        domain: "example.com",
      },
    ],
    activity: [],
    crm: { people: [{ id: "p1", name: "Ada", track: "investor", stage: "unknown", domain: "ada.example" }] },
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.snapshot.pitches[0]?.founder, null);
  assert.equal(result.snapshot.pitches[0]?.sector, null);
  assert.equal(result.snapshot.pitches[0]?.stage, null);
  assert.equal(result.snapshot.pitches[0]?.source, null);
  assert.equal(result.snapshot.pitches[0]?.summary, "Internal deal note");
  assert.equal(result.snapshot.pitches[0]?.domain, "bare.example");
  assert.equal(result.snapshot.pitches[1]?.founder, "Ada Sample");
  assert.equal(result.snapshot.pitches[1]?.stage, "Seed");
  assert.equal(result.snapshot.crm.people[0]?.stage, null);
  assert.equal(result.snapshot.crm.people[0]?.domain, "ada.example");
  assert.equal(result.snapshot.decisions[0]?.summary, "Short summary");
  assert.equal(result.snapshot.decisions[0]?.domain, "example.com");
});

test("an edited decision hashes the new text and a double click stores one action", async () => {
  const decision: Decision = {
    title: "Send it",
    since: "2026-11-03T12:00:00.000Z",
    link: null,
    exact_message: "Original text",
    options: [{ value: "approve", label: "Approve" }],
  };
  const edited = normalizeDecidePayload(decision, { choice: "approve", edited_message: "Changed text" });
  assert.equal(edited.ok, true);
  if (!edited.ok) return;
  assert.equal(edited.payload.choice, "edit");
  assert.equal(edited.payload.exact_message_hash, exactMessageHash("Changed text"));
  assert.notEqual(edited.payload.exact_message_hash, exactMessageHash("Original text"));

  const approved = normalizeDecidePayload(decision, { choice: "approve" });
  assert.equal(approved.ok, true);
  if (approved.ok) assert.equal(approved.payload.exact_message_hash, exactMessageHash("Original text"));

  const dir = await mkdtemp(path.join(tmpdir(), "bfv-act-"));
  const env = { OS_SNAPSHOT_FILE: path.join(dir, "snap.json") };
  try {
    const first = await recordAction({ type: "decide", target_id: "d1", payload: approved.ok ? approved.payload : {}, idempotency_key: "decide-key-1" }, env);
    const again = await recordAction({ type: "decide", target_id: "d1", payload: { choice: "skip" }, idempotency_key: "decide-key-1" }, env);
    const clash = await recordAction({ type: "decide", target_id: "d1", payload: { choice: "skip" }, idempotency_key: "decide-key-2" }, env);
    assert.equal(first.created, true);
    assert.equal(again.created, false);
    assert.equal(again.action.action_id, first.action.action_id);
    assert.equal(clash.conflict, true);
    assert.equal(await recordAnswer({ decision_id: "d2", choice: "yes", note: null, decided_at: "2026-11-03T20:00:00.000Z", exact_message_hash: null }, env), "stored");
    assert.equal(await recordAnswer({ decision_id: "d2", choice: "no", note: null, decided_at: "2026-11-03T20:01:00.000Z", exact_message_hash: null }, env), "duplicate");
    const acked = await ackActions([first.action.action_id], { status: "failed", note: "Could not send" }, env);
    assert.deepEqual(acked, [first.action.action_id]);
    const stored = await readActions(env);
    assert.equal(stored.find((action) => action.action_id === first.action.action_id)?.status, "failed");
    assert.equal((await readAnswers(env)).find((answer) => answer.decision_id === "d2")?.acked_at ?? null, null);
    assert.deepEqual(await ackAnswers(["d2"], env), ["d2"]);
    assert.equal((await readAnswers(env)).find((answer) => answer.decision_id === "d2")?.acked_at != null, true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
