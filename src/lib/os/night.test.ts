import assert from "node:assert/strict";
import test from "node:test";
import { buildOffice, buildToday, daySentence, headlineLines } from "./night";
import type { Snapshot } from "./types";

const NOW = Date.parse("2026-11-03T22:09:00.000Z");

test("today headline and lede come from counts, and missing fields stay off the desk", () => {
  assert.deepEqual(headlineLines(6, 1, 0), { lead: "6 replies are ready.", dim: "1 pack is on hold." });
  assert.equal(
    daySentence({ replies: 6, holds: 1, deals: 12, waitingBots: 6 }),
    "Six replies are ready for your yes, and one pack is on hold. Twelve deals are in review. Six bots are waiting on you.",
  );
  assert.equal(daySentence({ replies: 0, holds: 0, deals: 0, waitingBots: 0 }), null);
  const empty = buildToday(null, [], NOW);
  assert.equal(empty.hasSnapshot, false);
  assert.equal(empty.kpis.length, 0);
  assert.equal(empty.lede, null);

  const model = buildToday(sample(), [], NOW);
  assert.equal(model.ready.length, 1);
  assert.equal(model.hold.length, 1);
  assert.equal(model.ready[0]?.name, "Ada Founder");
  assert.equal(model.ready[0]?.org, "Northwind");
  assert.equal(model.ready[0]?.channel, "Email");
  assert.equal(model.ready[0]?.happened, "She wrote about the round.");
  assert.equal(model.ready[0]?.message?.includes("Exact words"), true);
  assert.equal(model.ready[0]?.message?.includes("\n"), false);
  const kept = buildToday({ ...sample(), decisions: [{ ...sample().decisions[0]!, exact_message: "Line one.\n\nLine two." }] }, [], NOW);
  assert.match(kept.ready[0]?.message || "", /Line one\.\n\nLine two\./);
  assert.equal(model.hold[0]?.reply, false);
  assert.equal(model.open.length, 0);
  assert.equal(model.deals[0]?.summary, null);
  assert.equal(model.deals[0]?.sector, null);
  assert.equal(model.deals[0]?.pips, null);
  assert.equal(model.waiting.length, 1);
  assert.equal(model.waiting[0]?.name, "Network Director");
  assert.match(model.waiting[0]?.ask || "", /your yes/);
  assert.match(model.lede || "", /One reply is ready/);
  assert.match(model.lede || "", /one pack is on hold/);
});

test("office walks only handoffs whose bots are in the snapshot", () => {
  const office = buildOffice(sample(), []);
  assert.equal(office.bots.length, 2);
  assert.equal(office.bots[0]?.status, "Needs Ryan");
  assert.equal(office.bots[0]?.result.includes("unknown"), false);
  assert.equal(office.events.length, 1);
  assert.equal(office.events[0]?.f, "network");
  assert.equal(office.events[0]?.t, "investment");
  assert.equal(office.events[0]?.kind, "packet");
});

function sample(): Snapshot {
  return {
    generated_at: "2026-11-03T16:09:00-06:00",
    pitches: [
      {
        company: "Northwind",
        sector: null,
        stage: null,
        received: "2026-09-01",
        founder: null,
        status: "reviewing",
        score: null,
        source: null,
        deck: null,
      },
    ],
    bots: {
      built_at: "2026-11-03T16:09:00-06:00",
      bots: [
        {
          name: "Network Director",
          slug: "network",
          team: "Network",
          role: "Director",
          status: "Needs Ryan",
          result: "Ada's reply is waiting on your yes.",
          scope: "Replies",
          director: "network",
        },
        {
          name: "Investment Director",
          slug: "investment",
          team: "Investment",
          role: "Director",
          status: "Working",
          result: "Scored the inbound pile.",
          director: "investment",
        },
      ],
    },
    outreach: [{ track: "athlete", sent: 0, floor: 45, label: "Athletes" }],
    decisions: [
      {
        id: "dec_ada",
        title: "Email reply to Ada Founder",
        since: "2026-11-03T08:00:00-06:00",
        link: null,
        context: "She wrote about the round.",
        exact_message: "Exact words that go out.",
        domain: "northwind.example",
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
    interactions: [
      {
        timestamp: "2026-11-03T15:00:00-06:00",
        from: "network",
        to: "investment",
        kind: "packet",
        packet_id: "pkt_1",
        title: "Score Northwind",
        status: "done",
      },
      {
        timestamp: "2026-11-03T15:05:00-06:00",
        from: "ghost",
        to: "investment",
        kind: "message",
        packet_id: null,
        title: "Nobody home",
        status: null,
      },
    ],
    crm: {
      people: [
        {
          id: "ada",
          name: "Ada Founder",
          firm: "Northwind",
          track: "founder",
          stage: "replied",
          owner: null,
          last_touch_at: null,
          last_touch_channel: null,
          next_step: null,
          next_step_due: null,
          email: null,
          linkedin: null,
          notes: null,
          domain: "northwind.example",
        },
      ],
    },
  };
}
