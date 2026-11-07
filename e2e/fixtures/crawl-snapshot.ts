import { validateSnapshot } from "../../src/lib/os/schema";
import type { Snapshot } from "../../src/lib/os/types";

/**
 * Local crawler snapshot. Every name, domain, and address is invented.
 * Field names follow the production snapshot shape. No production values are copied.
 */
export function buildCrawlSnapshot(): Snapshot {
  const result = validateSnapshot(rawSnapshot());
  if (!result.ok) throw new Error(result.issues.join("\n"));
  return result.snapshot;
}

export function crawlPaths(snapshot: Snapshot): string[] {
  const paths = [
    "/os",
    "/os/deals",
    "/os/pipeline",
    "/os/crm",
    "/os/bots",
    "/os/activity",
    "/os/waiting",
    "/os/leads",
    "/os/email",
    "/os/email/subscribers",
    "/os/email/compose",
    "/os/email/templates",
    "/os/email/lead-magnets",
    "/os/email/signup-forms",
    "/os/email/lists/handoff",
    "/os/email/lists/best-3",
    "/os/email/sending-domain",
    "/os/email/settings",
  ];
  for (const pitch of snapshot.pitches) {
    paths.push(`/os/deals/${encodeURIComponent(pitch.id || `pitch:${pitch.company}`)}`);
  }
  for (const person of snapshot.crm.people) paths.push(`/os/crm/${encodeURIComponent(person.id)}`);
  for (const decision of snapshot.decisions) {
    if (decision.id) paths.push(`/os/d/${encodeURIComponent(decision.id)}`);
  }
  return paths;
}

export const EDGE_NEEDLES = ["LONGTOKEN", "Café", "Decknote", "Bare Sample"];

const HASH = "ab".repeat(32);
const WHEN = "2026-11-05T12:00:00.000Z";

function rawSnapshot() {
  return {
    generated_at: WHEN,
    pitches: pitches(),
    bots: {
      built_at: WHEN,
      today: "2026-11-05",
      bots: bots(),
      routines: [
        { name: "Example morning sweep", status: "ok", last: "Today", note: "Fake routine for the crawler." },
        { name: "Example failed sweep", status: "failed", last: "Yesterday", note: "Fake failure for the crawler." },
        { name: "Example overdue sweep", status: "ok", last: "Last week", next: "2020-01-01T00:00:00.000Z", note: "Fake overdue routine." },
      ],
      pulse: { as_of: WHEN, titles: [] as string[] },
      usage: {
        captured_at: WHEN,
        source: "example crawl",
        plan: "example",
        weekly_used_pct: 12.5,
        weekly_reset: "Mon Nov 9",
        weekly_last_reset: "2026-11-02T00:00:00.000Z",
        on_demand: "example",
        on_demand_cycle_usd: 3.5,
        on_demand_note: "Fake usage note.",
        on_demand_reset: "2026-12-01",
        share_window: "7d",
        per_bot_available: false,
        per_bot_note: "Fake per-bot note.",
        routine_shares: [[], ["sample", "4"]],
        not_from_routine_pct_all_teams: 10,
      },
    },
    outreach: [
      { track: "example_athlete", sent: 2, floor: 5, label: "Example athlete" },
      { track: "example_creator", sent: 1, floor: 3, label: "Example creator" },
      { track: "example_founder", sent: 0, floor: 0, label: "Example founder" },
      { track: "example_family", sent: 4, floor: 4 },
      { track: "example_lp", sent: 1, floor: 2 },
      { track: "example_other", sent: 0, floor: 1 },
    ],
    decisions: decisions(),
    activity: [
      { timestamp: WHEN, actor: "Fixture Executive", summary: "Filed an example decision." },
      { timestamp: "2026-11-05T11:00:00.000Z", actor: "Fixture Investment Lead", summary: "Reviewed example pitch 3." },
      { timestamp: "2026-11-04T16:00:00.000Z", actor: "Fixture Café Bot", summary: "Logged a fake unicode result." },
      { timestamp: "2026-11-04T15:00:00.000Z", actor: "Fixture Executive", summary: "Example activity with a long note about the sample office and nothing else." },
      { timestamp: "2026-11-03T15:00:00.000Z", actor: "sample_crawl", summary: "Example handoff recorded." },
      { timestamp: "2026-11-02T15:00:00.000Z", actor: "Fixture Executive", summary: "Closed an example loop." },
    ],
    interactions: interactions(),
    crm: { people: people() },
  };
}

function pitches() {
  const statuses = ["new", "reviewing", "passed", "advanced"] as const;
  const ratings = ["great", "good", "maybe", "no", null] as const;
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < 60; i++) {
    const month = String((i % 8) + 1).padStart(2, "0");
    const day = String((i % 27) + 1).padStart(2, "0");
    const row: Record<string, unknown> = {
      company: `Example Pitch ${i + 1}`,
      received: i % 4 === 0 ? `2026-${month}-${day}` : `2026-${month}-${day}T15:04:00.000Z`,
      status: statuses[i % statuses.length],
      score: i % 7 === 0 ? null : Math.round(i * 1.7 * 10) / 10,
      sector: i % 6 === 0 ? null : "Sample goods",
      stage: i % 5 === 0 ? null : "seed",
      source: i % 3 === 0 ? null : "example crawl",
      deck: null,
      domain: null,
      website: null,
      logo_url: null,
      deck_url: null,
      deck_note: null,
      ryan_rating: ratings[i % ratings.length],
      id: `pitch_example_${String(i).padStart(2, "0")}`,
    };
    if (i % 4 !== 0) row.title = `Sample title ${i + 1}`;
    if (i % 4 !== 1) row.summary = `Fake summary for example pitch ${i + 1}.`;
    rows.push(row);
  }
  rows.push({
    company: `Fixture ${"Sample Company ".repeat(8)}`.trim().slice(0, 180),
    title: "Example long name",
    received: "2026-04-04T12:00:00.000Z",
    status: "reviewing",
    score: 3.5,
    sector: "Sample goods",
    stage: "seed",
    source: "example crawl",
    summary: "Fake company with a very long name for the crawler.",
    deck: null,
    domain: null,
    website: null,
    logo_url: null,
    deck_url: null,
    deck_note: null,
    ryan_rating: null,
    id: "pitch_long_name",
  });
  rows.push({
    company: `Fixture LONGTOKEN${"X".repeat(48)}`,
    title: "Example unbroken token",
    received: "2026-05-05",
    status: "new",
    score: 1,
    sector: "Sample goods",
    stage: null,
    source: "example crawl",
    summary: "Fake company whose name has no spaces.",
    deck: null,
    domain: null,
    website: null,
    logo_url: null,
    id: "pitch_longtoken",
  });
  rows.push({
    company: "Fixture Café Sample · 北野",
    title: "Naïve example — サンプル",
    received: "2026-06-06T12:00:00.000Z",
    status: "reviewing",
    score: 8.25,
    sector: "Example care",
    stage: "seed",
    source: "example crawl",
    summary: "Fake unicode company used only by the local crawler.",
    deck: null,
    domain: null,
    website: null,
    logo_url: null,
    deck_url: null,
    deck_note: null,
    ryan_rating: null,
    id: "pitch_unicode",
  });
  rows.push({
    company: "Fixture Bare Sample",
    received: "2026-03-03",
    status: "new",
    score: null,
    sector: null,
    stage: null,
    source: null,
    deck: null,
    domain: null,
    website: null,
    logo_url: null,
    deck_url: null,
    deck_note: null,
    ryan_rating: null,
    id: "pitch_bare",
  });
  rows.push({
    company: "Fixture Decknote Sample",
    title: "Example deck note",
    received: "2026-07-07T12:00:00.000Z",
    status: "reviewing",
    score: 4,
    sector: "Sample goods",
    stage: "seed",
    source: "example crawl",
    summary: "Fake company whose deck is a note, not a link.",
    deck: null,
    domain: null,
    website: null,
    logo_url: null,
    deck_url: null,
    deck_note: "Example note. This deck is not a link in the snapshot.",
    ryan_rating: null,
    id: "pitch_decknote",
  });
  rows.push({
    company: "Fixture Harbor Sample",
    title: "Example filled pitch",
    received: "2026-11-01T15:00:00.000Z",
    status: "reviewing",
    score: 7.5,
    deck: null,
    sector: "Sample goods",
    stage: "seed",
    source: "example crawl",
    summary: "A fake company used only by the local crawler.",
    domain: "example.com",
    website: "https://example.com/harbor",
    logo_url: null,
    deck_url: "https://example.com/harbor-deck",
    deck_note: null,
    field_sources: { domain: "example", website: "example" },
    id: "pitch_harbor",
    ryan_rating: "good",
    founder: "Fixture Founder Example",
  });
  return rows;
}

function bots() {
  const rooms: [string, string][] = [
    ["investment", "Investment"],
    ["intelligence", "Intelligence"],
    ["network", "Network"],
    ["growth", "Growth"],
    ["firm_os", "Firm OS"],
    ["executive", "Executive"],
  ];
  const statuses = ["needs a decision", "working", "idle", "paused"];
  const rows: Record<string, unknown>[] = [];
  rooms.forEach(([director, team], roomIndex) => {
    rows.push({
      name: director === "executive" ? "Fixture Executive" : `Fixture ${team} Lead`,
      slug: `fixture_${director}`,
      team,
      role: director === "executive" ? "Executive" : "Director",
      scope: "Fake seat for the local crawler.",
      registry_status: "active",
      status: "needs a decision",
      last: "Today",
      last_iso: WHEN,
      source: "example crawl",
      result: "Waiting on an example decision.",
      usage_share: 4 + roomIndex,
      director,
    });
    for (let n = 1; n <= 6; n++) {
      const index = roomIndex * 6 + n;
      if (roomIndex === 0 && n === 1) {
        rows.push({
          name: `Fixture ${"Sample Bot ".repeat(6)}`.trim().slice(0, 110),
          slug: "fixture_long_bot",
          team,
          role: "Specialist",
          scope: "Fake long name.",
          registry_status: "active",
          status: "working",
          last: "Today",
          last_iso: WHEN,
          source: "example crawl",
          result: "Example result for a long fake name.",
          usage_share: 1,
          director,
        });
        continue;
      }
      if (roomIndex === 0 && n === 2) {
        rows.push({
          name: "Fixture Café Bot · 研究",
          slug: "fixture_unicode_bot",
          team,
          role: "Specialist",
          status: "idle",
          last_iso: null,
          usage_share: null,
          source: "example crawl",
          result: "Fake unicode result.",
          director,
        });
        continue;
      }
      if (roomIndex === 0 && n === 3) {
        rows.push({ name: "Fixture Bare Bot", team, status: "idle" });
        continue;
      }
      rows.push({
        name: `Fixture ${team} ${n}`,
        slug: `fixture_${director}_${n}`,
        team,
        role: "Specialist",
        scope: "Fake specialist for the local crawler.",
        registry_status: "active",
        status: statuses[index % statuses.length],
        last: "Today",
        last_iso: WHEN,
        source: "example crawl",
        result: `Example result ${n} for ${team}.`,
        usage_share: n,
        director,
      });
    }
  });
  return rows;
}

function decisions() {
  return [
    {
      title: "Example decision for Fixture Quinn",
      since: "2026-11-04T15:00:00.000Z",
      link: null,
      id: "dec_full",
      context: "Fake decision for the local crawler.",
      summary: "Example summary. Nothing here is a real company.",
      domain: null,
      logo_url: null,
      requested_by: "Fixture Executive",
      created_at: "2026-11-04T15:00:00.000Z",
      options: [
        { value: "approve", label: "Approve" },
        { value: "not_now", label: "Not now" },
      ],
      to_email: "quinn.example@example.com",
      cc: "desk@example.com",
      subject: "Example subject",
      thread_id: "thread-example-1",
      reply_to_msg_id: "msg-example-1",
      channel: "email",
      person: {
        name: "Fixture Quinn Example",
        company: "Fixture Harbor Sample",
        what_they_do: "Makes sample goods",
        reach: "Example city",
        source: "example crawl",
        block_check: { blocked: false, at: WHEN, by: "email and name", reason: "Example check." },
      },
      their_words: { quote: "An example question?", at: "2026-11-04T16:00:00.000Z", at_et: "Wed Nov 4, 11:00 AM ET", source: "example crawl", approx: true },
      timeline: [
        { at: "2026-11-03T15:00:00.000Z", at_et: "Tue Nov 3, 10:00 AM ET", event: "You sent the example note", source: "example crawl", approx: false },
        { at: "2026-11-04T16:00:00.000Z", at_et: "Wed Nov 4, 11:00 AM ET", event: "Fixture Quinn replied with a question", source: "example crawl", approx: true },
      ],
      why_ryan: "Example reason this fake decision is on the desk.",
      body_formatted: "Hello Fixture Quinn,\n\nThis is example copy for the local crawler.\n\nBest,",
      context_raw: "Example raw context.",
      checks: ["Not blocked", "Example check"],
      exact_message: "Hello Fixture Quinn. This is example copy.",
      detail: {
        kind: "example",
        picks: [
          {
            slug: "example-harbor",
            name: "Fixture Harbor Sample",
            one_liner: "Fake sample goods.",
            category: "Sample",
            stage: "seed",
            location: null,
            score: "7.5",
            why: "Example reason.",
            concerns: "Example concern.",
            source: "example crawl",
            website: "https://example.com/harbor",
            facts: [{ label: "Example", value: "Sample fact", source_note: "example" }],
          },
        ],
        candidates: [
          {
            slug: "example-cedar",
            name: "Fixture Cedar Sample",
            one_liner: "Another fake company.",
            category: "Sample",
            stage: "seed",
            location: "Example City",
            score: "4",
            why: "Example alternate.",
            concerns: null,
            source: "example crawl",
            website: null,
            facts: [],
          },
        ],
        preview: {
          subject: "Example subject",
          to_label: "Fixture Quinn Example",
          text: "Example body. Nothing sends.",
          html: "<p>Example body.</p>",
          attachment_label: "Example attachment",
          version: "example-1",
          hash: HASH,
          hash_note: "Example checksum. Not a real message.",
          attachment_hash: HASH,
        },
      },
    },
    {
      title: "Example minimal decision",
      since: "2026-10-01T12:00:00.000Z",
      link: null,
      id: "dec_min",
    },
    {
      title: "Example empty lists",
      since: "2026-10-02T12:00:00.000Z",
      link: null,
      id: "dec_empty",
      options: [],
      checks: [],
      timeline: [],
      detail: { kind: "example", picks: [], candidates: [] },
    },
    {
      title: `Fixture ${"example decision ".repeat(12)}`.trim().slice(0, 240),
      since: "2026-10-03T12:00:00.000Z",
      link: null,
      id: "dec_long",
      summary: "Fake long title for the crawler.",
      options: [
        { value: "approve", label: "Approve" },
        { value: "not_now", label: "Not now" },
      ],
    },
  ];
}

function interactions() {
  const kinds = ["packet", "amendment", "result", "message"] as const;
  return Array.from({ length: 8 }, (_, i) => ({
    timestamp: `2026-11-0${(i % 5) + 1}T1${i}:00:00.000Z`,
    from: i % 2 === 0 ? "Fixture Executive" : "Fixture Investment Lead",
    to: i % 2 === 0 ? "Fixture Investment Lead" : "Fixture Executive",
    kind: kinds[i % kinds.length],
    packet_id: i === 3 ? null : `pkt_example_${i}`,
    title: `Example handoff ${i + 1}`,
    status: i === 5 ? null : "example",
  }));
}

function people() {
  const tracks = ["investor", "family_office", "athlete", "creator", "real_estate", "lp", "founder", "other"] as const;
  const rows: Record<string, unknown>[] = [
    {
      id: "person_quinn",
      name: "Fixture Quinn Example",
      firm: "Fixture Harbor Sample",
      track: "investor",
      stage: "contacted",
      owner: "Example owner",
      last_touch_at: "2026-11-01T15:00:00.000Z",
      last_touch_channel: "email",
      next_step: "Send the example follow-up",
      next_step_due: null,
      email: "quinn.example@example.com",
      linkedin: null,
      notes: "Fake person for the local crawler.",
      im_in: false,
      lp: true,
      domain: null,
    },
    {
      id: "person_long",
      name: `Fixture ${"Sample Person ".repeat(6)}`.trim().slice(0, 110),
      firm: "Example Long Firm",
      track: "founder",
      stage: "ready",
      owner: null,
      last_touch_at: null,
      last_touch_channel: null,
      next_step: "Example next step",
      next_step_due: "2026-12-01",
      email: "long.person@example.com",
      linkedin: "https://example.com/in/fixture-long",
      notes: null,
      im_in: true,
      lp: false,
      domain: "example.com",
    },
    {
      id: "person_unicode",
      name: "Fixture José Sample · 李",
      firm: null,
      track: "creator",
      stage: "replied",
      owner: "Example owner",
      last_touch_at: "2026-10-10T12:00:00.000Z",
      last_touch_channel: "note",
      next_step: null,
      next_step_due: null,
      email: "jose.sample@example.com",
      linkedin: null,
      notes: "Fake unicode person.",
      domain: null,
      logo_url: null,
    },
    {
      id: "person_bare",
      name: "Fixture Bare Person",
      firm: null,
      track: "other",
      stage: null,
      owner: null,
      last_touch_at: null,
      last_touch_channel: null,
      next_step: null,
      next_step_due: null,
      email: null,
      linkedin: null,
      notes: null,
    },
  ];
  for (let i = 0; i < tracks.length; i++) {
    rows.push({
      id: `person_track_${tracks[i]}`,
      name: `Fixture ${tracks[i].replaceAll("_", " ")} Example`,
      firm: "Example Firm",
      track: tracks[i],
      stage: "queued",
      owner: "Example owner",
      last_touch_at: "2026-09-09T12:00:00.000Z",
      last_touch_channel: "email",
      next_step: "Example step",
      next_step_due: null,
      email: `${tracks[i].replaceAll("_", ".")}@example.com`,
      linkedin: null,
      notes: "Fake track row.",
      im_in: false,
      lp: tracks[i] === "lp",
      domain: null,
    });
  }
  return rows;
}
