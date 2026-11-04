import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { normalizeDecidePayload, readActions, recordAction } from "./actions";
import { answerLabel } from "./decision-merge";
import { readDecisionLog } from "./decision-log";
import { buildToday, presentDecision } from "./night";
import { sanitizePreviewHtml } from "./preview-html";
import { validateSnapshot } from "./schema";
import type { Decision, Snapshot } from "./types";

const NOW = Date.parse("2026-11-04T18:00:00.000Z");

function pack(): Decision {
  return {
    title: "EXAMPLE October partner pack",
    since: "2026-11-04T15:00:00.000Z",
    link: null,
    id: "example-pack",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
    exact_message: "EXAMPLE pack text.",
    detail: {
      kind: "pack",
      picks: [
        { slug: "example-weld", name: "EXAMPLE WELD" },
        { slug: "example-le-lick", name: "EXAMPLE Le Lick" },
      ],
      candidates: [{ slug: "example-linea", name: "EXAMPLE LINEA" }],
      preview: { subject: "EXAMPLE October partner pack", to_label: "5 partners", text: "EXAMPLE pack text.", hash: "a".repeat(64) },
    },
  };
}

test("preview html drops scripts and keeps https links", () => {
  const clean = sanitizePreviewHtml(`<p onclick="alert(1)">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">x</a><a href="https://example.com/pack">site</a>`);
  assert.equal(clean.includes("script"), false);
  assert.equal(clean.includes("onclick"), false);
  assert.equal(clean.includes("javascript:"), false);
  assert.match(clean, /href="https:\/\/example.com\/pack"/);
  assert.match(clean, /<p>Hi<\/p>/);
});

test("detail keeps example companies, strips emails and phones, and leaves cards without detail alone", () => {
  const result = validateSnapshot({
    generated_at: "2026-11-04T16:00:00.000Z",
    pitches: [],
    bots: [],
    outreach: [],
    activity: [],
    decisions: [
      {
        title: "Reply to Ada",
        since: "2026-11-04T15:00:00.000Z",
        link: null,
        options: [
          { value: "approve", label: "Approve and send" },
          { value: "not_now", label: "Not now" },
        ],
      },
      {
        title: "EXAMPLE October partner pack",
        since: "2026-11-04T15:00:00.000Z",
        link: null,
        id: "example-pack",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
        detail: {
          kind: "pack",
          picks: [
            {
              slug: "example-weld",
              name: "EXAMPLE WELD",
              one_liner: "EXAMPLE welded goods",
              why: "EXAMPLE pitch. Reach them at founder@example.com or (512) 555-1212.",
              website: "http://example.com/weld",
              score: "14/20",
              facts: [{ label: "Founded", value: "EXAMPLE 2024", source_note: "example" }],
            },
          ],
          candidates: [{ slug: "example-linea", name: "EXAMPLE LINEA", website: "https://example.com/linea" }],
          preview: {
            subject: "EXAMPLE October partner pack",
            to_label: "5 partners",
            text: "EXAMPLE pack text.",
            html: `<p>EXAMPLE</p><script>alert(1)</script><a href="https://example.com/pack">pack</a>`,
          },
        },
      },
    ],
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const plain = result.snapshot.decisions[0];
  const card = result.snapshot.decisions[1];
  assert.equal(plain?.detail, undefined);
  assert.equal(card?.detail?.picks?.[0]?.name, "EXAMPLE WELD");
  assert.equal(card?.detail?.picks?.[0]?.why?.includes("@"), false);
  assert.equal(card?.detail?.picks?.[0]?.why?.includes("555"), false);
  assert.equal(card?.detail?.picks?.[0]?.score, "14/20");
  assert.equal(card?.detail?.picks?.[0]?.website, null);
  assert.equal(card?.detail?.candidates?.[0]?.website, "https://example.com/linea");
  assert.equal(card?.detail?.preview?.html?.includes("script"), false);
  assert.match(card?.detail?.preview?.html || "", /https:\/\/example.com\/pack/);
  assert.equal(card?.options?.[1]?.label, "No");

  const shown = presentDecision(card!, result.snapshot, [], NOW);
  const untouched = presentDecision(plain!, result.snapshot, [], NOW);
  assert.equal(shown.options[1]?.label, "No");
  assert.equal(shown.detail?.picks?.[0]?.slug, "example-weld");
  assert.equal(untouched.detail, null);
  assert.equal(untouched.approveLabel, "Approve and send");
  assert.equal(untouched.options[1]?.label, "Not now");
  const model = buildToday(result.snapshot, [], NOW);
  assert.equal(model.ready.some((item) => item.id === "example-pack") || model.open.some((item) => item.id === "example-pack"), true);
});

test("swap and reply are stored with a note cap, and slugs must belong to the pack", async () => {
  const decision = pack();
  const missing = normalizeDecidePayload(decision, { choice: "swap", swaps: [{ out: "nope", in: "example-linea" }] });
  assert.equal(missing.ok, false);
  const outsider = normalizeDecidePayload(decision, { choice: "swap", swaps: [{ out: "example-weld", in: "not-a-candidate" }] });
  assert.equal(outsider.ok, false);
  const emptyReply = normalizeDecidePayload(decision, { choice: "reply", note: "  " });
  assert.equal(emptyReply.ok, false);
  const long = normalizeDecidePayload(decision, { choice: "yes", note: "n".repeat(2001) });
  assert.equal(long.ok, false);
  const yes = normalizeDecidePayload(decision, { choice: "yes", note: "EXAMPLE hold the third pick" });
  assert.equal(yes.ok, true);
  if (yes.ok) assert.equal(yes.payload.note, "EXAMPLE hold the third pick");
  const swap = normalizeDecidePayload(decision, { choice: "swap", note: "EXAMPLE try LINEA", swaps: [{ out: "example-weld", in: "example-linea" }] });
  assert.equal(swap.ok, true);
  if (!swap.ok) return;
  assert.deepEqual(swap.payload.swaps, [{ out: "example-weld", in: "example-linea" }]);
  assert.equal(answerLabel({ type: "decide", payload: swap.payload }), "Swap");
  assert.equal(answerLabel({ type: "decide", payload: { choice: "reply", note: "EXAMPLE" } }), "Reply");
  assert.equal(answerLabel({ type: "decide", payload: { choice: "no" } }), "Not now");

  const dir = await mkdtemp(path.join(tmpdir(), "bfv-detail-"));
  const env = { OS_SNAPSHOT_FILE: path.join(dir, "snap.json") };
  try {
    const stored = await recordAction({ type: "decide", target_id: "example-pack", payload: swap.payload, idempotency_key: "decide:example-pack" }, env);
    assert.equal(stored.created, true);
    const again = await readActions(env);
    assert.deepEqual(again[0]?.payload.swaps, [{ out: "example-weld", in: "example-linea" }]);
    const log = await readDecisionLog(env);
    assert.equal(log.length, 1);
    assert.equal(log[0]?.answer, "swap");
    assert.equal(log[0]?.note, "EXAMPLE try LINEA");
    assert.deepEqual(log[0]?.swaps, [{ out: "example-weld", in: "example-linea" }]);
    const raw = await readFile(path.join(dir, "decision-log.jsonl"), "utf8");
    assert.match(raw, /"answer":"swap"/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("the sample fixture pack is labeled example and still validates", async () => {
  const raw = await readFile(path.join(process.cwd(), "src/fixtures/os-dashboard.sample.json"), "utf8");
  const result = validateSnapshot(JSON.parse(raw));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const card = result.snapshot.decisions.find((item) => item.id === "example-pack");
  assert.ok(card?.detail?.picks?.length);
  const blob = JSON.stringify(card?.detail);
  assert.match(blob, /EXAMPLE/);
  assert.equal(blob.includes("@"), false);
  assert.equal(card?.options?.some((option) => option.label === "No"), true);
  assert.equal(card?.options?.some((option) => option.label === "Not now"), false);
  const snapshot: Snapshot = result.snapshot;
  const shown = buildToday(snapshot, [], NOW);
  const row = [...shown.ready, ...shown.hold, ...shown.open].find((item) => item.id === "example-pack");
  assert.equal(row?.options[1]?.label, "No");
  assert.equal(row?.detail?.preview?.to_label, "5 partners");
});
