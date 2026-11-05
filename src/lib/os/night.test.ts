import assert from "node:assert/strict";
import test from "node:test";
import { normalizeDecidePayload } from "./actions";
import { buildOffice, buildPeople, buildToday, daySentence, formatCt, formatCtStamp, headlineLines, stageLabel, todayLine } from "./night";
import type { CrmPerson, Snapshot } from "./types";

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
  assert.equal(model.ready[0]?.quote, null);
  assert.equal(model.ready[0]?.why, null);
  assert.equal(model.ready[0]?.toEmail, null);
  assert.deepEqual(model.ready[0]?.checks, []);
  assert.deepEqual(model.ready[0]?.timeline, []);
});

test("the greeting is Chicago today, not the snapshot day", () => {
  assert.equal(todayLine(Date.parse("2026-11-05T18:00:00.000Z")), "Thursday, Nov 5");
  const model = buildToday(sample(), [], Date.parse("2026-11-05T18:00:00.000Z"));
  assert.equal(model.weekday, "Thursday, Nov 5");
});

test("decision times render in CT and a formatted body keeps its blank lines", () => {
  assert.equal(formatCt("2026-11-03T13:51:00.000Z"), "Nov 3, 7:51am CT");
  assert.equal(formatCtStamp("2026-11-03T13:51:00.000Z", "row"), "Tue Nov 3 · 7:51am CT");
  assert.equal(formatCtStamp("2026-10-30T15:56:00.000Z", "quote", true), "Fri Oct 30, ~10:56am CT");

  const body = "Line one.\n\nLine two.";
  const decision = {
    ...sample().decisions[0]!,
    exact_message: "Line one. Line two.",
    body_formatted: body,
    to_email: "casey.sample@example.com",
    cc: "desk@example.com",
    subject: "Hello — there",
    thread_id: "thread-sample-1",
    reply_to_msg_id: "msg-sample-1",
    channel: "email" as const,
    why_ryan: "Asked on Fri Oct 30 at 11:56 AM ET.",
    summary: "A sample summary of what happened.",
    context_raw: "RAW-MARKER-do-not-render",
    checks: ["Not blocked"],
    person: {
      name: "Casey Sample",
      company: "Sample Co",
      what_they_do: "Makes sample goods",
      reach: "10K readers",
      source: "fixtures/sample.md",
    },
    their_words: {
      quote: "A sample question?",
      at: "2026-10-30T15:56:00.000Z",
      at_et: "Fri Oct 30, 11:56 AM ET",
      source: "reply to your note",
      approx: true,
    },
    timeline: [
      { at: "2026-10-29T15:34:00.000Z", event: "You sent the first note", source: "fixtures/sample.md" },
      { at: "2026-10-30T15:56:00.000Z", event: "Casey replied with a question", approx: true, source: "fixtures/sample.md" },
    ],
  };
  const model = buildToday({ ...sample(), decisions: [decision, sample().decisions[1]!] }, [], NOW);
  const card = model.ready[0];
  assert.equal(card?.message, body);
  assert.equal(card?.name, "Casey Sample");
  assert.equal(card?.org, "Sample Co · Makes sample goods");
  assert.equal(card?.toName, "Casey Sample");
  assert.equal(card?.toEmail, "casey.sample@example.com");
  assert.equal(card?.cc, "desk@example.com");
  assert.equal(card?.subject, "Hello, there");
  assert.match(card?.fromLine || "", /@[^@\s]+ · reply in thread$/);
  assert.equal(card?.channelCrumb, "Reply by email");
  assert.equal(card?.why, "Asked on Fri Oct 30 at 11:56 AM ET.");
  assert.equal(card?.happened, "A sample summary of what happened.");
  assert.equal(card?.quote?.text, "A sample question?");
  assert.match(card?.quote?.at || "", /Fri Oct 30, ~10:56am CT/);
  assert.equal(card?.quote?.at?.includes("ET"), false);
  assert.equal(card?.quote?.at?.includes("fixtures/"), false);
  assert.equal(card?.timeline[1]?.at, "Fri Oct 30 · ~10:56am CT");
  assert.equal(card?.timeline[0]?.tone, "you");
  assert.equal(card?.timeline[1]?.tone, "them");
  assert.deepEqual(card?.checks, ["Not blocked"]);
  assert.equal(card?.details.some((fact) => fact.label === "Thread" && fact.value === "thread-sample-1"), true);
  assert.equal(card?.details.some((fact) => fact.value === "fixtures/sample.md"), true);
  const rendered = JSON.stringify({ ...card, details: undefined });
  assert.equal(rendered.includes("thread-sample-1"), false);
  assert.equal(rendered.includes("msg-sample-1"), false);
  assert.equal(rendered.includes("RAW-MARKER"), false);
  assert.equal(rendered.includes("fixtures/"), false);

  const queued = normalizeDecidePayload(decision, { choice: "edit", edited_message: card?.message || "" });
  assert.equal(queued.ok, true);
  if (queued.ok) assert.equal(queued.payload.edited_message, "Line one.\n\nLine two.");
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

function crmPerson(partial: Pick<CrmPerson, "id" | "name" | "track"> & Partial<CrmPerson>): CrmPerson {
  return {
    firm: null,
    stage: null,
    owner: null,
    last_touch_at: null,
    last_touch_channel: null,
    next_step: null,
    next_step_due: null,
    email: null,
    linkedin: null,
    notes: null,
    ...partial,
  };
}

function peopleSnapshot(people: CrmPerson[]): Snapshot {
  return { ...sample(), crm: { people } };
}

test("people stages stay in funnel order and the tiles cover every person", () => {
  assert.equal(stageLabel("unknown"), "Unknown");
  assert.equal(stageLabel("call_booked"), "Call booked");
  assert.equal(stageLabel(null), null);
  const people = buildPeople(
    peopleSnapshot([
      crmPerson({ id: "1", name: "Ready", track: "athlete", stage: "ready" }),
      crmPerson({ id: "2", name: "Asked", track: "founder", stage: "call_asked" }),
      crmPerson({ id: "3", name: "In", track: "investor", stage: "im_in" }),
      crmPerson({ id: "4", name: "Booked", track: "creator", stage: "call_booked" }),
      crmPerson({ id: "5", name: "Hold", track: "other", stage: "hold" }),
      crmPerson({ id: "6", name: "Blank", track: "founder", stage: null }),
      crmPerson({ id: "7", name: "Queued", track: "creator", stage: "queued" }),
    ]),
  );
  assert.deepEqual(
    people.counts.map((item) => item.stage),
    ["ready", "queued", "im_in", "call_asked", "call_booked", "hold", "unknown"],
  );
  assert.equal(people.counts.find((item) => item.stage === "im_in")?.count, 3);
  assert.equal(people.counts.find((item) => item.stage === "im_in")?.label, "I'm in");
  assert.equal(people.counts.find((item) => item.stage === "unknown")?.count, 1);
  assert.equal(people.counts.find((item) => item.stage === "queued")?.detail, null);
  assert.equal(people.counted, people.total);
  assert.equal(people.warm, 3);
});

test("a lasting yes flag counts I'm in, and LP stays on the real track", () => {
  const people = buildPeople(
    peopleSnapshot([
      crmPerson({ id: "1", name: "Reply", track: "investor", stage: "replied", im_in: false, lp: true }),
      crmPerson({ id: "2", name: "Yes", track: "athlete", stage: "im_in", im_in: true }),
      crmPerson({ id: "3", name: "Asked", track: "founder", stage: "call_asked", im_in: true }),
      crmPerson({ id: "4", name: "Booked", track: "investor", stage: "call_booked", im_in: true, lp: true }),
      crmPerson({ id: "5", name: "Mail", track: "creator", stage: "queued", channel: "email" }),
      crmPerson({ id: "6", name: "Gram", track: "creator", stage: "queued", channel: "ig_dm" }),
      crmPerson({ id: "7", name: "Quiet", track: "lp", stage: "ready", lp: false }),
    ]),
  );
  assert.equal(people.counts.find((item) => item.stage === "im_in")?.count, 3);
  assert.equal(people.counts.find((item) => item.stage === "im_in")?.stageCount, 1);
  assert.equal(people.counts.find((item) => item.stage === "queued")?.detail, "1 email · 1 IG DM");
  assert.equal(people.warm, 4);
  assert.equal(people.tracks.find((item) => item.track === "investor")?.count, 2);
  assert.equal(people.tracks.find((item) => item.track === "lp")?.count, 2);
  assert.equal(people.rows.filter((row) => row.track === "investor" && row.lp).length, 2);
  assert.equal(people.rows.find((row) => row.id === "7")?.lp, false);
  assert.equal(people.counted, 7);
  assert.equal(people.total, 7);
});
