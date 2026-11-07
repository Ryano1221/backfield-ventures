import assert from "node:assert/strict";
import test from "node:test";
import { emailHrefs } from "../email/nav";
import { buildFinder } from "./finder";
import { decideOs, type OsDecision } from "./host";
import { osHrefs } from "./nav";
import { buildDeal, presentDecision } from "./night";
import { validateSnapshot } from "./schema";

const HOST = "os.backfieldventures.com";
const LIVE_IDS = [
  "pitch_easzotic-com",
  "pitch_gritandgrace-store",
  "pitch_ballontop-com",
  "pitch_iron-oak",
  "pitch_french-montana-sparkling-0-0",
] as const;

test("detail links from a live-shaped snapshot resolve instead of 404", () => {
  const result = validateSnapshot(liveShape());
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const snapshot = result.snapshot;
  const onOs = osHrefs(true);
  const shared = osHrefs(false);

  for (const id of LIVE_IDS) {
    const deal = buildDeal(snapshot, id);
    assert.ok(deal, id);
    assert.equal(deal.id, id);
    assertResolved(onOs.deal(id), `/os/deals/${id}`);
    assert.equal(decideOs({ host: "preview.vercel.app", pathname: shared.deal(id), authed: true, vercelEnv: "preview" }).kind, "os-next");
    assert.deepEqual(decideOs({ host: HOST, pathname: shared.deal(id), authed: true }), {
      kind: "redirect",
      pathname: `/deals/${id}`,
    });
    assert.equal(decideOs({ host: HOST, pathname: `/deals/${id}`, authed: false }).kind, "redirect");
    assert.deepEqual(decideOs({ host: HOST, pathname: `/os/deals/${id}`, authed: true }), {
      kind: "redirect",
      pathname: `/deals/${id}`,
    });
  }

  const note = buildDeal(snapshot, "pitch_easzotic-com");
  assert.equal(note?.deckUrl, null);
  assert.equal(note?.deckNote, "attachment in email, no link");
  assert.equal(note?.website, "https://easzotic.example");
  assert.equal(buildDeal(snapshot, "pitch:EasZotic GmbH"), null);

  const personId = "person_example-ada";
  assertResolved(onOs.person(personId), `/os/crm/${personId}`);
  assert.equal(snapshot.crm.people.some((person) => person.id === personId), true);

  const decisionId = "dec_example-pack";
  assertResolved(onOs.decision(decisionId), `/os/d/${decisionId}`);
  const card = presentDecision(snapshot.decisions[0]!, snapshot, [], Date.parse("2026-11-04T18:00:00.000Z"));
  const pitchLink = card.linked.find((link) => link.kind === "pitch");
  const personLink = card.linked.find((link) => link.kind === "person");
  assert.equal(pitchLink?.id, "pitch_easzotic-com");
  assert.equal(personLink?.id, personId);
  assertResolved(onOs.deal(pitchLink!.id), `/os/deals/${pitchLink!.id}`);
  assertResolved(onOs.person(personLink!.id), `/os/crm/${personLink!.id}`);

  const finder = buildFinder(snapshot);
  for (const item of finder) {
    const href =
      item.kind === "person" ? onOs.person(item.id) : item.kind === "decision" ? onOs.decision(item.id) : item.kind === "company" ? onOs.deal(item.id) : onOs.bots;
    const decision = decideOs({ host: HOST, pathname: href, authed: true });
    assert.notEqual(decision.kind, "not-found", `${item.kind} ${href}`);
    if (item.kind === "company") assert.equal(decision.kind, "rewrite");
  }

  const mail = emailHrefs(true);
  for (const href of [mail.dashboard, mail.subscribers, mail.compose, mail.templates, mail.magnets, mail.forms, mail.handoff, mail.best3, mail.domain, mail.settings]) {
    const decision = decideOs({ host: HOST, pathname: href, authed: true });
    assert.equal(decision.kind, "rewrite", href);
  }

  for (const href of ["/", "/raise", "/deals", "/crm", "/bots", "/activity", "/waiting", "/email", "/studio", "/spv", "/leads"]) {
    assert.equal(decideOs({ host: HOST, pathname: href, authed: true }).kind, "rewrite", href);
  }
  assert.equal(decideOs({ host: HOST, pathname: "/ask", authed: true }).kind, "not-found");
  assert.equal(decideOs({ host: HOST, pathname: "/deals", authed: true }).kind, "rewrite");
  assert.equal(decideOs({ host: "backfieldventures.com", pathname: "/os/deals/pitch_easzotic-com", authed: true, vercelEnv: "production" }).kind, "not-found");
  assert.equal(decideOs({ host: HOST, pathname: "/api/os/snapshot", authed: false }).kind, "unauthorized");
  assert.equal(decideOs({ host: HOST, pathname: "/api/os/raise", authed: false }).kind, "unauthorized");
  assert.equal(decideOs({ host: HOST, pathname: "/raise", authed: false }).kind, "redirect");
});

function assertResolved(href: string, rewrite: string) {
  const decision: OsDecision = decideOs({ host: HOST, pathname: href, authed: true });
  assert.deepEqual(decision, { kind: "rewrite", pathname: rewrite });
}

function liveShape() {
  const long = "Patented performance cleats with organic NFL wear and a distribution note that runs long enough to wrap a phone card. ".repeat(4);
  return {
    generated_at: "2026-11-04T18:00:00.000Z",
    pitches: LIVE_IDS.map((id, index) => ({
      id,
      company: index === 0 ? "EasZotic GmbH" : `Example Pitch ${index}`,
      title: index === 0 ? "EasZotic GmbH" : "Example title",
      summary: index === 2 ? null : long,
      sector: index === 0 ? "sports hardware" : "sports",
      stage: index === 0 ? "Seed" : "Series A",
      score: index === 4 ? 4.5 : 5,
      status: "reviewing",
      source: "inbound",
      received: "2026-09-18",
      founder: null,
      domain: index === 0 ? "easzotic.example" : null,
      website: index === 0 ? "https://easzotic.example" : null,
      deck: null,
      deck_url: index === 3 ? "https://example.com/deck" : null,
      deck_note: index === 3 ? null : "attachment in email, no link",
      logo_url: null,
      ryan_rating: null,
      field_sources: index === 0 ? { domain: "company site", website: "company site" } : null,
    })),
    bots: {
      built_at: "2026-11-04T12:00:00.000Z",
      today: "2026-11-04",
      bots: [
        {
          name: "Example Director",
          slug: "example_director",
          team: "Investment",
          role: "Director",
          scope: "Scores example deals",
          registry_status: "active",
          status: "Working",
          last: "Nov 4, 9:00am CT",
          last_iso: "2026-11-04T15:00:00.000Z",
          source: "fixture",
          result: "Filed a note",
          usage_share: 4,
          director: null,
        },
      ],
    },
    outreach: [{ track: "athlete", sent: 1, floor: 2 }],
    decisions: [
      {
        id: "dec_example-pack",
        title: "Reply about EasZotic GmbH",
        since: "2026-11-04T15:00:00.000Z",
        link: null,
        context: "Example Person mentioned EasZotic GmbH.",
        summary: "A sample pack.",
        requested_by: "example_director",
      },
    ],
    activity: [{ timestamp: "2026-11-04T16:00:00.000Z", actor: "Example Director", summary: "Logged an example." }],
    interactions: [],
    crm: {
      people: [
        {
          id: "person_example-ada",
          name: "Example Person",
          firm: "Example Firm",
          track: "founder",
          stage: "talking",
          owner: null,
          last_touch_at: "2026-11-01T12:00:00.000Z",
          last_touch_channel: "email",
          next_step: "Call",
          next_step_due: null,
          email: "ada@example.com",
          linkedin: null,
          notes: null,
          im_in: false,
          lp: false,
          domain: "example.com",
        },
      ],
    },
  };
}
