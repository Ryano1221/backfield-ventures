/**
 * Research on a lead: what they said publicly in the last year that gives Ryan
 * a real reason to write. Claude searches and reads public pages (podcast
 * pages and transcripts, interviews, newsletters, their site, and posts on X,
 * LinkedIn or Instagram that search engines show). Everything it reports is
 * checked here before it is kept:
 *   - the page was actually opened during the research, not remembered
 *   - the quote appears word for word in that page's text
 *   - it is dated within the last 365 days
 * Anything that fails is dropped. Nothing found is a normal, honest result.
 */
import type Anthropic from "@anthropic-ai/sdk";
import type { Lead } from "./types";

export const SIGNALS = ["venture_interest", "diversification", "startups", "consumer_brands", "raising", "launch", "hiring", "other"] as const;
export type Signal = (typeof SIGNALS)[number];

export const SIGNAL_LABEL: Record<Signal, string> = {
  venture_interest: "Interested in venture",
  diversification: "Wants to diversify",
  startups: "Curious about startups",
  consumer_brands: "Into consumer brands",
  raising: "Raising or growing",
  launch: "New launch",
  hiring: "Hiring",
  other: "Recent",
};

export const SOURCE_TYPES = ["podcast", "interview", "post", "newsletter", "website", "article", "video", "other"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export type Finding = {
  quote: string;
  /** One plain sentence: why this is a reason to reach out. */
  why: string;
  url: string;
  title: string | null;
  source: SourceType;
  /** YYYY-MM-DD, when they said or published it. */
  date: string;
  signal: Signal;
};

export type LeadResearch = {
  at: string;
  status: "found" | "nothing" | "failed";
  findings: Finding[];
  /** How many reported findings failed the checks and were dropped. */
  dropped: number;
  note: string;
};

export const YEAR_MS = 365 * 86_400_000;

/** What the research actually touched: full text of pages it opened, and text it cited from search. */
export type Evidence = { fetched: Map<string, string>; cited: { url: string; text: string }[]; searched: Set<string> };

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    for (const key of [...u.searchParams.keys()]) if (/^utm_|^fbclid$|^gclid$/.test(key)) u.searchParams.delete(key);
    return `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/$/, "")}${u.search}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/** Compares text ignoring case, spacing, curly quotes and dashes, which pages and models render differently. */
export function flat(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .trim();
}

const SOURCE_SET = new Set<string>(SOURCE_TYPES);
const SIGNAL_SET = new Set<string>(SIGNALS);

/** Keeps only findings that pass every check. Returns the kept ones and how many were dropped. */
export function verifyFindings(raw: unknown[], evidence: Evidence, now: Date): { findings: Finding[]; dropped: number } {
  const fetched = new Map([...evidence.fetched].map(([url, text]) => [normalizeUrl(url), flat(text)]));
  const searched = new Set([...evidence.searched].map(normalizeUrl));
  const cited = evidence.cited.map((c) => ({ url: normalizeUrl(c.url), text: flat(c.text) }));
  const findings: Finding[] = [];
  let dropped = 0;
  for (const item of raw) {
    const f = item as Partial<Record<keyof Finding, unknown>>;
    const quote = typeof f.quote === "string" ? f.quote.trim().replace(/^["'“]|["'”]$/g, "") : "";
    const url = typeof f.url === "string" ? f.url.trim() : "";
    const date = typeof f.date === "string" ? f.date.trim().slice(0, 10) : "";
    const key = normalizeUrl(url);
    const when = Date.parse(`${date}T12:00:00Z`);
    const words = flat(quote).split(" ").length;
    const recent = /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(when) && now.getTime() - when <= YEAR_MS && when - now.getTime() <= 86_400_000;
    const opened = fetched.has(key) || searched.has(key);
    const onPage = (fetched.get(key) ?? "").includes(flat(quote)) || cited.some((c) => c.url === key && c.text.includes(flat(quote)));
    if (!quote || words < 4 || !/^https?:\/\//.test(url) || !recent || !opened || !onPage) {
      dropped++;
      continue;
    }
    if (findings.some((kept) => normalizeUrl(kept.url) === key && flat(kept.quote) === flat(quote))) continue;
    findings.push({
      quote: quote.slice(0, 400),
      why: typeof f.why === "string" ? f.why.trim().slice(0, 240) : "",
      url,
      title: typeof f.title === "string" && f.title.trim() ? f.title.trim().slice(0, 160) : null,
      source: SOURCE_SET.has(String(f.source)) ? (f.source as SourceType) : "other",
      date,
      signal: SIGNAL_SET.has(String(f.signal)) ? (f.signal as Signal) : "other",
    });
  }
  findings.sort((a, b) => b.date.localeCompare(a.date));
  return { findings: findings.slice(0, 6), dropped };
}

/** Pulls the JSON object out of the model's final text (it may wrap it in a code fence). */
export function parseReport(text: string): { findings: unknown[]; note: string } | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? text;
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const data = JSON.parse(fenced.slice(start, end + 1)) as { findings?: unknown; note?: unknown };
    return { findings: Array.isArray(data.findings) ? data.findings : [], note: typeof data.note === "string" ? data.note.slice(0, 300) : "" };
  } catch {
    return null;
  }
}

/** Points for warm, recent signals. Only verified findings count. */
export function researchPoints(research: LeadResearch | null | undefined, kind: "founder" | "partner" | "lp"): { points: number; why: string | null } {
  if (!research || research.status !== "found" || !research.findings.length) return { points: 0, why: null };
  const signals = new Set(research.findings.map((f) => f.signal));
  if (kind === "lp" && (signals.has("venture_interest") || signals.has("diversification"))) return { points: 20, why: "said recently they want into venture or to diversify" };
  if (kind !== "founder" && signals.has("startups")) return { points: 12, why: "talks about startups lately" };
  if (signals.has("venture_interest") || signals.has("consumer_brands") || signals.has("raising")) return { points: 10, why: "a recent, relevant thing they said" };
  return { points: 5, why: "something recent to mention" };
}

/** The research written into the drafting prompt: verified quotes only, with where and when. */
export function researchBrief(research: LeadResearch | null | undefined): string | null {
  if (!research || research.status !== "found" || !research.findings.length) return null;
  return research.findings.map((f) => `- ${f.date}, ${f.source}${f.title ? ` "${f.title}"` : ""}: they said "${f.quote}" (${f.why})`).join("\n");
}

export type Create = (params: Anthropic.Beta.MessageCreateParamsNonStreaming) => Promise<Anthropic.Beta.BetaMessage>;

const GOALS = {
  founder: "Ryan may invest in their company. Look for what they've said about building it, raising money, launches, retail or distribution, and what they want next.",
  partner: "Ryan wants to swap deals with them. Look for what they've said about investing, the kind of companies they like, consumer brands, or angel/syndicate deals.",
  lp: "Ryan wants to invite them to The Handoff, his note on early startups. Look especially for them saying they want to get into venture or angel investing, want to diversify, want better returns, are curious about startups, or wish they had access to early deals.",
} as const;

export function researchPrompt(lead: Lead, today: string, cutoff: string): string {
  const person = lead.people[0]?.name ?? "the person";
  return `Research ${person}${lead.people[0]?.title ? `, ${lead.people[0].title}` : ""} of ${lead.company}${lead.location ? ` (${lead.location})` : ""}${lead.website ? `, website ${lead.website}` : ""}.

Goal: ${GOALS[lead.kind]}

Be thorough. Search their name with the company, and separately for podcast appearances, interviews, talks or videos, a newsletter or Substack, their own site or blog, and posts on X, LinkedIn or Instagram that search results show. Open each promising page with web_fetch and read it. Make sure it is the same person (name plus company, role or city match).

Keep only things this person said or wrote themselves, published between ${cutoff} and ${today}. Skip anything older, anything about a different person with the same name, and anything you can't open and read.

Today is ${today}. When you are done, reply with only this JSON:
{"findings":[{"quote":"exact words copied from the page, 6 to 60 words","why":"one sentence on why this is a good reason for Ryan to reach out","url":"the page you opened","title":"page or episode title","source":"${SOURCE_TYPES.join("|")}","date":"YYYY-MM-DD","signal":"${SIGNALS.join("|")}"}],"note":"one sentence on what you searched and found"}

Copy quotes exactly as they appear on the page you opened; they are checked against the page text and dropped if they don't match. If nothing qualifies, return {"findings":[],"note":"..."}. Never guess or fill gaps.`;
}

/** Everything the research touched, for verification. */
export function collectEvidence(content: Anthropic.Beta.BetaContentBlock[], evidence: Evidence): void {
  for (const block of content) {
    if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
      for (const result of block.content) evidence.searched.add(result.url);
    } else if (block.type === "web_fetch_tool_result" && block.content.type === "web_fetch_result") {
      const source = block.content.content.source;
      if (source.type === "text") evidence.fetched.set(block.content.url, source.data);
      else evidence.searched.add(block.content.url);
    } else if (block.type === "text") {
      for (const citation of block.citations ?? []) {
        if (citation.type === "web_search_result_location") evidence.cited.push({ url: citation.url, text: citation.cited_text });
      }
    }
  }
}


export async function runResearch(lead: Lead, now: Date, create: Create): Promise<LeadResearch> {
  const at = now.toISOString();
  if (!lead.people.length) return { at, status: "nothing", findings: [], dropped: 0, note: "No named person to research." };
  const call = create;
  const today = at.slice(0, 10);
  const cutoff = new Date(now.getTime() - YEAR_MS).toISOString().slice(0, 10);
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: researchPrompt(lead, today, cutoff) }];
  const evidence: Evidence = { fetched: new Map(), cited: [], searched: new Set() };
  try {
    let response: Anthropic.Beta.BetaMessage | null = null;
    // Server tools pause after a set number of steps; resend to let the search carry on.
    for (let round = 0; round < 4; round++) {
      response = await call({
        model: "claude-opus-5-5",
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium" },
        tools: [
          { type: "web_search_20260209", name: "web_search", max_uses: 10 },
          { type: "web_fetch_20260209", name: "web_fetch", max_uses: 8, max_content_tokens: 30000 },
        ],
        messages,
      });
      collectEvidence(response.content, evidence);
      if (response.stop_reason !== "pause_turn") break;
      messages.push({ role: "assistant", content: response.content as Anthropic.Beta.BetaContentBlockParam[] });
    }
    if (!response || response.stop_reason === "refusal" || response.stop_reason === "pause_turn") return { at, status: "failed", findings: [], dropped: 0, note: "The research did not finish." };
    const text = response.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
    const report = parseReport(text);
    if (!report) return { at, status: "failed", findings: [], dropped: 0, note: "The research answer could not be read." };
    const { findings, dropped } = verifyFindings(report.findings, evidence, now);
    return { at, status: findings.length ? "found" : "nothing", findings, dropped, note: report.note || (findings.length ? "" : "Nothing from the last year that checks out.") };
  } catch (error) {
    const status = error && typeof error === "object" && "status" in error ? ` (${String((error as { status: unknown }).status)})` : "";
    console.error(`lead research failed${status}`);
    return { at, status: "failed", findings: [], dropped: 0, note: "The research request failed." };
  }
}
