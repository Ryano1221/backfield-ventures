import assert from "node:assert/strict";
import test from "node:test";
import { visibleDeals } from "./deals";
import { buildDeal, buildDeals } from "./night";
import { shownPitchRating } from "./pitch-rate";
import { validateSnapshot } from "./schema";
import type { DeskDeal } from "./night";
import type { OsAction, PitchRating } from "./types";

const NOW = "2026-11-04T19:11:00.000Z";

function pitch(extra: Record<string, unknown> = {}) {
  return {
    company: "EXAMPLE North",
    sector: "EXAMPLE outdoor",
    stage: "Seed",
    received: "2026-11-01",
    founder: "EXAMPLE Founder",
    status: "reviewing",
    score: 14,
    source: "EXAMPLE inbound",
    deck: null,
    title: "EXAMPLE pack",
    summary: "EXAMPLE deal. Not a real company.",
    id: "pitch_example-north",
    domain: "example-north.test",
    website: "https://example-north.test",
    deck_url: "https://example.com/example-deck",
    logo_url: null,
    ryan_rating: "maybe",
    field_sources: { sector: "EXAMPLE email", deck_url: "EXAMPLE attachment" },
    ...extra,
  };
}

test("schema keeps pitch ids, decks, ratings, and source notes", () => {
  const result = validateSnapshot({
    generated_at: NOW,
    pitches: [
      pitch(),
      pitch({
        company: "EXAMPLE Cedar",
        id: "pitch_example-cedar",
        deck_url: null,
        deck: null,
        website: null,
        domain: "example-cedar.test",
        deck_note: "attachment in email, no link",
        ryan_rating: null,
        logo_url: null,
        field_sources: { deck_note: "EXAMPLE email" },
      }),
      pitch({ company: "EXAMPLE Junk", id: "not-a-pitch-id", ryan_rating: "love", website: "notaurl" }),
    ],
    bots: [],
    outreach: [],
    decisions: [],
    activity: [],
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const [north, cedar, junk] = result.snapshot.pitches;
  assert.equal(north?.id, "pitch_example-north");
  assert.equal(north?.website, "https://example-north.test");
  assert.equal(north?.deck_url, "https://example.com/example-deck");
  assert.equal(north?.ryan_rating, "maybe");
  assert.equal(north?.logo_url, undefined);
  assert.equal(north?.field_sources?.sector, "EXAMPLE email");
  assert.equal(cedar?.deck_note, "attachment in email, no link");
  assert.equal(cedar?.deck_url, undefined);
  assert.equal(cedar?.ryan_rating, null);
  assert.equal(junk?.id, undefined);
  assert.equal(junk?.ryan_rating, undefined);
  assert.equal(junk?.website, undefined);
  const deals = buildDeals(result.snapshot);
  const card = deals.find((deal) => deal.id === "pitch_example-north");
  assert.equal(card?.website, "https://example-north.test");
  assert.equal(card?.deckUrl, "https://example.com/example-deck");
  assert.equal(card?.deckNote, null);
  assert.equal(card?.logoUrl, null);
  assert.equal(card?.domain, "example-north.test");
  const quiet = deals.find((deal) => deal.id === "pitch_example-cedar");
  assert.equal(quiet?.deckUrl, null);
  assert.equal(quiet?.deckNote, "attachment in email, no link");
  assert.equal(quiet?.website, "https://example-cedar.test");
  assert.equal(buildDeal(result.snapshot, "pitch_example-north")?.sources[0]?.source, "EXAMPLE email");
});

test("a stored rate wins until a newer snapshot carries the same rating", () => {
  const older = "2026-11-04T18:00:00.000Z";
  const newer = "2026-11-04T20:00:00.000Z";
  const action = rate("pitch_example-north", "great", "2026-11-04T19:00:00.000Z");
  assert.equal(shownPitchRating({ logged: "maybe", generatedAt: older, actions: [action], pitchId: "pitch_example-north" }), "great");
  assert.equal(shownPitchRating({ logged: "maybe", generatedAt: newer, actions: [action], pitchId: "pitch_example-north" }), "great");
  assert.equal(shownPitchRating({ logged: "great", generatedAt: newer, actions: [action], pitchId: "pitch_example-north" }), "great");
  assert.equal(shownPitchRating({ logged: "no", generatedAt: newer, actions: [], pitchId: "pitch_example-north" }), "no");
  const later = rate("pitch_example-north", "good", "2026-11-04T19:30:00.000Z");
  assert.equal(shownPitchRating({ logged: "maybe", generatedAt: older, actions: [action, later], pitchId: "pitch_example-north" }), "good");
});

test("search, rating filters, and sort use the live rating", () => {
  const deals: DeskDeal[] = [
    sampleDeal({ id: "pitch_a", company: "EXAMPLE Alpha", sector: "Food", score: 4, received: "2026-10-01", loggedRating: "no" }),
    sampleDeal({ id: "pitch_b", company: "EXAMPLE Bravo", title: "Outdoor kit", score: 18, received: "2026-11-02", loggedRating: null }),
    sampleDeal({ id: "pitch_c", company: "EXAMPLE Cedar", source: "referral", score: 9, received: "2026-11-03", loggedRating: "great" }),
  ];
  const ratingOf = (deal: DeskDeal) => deal.loggedRating;
  assert.equal(visibleDeals(deals, "outdoor", "all", "name", ratingOf).map((deal) => deal.id).join(), "pitch_b");
  assert.equal(visibleDeals(deals, "", "great", "name", ratingOf).map((deal) => deal.id).join(), "pitch_c");
  assert.equal(visibleDeals(deals, "", "unrated", "name", ratingOf).map((deal) => deal.id).join(), "pitch_b");
  assert.deepEqual(
    visibleDeals(deals, "", "all", "rating", ratingOf).map((deal) => deal.id),
    ["pitch_b", "pitch_c", "pitch_a"],
  );
  assert.deepEqual(
    visibleDeals(deals, "example", "all", "score", ratingOf).map((deal) => deal.id),
    ["pitch_b", "pitch_c", "pitch_a"],
  );
});

function rate(id: string, rating: PitchRating, at: string): OsAction {
  return {
    action_id: `${id}-${rating}`,
    type: "rate",
    target_id: id,
    payload: { rating },
    created_at: at,
    idempotency_key: `rate:${id}:${rating}`,
    acked_at: null,
    result: null,
    status: "pending",
  };
}

function sampleDeal(extra: Partial<DeskDeal>): DeskDeal {
  return {
    id: "pitch_example",
    company: "EXAMPLE",
    title: null,
    summary: "EXAMPLE summary",
    sector: null,
    stage: "Seed",
    score: 1,
    pips: 1,
    waiting: null,
    received: "2026-11-01",
    founder: null,
    domain: null,
    website: null,
    deckUrl: null,
    deckNote: null,
    logoUrl: null,
    status: "reviewing",
    statusLabel: "Reviewing",
    source: null,
    loggedRating: null,
    generatedAt: NOW,
    sources: [],
    ...extra,
  };
}
