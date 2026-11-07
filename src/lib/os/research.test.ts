import assert from "node:assert/strict";
import test from "node:test";
import type Anthropic from "@anthropic-ai/sdk";
import { collectEvidence, parseReport, researchBrief, researchPoints, runResearch, verifyFindings, type Evidence, type LeadResearch } from "./leads/research";
import { scoreLead, learnTaste } from "./leads/score";
import type { Lead } from "./leads/types";
import { autoEligible } from "./outreach/plan";
import { DEFAULT_SETTINGS, EMPTY_OUTREACH } from "./outreach/types";

const NOW = new Date("2026-11-07T12:00:00Z");
const PAGE = "Episode 42. Fixture Person: Honestly I’ve wanted to get into early-stage investing for years but never had access to good deals. Host: why?";

function evidence(): Evidence {
  return { fetched: new Map([["https://podcast.example/ep42?utm_source=x", PAGE]]), cited: [{ url: "https://news.example/a", text: "Fixture Person said she plans to diversify beyond public markets this year." }], searched: new Set(["https://news.example/a"]) };
}

const finding = (over: Record<string, unknown> = {}) => ({
  quote: "I've wanted to get into early-stage investing for years but never had access to good deals",
  why: "Wants access to early deals.",
  url: "https://www.podcast.example/ep42/",
  title: "Episode 42",
  source: "podcast",
  date: "2026-06-01",
  signal: "venture_interest",
  ...over,
});

test("only findings from opened pages, quoted word for word, from the last year are kept", () => {
  const { findings, dropped } = verifyFindings(
    [
      finding(),
      finding({ quote: "I want to invest in venture funds right now", why: "made up" }),
      finding({ date: "2025-10-01" }),
      finding({ date: "2027-01-01" }),
      finding({ url: "https://never-opened.example/x" }),
      finding({ url: "https://news.example/a", quote: "plans to diversify beyond public markets this year", signal: "diversification", date: "2026-03-01", source: "article" }),
      finding({ quote: "early-stage investing" }),
    ],
    evidence(),
    NOW,
  );
  assert.deepEqual(findings.map((f) => f.signal), ["venture_interest", "diversification"]);
  assert.equal(dropped, 5);
  assert.equal(findings[0].quote, "I've wanted to get into early-stage investing for years but never had access to good deals");
});

test("the report JSON is read even inside a code fence", () => {
  assert.deepEqual(parseReport('Here you go:\n```json\n{"findings":[{"quote":"a"}],"note":"searched 5 places"}\n```'), { findings: [{ quote: "a" }], note: "searched 5 places" });
  assert.equal(parseReport("no json here"), null);
});

function lead(over: Partial<Lead> = {}): Lead {
  return {
    id: "lead_lp_fixture",
    kind: "lp",
    key: "lp:fixture",
    company: "Example Family Office",
    people: [{ name: "Fixture Person", title: null }],
    website: null,
    location: "Austin, TX",
    signals: [],
    contacts: [{ email: "fp@example.com", name: "Fixture Person", source: "import", confidence: "high", note: "" }],
    score: 0,
    reasons: [],
    draft: null,
    status: "new",
    to: "fp@example.com",
    source: "Added by you",
    source_url: null,
    note: "",
    found_at: "2026-11-01T00:00:00.000Z",
    updated_at: "2026-11-01T00:00:00.000Z",
    ...over,
  };
}

test("a pause in the search resumes, and every page it opened becomes evidence", async () => {
  const calls: Anthropic.Beta.MessageCreateParamsNonStreaming[] = [];
  const responses = [
    {
      stop_reason: "pause_turn",
      content: [
        { type: "server_tool_use", id: "s1", name: "web_search", input: { query: "Fixture Person podcast" } },
        { type: "web_search_tool_result", tool_use_id: "s1", content: [{ type: "web_search_result", url: "https://www.podcast.example/ep42", title: "Ep 42", encrypted_content: "x", page_age: null }] },
        { type: "web_fetch_tool_result", tool_use_id: "f1", content: { type: "web_fetch_result", url: "https://podcast.example/ep42", retrieved_at: null, content: { type: "document", source: { type: "text", media_type: "text/plain", data: PAGE }, citations: null, title: null } } },
      ],
    },
    { stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify({ findings: [finding(), finding({ quote: "I am definitely going to invest in your fund", why: "invented" })], note: "Found one podcast." }), citations: null }] },
  ];
  const create = async (params: Anthropic.Beta.MessageCreateParamsNonStreaming) => {
    calls.push(structuredClone(params));
    return responses[calls.length - 1] as unknown as Anthropic.Beta.BetaMessage;
  };
  const research = await runResearch(lead(), NOW, create);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].messages.length, 2, "the paused turn is sent back to resume");
  assert.equal(research.status, "found");
  assert.equal(research.findings.length, 1);
  assert.equal(research.dropped, 1);
  assert.match(String(calls[0].messages[0].content), /published between 2025-11-07 and 2026-11-07/);
  assert.deepEqual(calls[0].tools?.map((t) => (t as { type: string }).type), ["web_search_20260209", "web_fetch_20260209"]);

  const failing = await runResearch(lead(), NOW, async () => {
    throw Object.assign(new Error("boom"), { status: 529 });
  });
  assert.equal(failing.status, "failed");
  assert.equal((await runResearch(lead({ people: [] }), NOW, create)).status, "nothing");
});

test("citations from search count as evidence too", () => {
  const ev: Evidence = { fetched: new Map(), cited: [], searched: new Set() };
  collectEvidence([{ type: "text", text: "x", citations: [{ type: "web_search_result_location", url: "https://news.example/a", cited_text: "quoted", encrypted_index: "", title: null }] }] as unknown as Anthropic.Beta.BetaContentBlock[], ev);
  assert.deepEqual(ev.cited, [{ url: "https://news.example/a", text: "quoted" }]);
});

test("warm signals lift the score, feed the draft, and autopilot waits for research", () => {
  const research: LeadResearch = { at: NOW.toISOString(), status: "found", dropped: 0, note: "", findings: [{ quote: "I want into early-stage investing", why: "Wants access.", url: "https://podcast.example/ep42", title: "Episode 42", source: "podcast", date: "2026-06-01", signal: "venture_interest" }] };
  assert.deepEqual(researchPoints(research, "lp"), { points: 20, why: "said recently they want into venture or to diversify" });
  assert.equal(researchPoints({ ...research, status: "nothing", findings: [] }, "lp").points, 0);
  const plain = scoreLead(lead(), learnTaste([]));
  const warm = scoreLead(lead({ research }), learnTaste([]));
  assert.equal(warm.score - plain.score, 20);
  assert.match(researchBrief(research) ?? "", /2026-06-01, podcast "Episode 42": they said "I want into early-stage investing"/);

  const on = { ...EMPTY_OUTREACH, settings: { ...DEFAULT_SETTINGS, enabled: true, threshold: 50 } };
  const ready = lead({ score: 90 });
  assert.ok(!autoEligible(ready, on, true), "not researched yet");
  assert.ok(autoEligible({ ...ready, research }, on, true));
  assert.ok(autoEligible({ ...ready, research: { ...research, status: "nothing", findings: [] } }, on, true), "nothing found still goes, with the plain facts");
  assert.ok(autoEligible(ready, on, false), "without research turned on, no wait");
});
