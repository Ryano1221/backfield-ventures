import { storedDecisionAnswer, type AnswerLabel } from "./decision-merge";
import { decisionKey } from "./decision-id";
import { displayParty } from "./interactions";
import { botPaused, isSnoozed } from "./overlays";
import { blankToNull, shortTitle } from "./present";
import { pitchTarget } from "./pitch-rate";
import type { BotRecord, CrmPerson, Decision, DecisionDetail, DecisionEvent, Interaction, OsAction, Pitch, PitchRating, Snapshot } from "./types";

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

const STAGE_LABEL: Record<string, string> = {
  ready: "Ready",
  queued: "Queued",
  contacted: "Contacted",
  nudged: "Nudged",
  replied: "Replied",
  im_in: "I'm in",
  call_asked: "Call asked",
  call_booked: "Call booked",
  call_held: "Call held",
  one_pager_sent: "One-pager sent",
  data_room: "Data room",
  soft_circle: "Soft circle",
  docs: "Docs",
  committed: "Committed",
  closed: "Closed",
  hold: "On hold",
  bounced: "Bounced",
  do_not_contact: "Do not contact",
  passed: "Passed",
  unknown: "Unknown",
};

const TRACK_LABEL: Record<string, string> = {
  athlete: "Athlete",
  family_office: "Family office",
  creator: "Creator",
  other: "Other",
  real_estate: "Real estate",
  investor: "Investor",
  lp: "LP",
  founder: "Founder",
};

const STAGE_ORDER = [
  "ready",
  "queued",
  "contacted",
  "nudged",
  "replied",
  "call_asked",
  "call_booked",
  "call_held",
  "one_pager_sent",
  "data_room",
  "soft_circle",
  "docs",
  "committed",
  "closed",
  "im_in",
  "hold",
  "bounced",
  "do_not_contact",
  "passed",
  "unknown",
];
const WARM = new Set(["replied", "im_in", "call_asked", "call_booked"]);
const ROOM_NAME: Record<string, string> = {
  executive: "Executive",
  network: "Network",
  investment: "Investment",
  intelligence: "Intelligence",
  growth: "Growth",
  firm_os: "Firm OS",
};

export type DeskLink = {
  kind: "pitch" | "person";
  id: string;
  name: string;
  detail: string | null;
  domain: string | null;
  logoUrl: string | null;
  stage: string | null;
};

export type DeskFact = { label: string; value: string };

export type DeskQuote = {
  text: string;
  at: string | null;
  summary: boolean;
};

export type DeskTimelineRow = {
  at: string | null;
  event: string;
  tone: "you" | "them" | "pend";
};

export type DeskDecision = {
  id: string;
  name: string;
  org: string | null;
  summary: string | null;
  happened: string | null;
  why: string | null;
  quote: DeskQuote | null;
  timeline: DeskTimelineRow[];
  message: string | null;
  channel: string | null;
  channelCrumb: string | null;
  waiting: string | null;
  drafted: string | null;
  hold: boolean;
  reply: boolean;
  toName: string | null;
  toEmail: string | null;
  toDetail: string | null;
  cc: string | null;
  subject: string | null;
  fromLine: string | null;
  checks: string[];
  details: DeskFact[];
  personFacts: DeskFact[];
  logoUrl: string | null;
  domain: string | null;
  approveChoice: string;
  approveLabel: string;
  options: { value: string; label: string }[];
  detail: DecisionDetail | null;
  notNow: { kind: "decide"; choice: string } | { kind: "snooze" };
  linked: DeskLink[];
  pending: boolean;
  outcome: { label: AnswerLabel; at: string } | null;
  exactMessage: string | null;
  requestedBy: string | null;
};

export type SettledDecision = {
  id: string;
  name: string;
  label: AnswerLabel;
  at: string;
};

export type DealSource = { field: string; label: string; source: string };

export type DeskDeal = {
  id: string;
  company: string;
  title: string | null;
  summary: string | null;
  sector: string | null;
  stage: string | null;
  score: number | null;
  pips: number | null;
  waiting: string | null;
  received: string;
  founder: string | null;
  domain: string | null;
  website: string | null;
  deckUrl: string | null;
  deckNote: string | null;
  logoUrl: string | null;
  status: string;
  statusLabel: string;
  source: string | null;
  loggedRating: PitchRating | null;
  generatedAt: string;
  sources: DealSource[];
};

export type WaitingBot = { name: string; ask: string; slug: string };

export type Kpi = { label: string; value: string; small: string | null; sub: string | null };

export type TodayModel = {
  hasSnapshot: boolean;
  weekday: string | null;
  headline: string;
  headlineDim: string | null;
  lede: string | null;
  instruction: string | null;
  kpis: Kpi[];
  ready: DeskDecision[];
  hold: DeskDecision[];
  open: DeskDecision[];
  settled: SettledDecision[];
  deals: DeskDeal[];
  pitchCount: number;
  reviewingCount: number;
  waiting: WaitingBot[];
  peopleCount: number;
  stamp: string | null;
  snapshotLabel: string | null;
};

export type PeopleRow = {
  id: string;
  name: string;
  firm: string | null;
  track: string;
  trackLabel: string;
  stage: string | null;
  stageLabel: string | null;
  warm: boolean;
  imIn: boolean;
  lp: boolean;
  last: string | null;
  lastAge: string | null;
  next: string | null;
  domain: string | null;
  logoUrl: string | null;
};

export type PersonModel = {
  id: string;
  name: string;
  firm: string | null;
  email: string | null;
  website: string | null;
  linkedin: string | null;
  track: string | null;
  trackLabel: string | null;
  stage: string | null;
  stageLabel: string | null;
  owner: string | null;
  last: string | null;
  next: string | null;
  nextWhen: string | null;
  notes: string | null;
  call: boolean;
  domain: string | null;
  logoUrl: string | null;
  tags: string[];
  history: { when: string; what: string; source: string | null; kind: "next" | "past" | "key" }[];
};

export type OfficeBot = {
  slug: string;
  name: string;
  team: string;
  role: string;
  status: "Working" | "Needs Ryan" | "Idle" | "Paused" | "Degraded" | "Failed";
  statusLabel: string;
  last: string;
  result: string;
  scope: string;
  source: string;
  usage: number | null;
};

export type OfficeEvent = {
  ts: string;
  at: string;
  f: string;
  t: string;
  kind: Interaction["kind"];
  status: string | null;
  title: string;
  full: string;
};

export type OfficeData = {
  built: string;
  built_ct: string;
  bots: OfficeBot[];
  events: OfficeEvent[];
};

export function countWords(n: number): string {
  if (n >= 0 && n < WORDS.length) return WORDS[n]!;
  return n.toLocaleString("en-US");
}

export function sentence(value: string): string {
  return value
    .replace(/[ \t]*[—–][ \t]*/g, ", ")
    .replace(/[^\S\n]{2,}/g, " ")
    .trim();
}

export function daySentence(input: { replies: number; holds: number; deals: number; waitingBots: number }): string | null {
  const parts: string[] = [];
  if (input.replies && input.holds) {
    parts.push(
      `${cap(countWords(input.replies))} ${input.replies === 1 ? "reply is" : "replies are"} ready for your yes, and ${countWords(input.holds)} ${input.holds === 1 ? "pack is" : "packs are"} on hold.`,
    );
  } else if (input.replies) {
    parts.push(`${cap(countWords(input.replies))} ${input.replies === 1 ? "reply is" : "replies are"} ready for your yes.`);
  } else if (input.holds) {
    parts.push(`${cap(countWords(input.holds))} ${input.holds === 1 ? "pack is" : "packs are"} on hold.`);
  }
  if (input.deals) parts.push(`${cap(countWords(input.deals))} ${input.deals === 1 ? "deal is" : "deals are"} in review.`);
  if (input.waitingBots) parts.push(`${cap(countWords(input.waitingBots))} ${input.waitingBots === 1 ? "bot is" : "bots are"} waiting on you.`);
  return parts.length ? parts.join(" ") : null;
}

export function headlineLines(replies: number, holds: number, other: number): { lead: string; dim: string | null } {
  if (!replies && !holds && !other) return { lead: "Nothing needs you.", dim: null };
  if (replies && holds) {
    return {
      lead: `${replies.toLocaleString("en-US")} ${replies === 1 ? "reply is" : "replies are"} ready.`,
      dim: `${holds.toLocaleString("en-US")} ${holds === 1 ? "pack is" : "packs are"} on hold.`,
    };
  }
  if (replies) return { lead: `${replies.toLocaleString("en-US")} ${replies === 1 ? "reply is" : "replies are"} ready.`, dim: null };
  if (holds) return { lead: `${holds.toLocaleString("en-US")} ${holds === 1 ? "pack is" : "packs are"} on hold.`, dim: null };
  return { lead: `${other.toLocaleString("en-US")} ${other === 1 ? "decision needs" : "decisions need"} you.`, dim: null };
}

export function formatCt(value: string | null | undefined, withTime = true): string | null {
  const raw = blankToNull(value);
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split("-").map(Number);
    const date = new Date(Date.UTC(year || 1970, (month || 1) - 1, day || 1));
    const label = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(date);
    return label;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    hour: withTime ? "numeric" : undefined,
    minute: withTime ? "2-digit" : undefined,
    hour12: true,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  if (!withTime) return `${get("month")} ${get("day")}`;
  const period = get("dayPeriod").toLowerCase().replace(/\./g, "");
  return `${get("month")} ${get("day")}, ${get("hour")}:${get("minute")}${period} CT`;
}

export function formatCtStamp(value: string | null | undefined, kind: "quote" | "row", approx = false): string | null {
  const raw = blankToNull(value);
  if (!raw || /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const day = formatCt(raw, false);
    return day;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const period = get("dayPeriod").toLowerCase().replace(/\./g, "");
  const time = `${approx ? "~" : ""}${get("hour")}:${get("minute")}${period}`;
  if (kind === "row") return `${get("weekday")} ${get("month")} ${get("day")} · ${time} CT`;
  return `${get("weekday")} ${get("month")} ${get("day")}, ${time} CT`;
}

/** Calendar day in Chicago for the clock, not the snapshot stamp. */
export function todayLine(now = Date.now()): string {
  return weekdayCt(new Date(now).toISOString()) || "Today";
}

export function weekdayCt(value: string | null | undefined): string | null {
  const raw = blankToNull(value);
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
    month: "short",
    day: "numeric",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("weekday")}, ${get("month")} ${get("day")}`;
}

export function waitingLabel(since: string | null | undefined, nowIso: string | null | undefined): string | null {
  const start = Date.parse(since || "");
  const end = Date.parse(nowIso || "");
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  const sec = Math.max(0, (end - start) / 1000);
  if (sec < 3600) return `${Math.max(1, Math.floor(sec / 60))} min`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hr`;
  const days = Math.floor(sec / 86400);
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function scorePips(score: number | null): number | null {
  if (score == null || !Number.isFinite(score)) return null;
  if (score < 0) return null;
  if (score <= 5) return Math.max(0, Math.min(5, Math.round(score)));
  return Math.max(0, Math.min(5, Math.round(score / 20)));
}

export function stageLabel(stage: string | null | undefined): string | null {
  if (stage == null) return null;
  const trimmed = stage.trim();
  if (!trimmed) return null;
  const key = trimmed.toLowerCase();
  if (key === "unknown") return "Unknown";
  if (!blankToNull(trimmed)) return null;
  return STAGE_LABEL[key] || titleCase(key.replace(/_+/g, " "));
}

export function trackLabel(track: string | null | undefined): string | null {
  const raw = blankToNull(track);
  if (!raw) return null;
  return TRACK_LABEL[raw] || cap(raw.replace(/_/g, " "));
}

export function isWarmStage(stage: string | null | undefined): boolean {
  return Boolean(stage && WARM.has(stage));
}

export function buildToday(snapshot: Snapshot | null, actions: OsAction[] = [], now = Date.now()): TodayModel {
  if (!snapshot) {
    return {
      hasSnapshot: false,
      weekday: todayLine(now),
      headline: "Waiting on the first ingest.",
      headlineDim: null,
      lede: null,
      instruction: null,
      kpis: [],
      ready: [],
      hold: [],
      open: [],
      settled: [],
      deals: [],
      pitchCount: 0,
      reviewingCount: 0,
      waiting: [],
      peopleCount: 0,
      stamp: null,
      snapshotLabel: null,
    };
  }
  const settled: SettledDecision[] = [];
  const decisions = snapshot.decisions
    .map((decision) => presentDecision(decision, snapshot, actions, now))
    .filter((decision) => {
      if (decision.outcome) {
        settled.push({ id: decision.id, name: decision.name, label: decision.outcome.label, at: decision.outcome.at });
        return false;
      }
      return !isSnoozed(decision.id, actions, now);
    });
  const ready = decisions.filter((decision) => decision.reply && !decision.hold);
  const hold = decisions.filter((decision) => decision.hold);
  const open = decisions.filter((decision) => !decision.reply && !decision.hold);
  const reviewing = snapshot.pitches.filter((pitch) => pitch.status === "reviewing");
  const deals = [...reviewing].sort(byScoreThenAge).map((pitch) => presentDeal(pitch, snapshot.generated_at));
  const waiting = waitingBots(snapshot, actions);
  const lines = headlineLines(ready.length, hold.length, open.length);
  const oldest = oldestReceived(reviewing);
  const outreach = outreachKpi(snapshot);
  const kpis: Kpi[] = [
    {
      label: "Needs you",
      value: String(decisions.length),
      small: null,
      sub: needsSub(ready.length, hold.length, open.length),
    },
    {
      label: "In review",
      value: String(reviewing.length),
      small: null,
      sub: oldest ? `Oldest since ${oldest}` : null,
    },
    ...(outreach ? [outreach] : []),
    {
      label: "Bots",
      value: String(waiting.length),
      small: null,
      sub: waiting.length ? "Waiting on you" : snapshot.bots.bots.length ? "None waiting" : null,
    },
  ];
  return {
    hasSnapshot: true,
    weekday: todayLine(now),
    headline: lines.lead,
    headlineDim: lines.dim,
    lede: daySentence({ replies: ready.length, holds: hold.length, deals: reviewing.length, waitingBots: waiting.length }),
    instruction: ready.length ? "Each one is the exact message that goes out. Read it, approve it, done." : null,
    kpis,
    ready,
    hold,
    open,
    settled,
    deals,
    pitchCount: snapshot.pitches.length,
    reviewingCount: reviewing.length,
    waiting,
    peopleCount: snapshot.crm.people.length,
    stamp: formatCt(snapshot.generated_at, true),
    snapshotLabel: formatCt(snapshot.generated_at, true),
  };
}

export function buildDeals(snapshot: Snapshot | null): DeskDeal[] {
  if (!snapshot) return [];
  const rank = (status: string) => (status === "reviewing" ? 0 : status === "new" ? 1 : status === "advanced" ? 2 : 3);
  return [...snapshot.pitches]
    .sort((a, b) => rank(a.status) - rank(b.status) || byScoreThenAge(a, b))
    .map((pitch) => presentDeal(pitch, snapshot.generated_at));
}

export function buildDeal(snapshot: Snapshot | null, id: string): DeskDeal | null {
  if (!snapshot) return null;
  const pitch = snapshot.pitches.find((item) => pitchTarget(item) === id);
  return pitch ? presentDeal(pitch, snapshot.generated_at) : null;
}

export type StageCount = { stage: string; label: string; count: number; stageCount: number; detail: string | null };

export function buildPeople(snapshot: Snapshot | null): { rows: PeopleRow[]; counts: StageCount[]; tracks: { track: string; label: string; count: number }[]; total: number; warm: number; counted: number } {
  if (!snapshot) return { rows: [], counts: [], tracks: [], total: 0, warm: 0, counted: 0 };
  const people = snapshot.crm.people;
  const useImIn = people.some((person) => typeof person.im_in === "boolean");
  const useLp = people.some((person) => typeof person.lp === "boolean");
  const stageCounts = new Map<string, number>();
  const trackCounts = new Map<string, number>();
  for (const person of people) {
    const stage = stageKey(person);
    stageCounts.set(stage, (stageCounts.get(stage) || 0) + 1);
    if (person.track !== "lp") trackCounts.set(person.track, (trackCounts.get(person.track) || 0) + 1);
  }
  const imInCount = imInTotal(snapshot.crm, people);
  if (imInCount > 0) stageCounts.set("im_in", stageCounts.get("im_in") || 0);
  const queuedLine = queuedDetail(people);
  const counts = [...stageCounts.entries()]
    .sort((a, b) => stageIndex(a[0]) - stageIndex(b[0]) || a[0].localeCompare(b[0]))
    .map(([stage, stageCount]) => ({
      stage,
      label: stageLabel(stage) || stage,
      count: stage === "im_in" ? imInCount : stageCount,
      stageCount,
      detail: stage === "queued" ? queuedLine : stage === "im_in" && imInCount !== stageCount ? `${stageCount.toLocaleString("en-US")} in this stage` : null,
    }));
  const lpCount = people.filter((person) => personIsLp(person, useLp)).length;
  const tracks = [...trackCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([track, count]) => ({ track, label: trackLabel(track) || track, count }));
  if (lpCount > 0) tracks.push({ track: "lp", label: "LP", count: lpCount });
  tracks.sort((a, b) => b.count - a.count);
  const rows = people.map((person) => presentPersonRow(person, snapshot.generated_at, useImIn, useLp));
  rows.sort((a, b) => {
    const warm = Number(b.warm) - Number(a.warm);
    if (warm) return warm;
    return (b.last || "").localeCompare(a.last || "");
  });
  const counted = [...stageCounts.values()].reduce((sum, count) => sum + count, 0);
  return { rows, counts, tracks, total: people.length, warm: people.filter((person) => personIsWarm(person, useImIn)).length, counted };
}

export function buildPerson(person: CrmPerson, snapshot: Snapshot): PersonModel {
  const firm = blankToNull(person.firm);
  const next = cleanNext(person.next_step);
  const notes = blankToNull(person.notes);
  const history = personHistory(person, snapshot);
  const tags = [stageLabel(person.stage), trackLabel(person.track), firm].filter((tag): tag is string => Boolean(tag));
  const call = /\bcall\b/i.test(`${next || ""} ${notes || ""}`);
  return {
    id: person.id,
    name: person.name,
    firm,
    email: blankToNull(person.email),
    website: person.domain ? `https://${person.domain}` : null,
    linkedin: blankToNull(person.linkedin),
    track: person.track,
    trackLabel: trackLabel(person.track),
    stage: person.stage,
    stageLabel: stageLabel(person.stage),
    owner: blankToNull(person.owner),
    last: formatCt(person.last_touch_at, true),
    next,
    nextWhen: formatCt(person.next_step_due, true) || formatCt(person.next_step_due, false),
    notes: notes ? sentence(notes) : null,
    call,
    domain: person.domain || null,
    logoUrl: person.logo_url || null,
    tags,
    history,
  };
}

export function buildOffice(snapshot: Snapshot | null, actions: OsAction[] = []): OfficeData {
  if (!snapshot) return { built: "", built_ct: "", bots: [], events: [] };
  const bots = snapshot.bots.bots.map((bot, index) => presentOfficeBot(bot, index, actions));
  const slugs = new Map<string, string>();
  for (const bot of bots) {
    slugs.set(bot.slug, bot.slug);
    slugs.set(bot.name.trim().toLowerCase(), bot.slug);
  }
  for (const bot of snapshot.bots.bots) {
    const office = bots.find((row) => row.name === bot.name);
    if (!office) continue;
    if (bot.slug) slugs.set(bot.slug.trim().toLowerCase(), office.slug);
    if (bot.director) slugs.set(bot.director, leadSlug(snapshot.bots.bots, bot.director) || office.slug);
  }
  const events = snapshot.interactions
    .map((item) => presentEvent(item, slugs))
    .filter((item): item is OfficeEvent => Boolean(item))
    .sort((a, b) => a.ts.localeCompare(b.ts));
  return {
    built: snapshot.bots.built_at || snapshot.generated_at,
    built_ct: formatCt(snapshot.bots.built_at || snapshot.generated_at, true) || "",
    bots,
    events,
  };
}

export function presentDecision(decision: Decision, snapshot: Snapshot, actions: OsAction[], now: number): DeskDecision {
  const id = decisionKey(decision);
  const hold = isHoldDecision(decision);
  const message = outgoingBody(decision.body_formatted) || outgoingBody(decision.exact_message);
  const name = blankToNull(decision.person?.name) || decisionName(decision);
  const happened = sentenceOrNull(blankToNull(decision.summary)) || sentenceOrNull(blankToNull(decision.context));
  const summary = happened ? clip(happened, 180) : null;
  const channel = channelLabel(decision);
  const org = orgFor(name, decision, snapshot);
  const company = blankToNull(decision.person?.company) || org?.label || null;
  const does = blankToNull(decision.person?.what_they_do);
  const domain = decision.domain || org?.domain || null;
  const logoUrl = decision.logo_url || org?.logoUrl || null;
  const approve = approveChoice(decision);
  const answer = storedDecisionAnswer(actions, id, now, { exact: decision.exact_message });
  const linkedin = channel === "LinkedIn";
  const crm = crmMatch(name, decision, snapshot);
  return {
    id,
    name,
    org: [company, does].filter(Boolean).join(" · ") || null,
    summary: summary && summary !== name ? summary : null,
    happened,
    why: blankToNull(decision.why_ryan),
    quote: presentQuote(decision, name),
    timeline: presentTimeline(decision.timeline),
    message,
    channel,
    channelCrumb: channelCrumb(channel),
    waiting: waitingLabel(theirSpokeAt(decision) || decision.since, snapshot.generated_at),
    drafted: formatCt(decision.created_at || decision.since, true),
    hold,
    reply: Boolean(message) && !hold,
    toName: name || null,
    toEmail: linkedin ? null : blankToNull(decision.to_email),
    toDetail: linkedin ? "LinkedIn DM, personal" : null,
    cc: blankToNull(decision.cc),
    subject: decision.subject ? sentenceOrNull(decision.subject) : null,
    fromLine: fromLine(channel, decision.thread_id),
    checks: decision.checks ?? [],
    details: detailFacts(decision),
    personFacts: personFacts(decision, name, company, crm),
    logoUrl,
    domain,
    approveChoice: approve.choice,
    approveLabel: approve.label,
    options: (decision.options ?? []).map((option) => ({ value: option.value, label: option.label || option.value })),
    detail: decision.detail ?? null,
    notNow: notNowChoice(decision),
    linked: linksFor(decision, name, snapshot),
    pending: false,
    outcome: answer ? { label: answer.label, at: formatCt(answer.at, true) || "" } : null,
    exactMessage: blankToNull(decision.exact_message),
    requestedBy: blankToNull(decision.requested_by),
  };
}

export function stageChoices(): { value: string; label: string }[] {
  return STAGE_ORDER.map((value) => ({ value, label: stageLabel(value) || value }));
}

export function withLiveAnswers(model: TodayModel, actions: OsAction[], now = Date.now()): TodayModel {
  const settled = [...model.settled];
  const seen = new Set(settled.map((row) => row.id));
  const keep: DeskDecision[] = [];
  for (const card of [...model.ready, ...model.hold, ...model.open]) {
    const answer = storedDecisionAnswer(actions, card.id, now, { exact: card.exactMessage });
    if (answer) {
      if (!seen.has(card.id)) {
        settled.push({ id: card.id, name: card.name, label: answer.label, at: formatCt(answer.at, true) || "" });
        seen.add(card.id);
      }
      continue;
    }
    if (isSnoozed(card.id, actions, now)) continue;
    keep.push(card);
  }
  const ready = keep.filter((decision) => decision.reply && !decision.hold);
  const hold = keep.filter((decision) => decision.hold);
  const open = keep.filter((decision) => !decision.reply && !decision.hold);
  if (!model.hasSnapshot) return { ...model, ready, hold, open, settled };
  const lines = headlineLines(ready.length, hold.length, open.length);
  return {
    ...model,
    headline: lines.lead,
    headlineDim: lines.dim,
    lede: daySentence({ replies: ready.length, holds: hold.length, deals: model.reviewingCount, waitingBots: model.waiting.length }),
    instruction: ready.length ? "Each one is the exact message that goes out. Read it, approve it, done." : null,
    kpis: model.kpis.map((kpi) => (kpi.label === "Needs you" ? { ...kpi, value: String(keep.length), sub: needsSub(ready.length, hold.length, open.length) } : kpi)),
    ready,
    hold,
    open,
    settled,
  };
}

function outgoingBody(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\r\n/g, "\n").trim();
  return text || null;
}

function presentDeal(pitch: Pitch, generatedAt: string): DeskDeal {
  const deckUrl = pitch.deck_url || pitch.deck || null;
  return {
    id: pitchTarget(pitch),
    company: pitch.company,
    title: blankToNull(pitch.title),
    summary: sentenceOrNull(blankToNull(pitch.summary)),
    sector: blankToNull(pitch.sector),
    stage: blankToNull(pitch.stage),
    score: pitch.score,
    pips: scorePips(pitch.score),
    waiting: waitingLabel(pitch.received.length === 10 ? `${pitch.received}T12:00:00-06:00` : pitch.received, generatedAt),
    received: formatCt(pitch.received, pitch.received.length > 10) || pitch.received,
    founder: blankToNull(pitch.founder),
    domain: pitch.domain || null,
    website: pitch.website || (pitch.domain ? `https://${pitch.domain}` : null),
    deckUrl,
    deckNote: deckUrl ? null : blankToNull(pitch.deck_note),
    logoUrl: pitch.logo_url || null,
    status: pitch.status,
    statusLabel: pitchStatusLabel(pitch.status),
    source: blankToNull(pitch.source),
    loggedRating: pitch.ryan_rating ?? null,
    generatedAt,
    sources: pitchSources(pitch.field_sources),
  };
}

const SOURCE_LABEL: Record<string, string> = {
  company: "Company",
  title: "Title",
  summary: "Summary",
  sector: "Sector",
  stage: "Stage",
  score: "Score",
  status: "Status",
  source: "Source",
  received: "Received",
  founder: "Founder",
  domain: "Domain",
  website: "Website",
  deck: "Deck",
  deck_url: "Deck",
  deck_note: "Deck note",
  logo_url: "Logo",
  ryan_rating: "Rating",
};

function pitchSources(sources: Record<string, string> | undefined): DealSource[] {
  if (!sources) return [];
  return Object.entries(sources).map(([field, source]) => ({ field, label: SOURCE_LABEL[field] || field, source }));
}

function pitchStatusLabel(status: string): string {
  if (status === "new") return "New";
  if (status === "reviewing") return "Reviewing";
  if (status === "passed") return "Passed";
  if (status === "advanced") return "Advanced";
  return status;
}

function presentPersonRow(person: CrmPerson, generatedAt: string, useImIn: boolean, useLp: boolean): PeopleRow {
  const stage = stageKey(person);
  return {
    id: person.id,
    name: person.name,
    firm: blankToNull(person.firm),
    track: person.track,
    trackLabel: trackLabel(person.track) || person.track,
    stage,
    stageLabel: stageLabel(stage),
    warm: personIsWarm(person, useImIn),
    imIn: personIsImIn(person),
    lp: personIsLp(person, useLp),
    last: formatCt(person.last_touch_at, false),
    lastAge: waitingLabel(person.last_touch_at, generatedAt),
    next: cleanNext(person.next_step),
    domain: person.domain || null,
    logoUrl: person.logo_url || null,
  };
}

function personHistory(person: CrmPerson, snapshot: Snapshot): PersonModel["history"] {
  const rows: PersonModel["history"] = [];
  const next = cleanNext(person.next_step);
  const when = formatCt(person.next_step_due, true) || formatCt(person.next_step_due, false);
  if (next) rows.push({ when: when || "Next", what: next, source: null, kind: "next" });
  const name = person.name.trim().toLowerCase();
  for (const item of snapshot.interactions) {
    if (!mentions(item.from, name) && !mentions(item.to, name) && !mentions(item.title, name)) continue;
    const at = formatCt(item.timestamp, true);
    if (!at) continue;
    rows.push({
      when: at,
      what: sentence(item.title),
      source: `${displayParty(item.from)} to ${displayParty(item.to)}`,
      kind: "past",
    });
  }
  for (const item of snapshot.activity) {
    if (!mentions(item.actor, name) && !mentions(item.summary, name)) continue;
    const at = formatCt(item.timestamp, true);
    if (!at) continue;
    rows.push({ when: at, what: sentence(item.summary), source: displayParty(item.actor), kind: "past" });
  }
  if (person.last_touch_at) {
    const at = formatCt(person.last_touch_at, true);
    const channel = blankToNull(person.last_touch_channel);
    if (at) rows.push({ when: at, what: channel ? `Last ${channel} touch` : "Last touch", source: null, kind: "key" });
  }
  return rows;
}

function presentOfficeBot(bot: BotRecord, index: number, actions: OsAction[]): OfficeBot {
  const room = roomOf(bot);
  const paused = botPaused(bot.name, actions);
  const drawn = paused ? "Paused" : officeStatus(bot.status);
  const usage = typeof bot.usage_share === "number" && Number.isFinite(bot.usage_share) ? Math.round(bot.usage_share) : null;
  return {
    slug: slugOf(bot, index),
    name: bot.name,
    team: ROOM_NAME[room] || "Firm OS",
    role: roleOf(bot),
    status: drawn,
    statusLabel: paused ? "Paused" : statusLabel(bot.status, drawn),
    last: formatCt(bot.last_iso, true) || sentenceOrNull(blankToNull(bot.last)) || "",
    result: askText(bot.result) || "",
    scope: sentenceOrNull(blankToNull(bot.scope)) || "",
    source: sentenceOrNull(blankToNull(bot.source)) || "",
    usage,
  };
}

function presentEvent(item: Interaction, slugs: Map<string, string>): OfficeEvent | null {
  const from = partySlug(item.from, slugs);
  const to = partySlug(item.to, slugs);
  if (!from || !to) return null;
  const at = formatCt(item.timestamp, true);
  if (!at) return null;
  const title = sentence(clip(item.title, 140));
  if (!title) return null;
  return {
    ts: item.timestamp,
    at,
    f: from,
    t: to,
    kind: item.kind,
    status: blankToNull(item.status),
    title,
    full: sentence(item.title),
  };
}

function waitingBots(snapshot: Snapshot, actions: OsAction[]): WaitingBot[] {
  return snapshot.bots.bots.flatMap((bot, index) => {
    if (botPaused(bot.name, actions)) return [];
    if (officeStatus(bot.status) !== "Needs Ryan") return [];
    const ask = askText(bot.result);
    if (!ask) return [];
    return [{ name: bot.name, ask: clip(ask, 180), slug: slugOf(bot, index) }];
  });
}

function askText(value: string | null | undefined): string | null {
  const raw = sentenceOrNull(blankToNull(value));
  if (!raw) return null;
  const cut = raw.split(/(?<=[.;])\s/)[0]?.replace(/\s*Last wrote\b[\s\S]*$/i, "").replace(/[;,.]$/, "").trim();
  return cut || null;
}

function isHoldDecision(decision: Decision): boolean {
  return /\bon hold\b/i.test(`${decision.title} ${decision.context || ""} ${decision.summary || ""}`);
}

function decisionName(decision: Decision): string {
  const match = decision.title.match(/\b(?:reply|email|message|dm)\s+to\s+([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,3})/);
  if (match?.[1]) return match[1].replace(/\s+(on|by|in|for|about)$/i, "");
  const titled = shortTitle(decision.title);
  return titled || decision.title;
}

function channelLabel(decision: Decision): string | null {
  if (decision.channel === "email") return "Email";
  if (decision.channel === "linkedin") return "LinkedIn";
  const blob = `${decision.title}\n${decision.context || ""}\n${decision.summary || ""}`.toLowerCase();
  if (/\blinkedin\b/.test(blob)) return "LinkedIn";
  if (/\b(e-?mail|gmail)\b/.test(blob)) return "Email";
  if (/\bslack\b/.test(blob)) return "Slack";
  return null;
}

function channelCrumb(channel: string | null): string | null {
  if (channel === "Email") return "Reply by email";
  if (channel === "LinkedIn") return "Reply on LinkedIn";
  if (channel === "Slack") return "Reply in Slack";
  return null;
}

function fromLine(channel: string | null, threadId: string | undefined): string | null {
  if (channel !== "Email") return null;
  return threadId ? "ryan@backfieldventures.com · reply in thread" : "ryan@backfieldventures.com";
}

function theirSpokeAt(decision: Decision): string | null {
  const wordAt = decision.their_words?.at;
  if (wordAt && Number.isFinite(Date.parse(wordAt))) return wordAt;
  for (const row of decision.timeline ?? []) {
    if (!row.at || !Number.isFinite(Date.parse(row.at))) continue;
    if (toneOf(row.event || "") === "them") return row.at;
  }
  return null;
}

function presentQuote(decision: Decision, name: string): DeskQuote | null {
  const words = decision.their_words;
  const summaryEvent = (decision.timeline ?? []).find((row) => isParaphrase(row.event));
  const quote = blankToNull(words?.quote);
  const summary = isParaphrase(words?.source) || isParaphrase(quote) || (!quote && Boolean(summaryEvent));
  const text = quote || (summaryEvent ? cleanParaphrase(summaryEvent.event || "") : null);
  if (!text) return null;
  const atIso = words?.at || summaryEvent?.at || null;
  const approx = words?.approx === true || (words?.approx == null && summaryEvent?.approx === true);
  const when = formatCtStamp(atIso, "quote", approx);
  const source = blankToNull(words?.source);
  const human = source && !isMachineSource(source) ? source : null;
  const at = [firstName(name), when, human].filter(Boolean).join(" · ") || null;
  return { text, at, summary };
}

function presentTimeline(rows: DecisionEvent[] | undefined): DeskTimelineRow[] {
  if (!rows?.length) return [];
  const out: DeskTimelineRow[] = [];
  for (const row of rows) {
    const event = blankToNull(row.event);
    if (!event) continue;
    out.push({
      at: formatCtStamp(row.at, "row", row.approx === true),
      event,
      tone: toneOf(event),
    });
  }
  return out;
}

function toneOf(event: string): DeskTimelineRow["tone"] {
  if (/\b(never sent|not sent|waiting on|was drafted|saved in)\b/i.test(event)) return "pend";
  if (/^(you|ryan)\b/i.test(event.trim())) return "you";
  return "them";
}

function isParaphrase(value: string | null | undefined): boolean {
  if (!value) return false;
  return /not (?:his|her|their) words|not a quote|summary,\s*not/i.test(value);
}

function cleanParaphrase(event: string): string | null {
  const cleaned = event
    .replace(/summary,\s*not a quote[:\s-]*/i, "")
    .replace(/not (?:his|her|their) words[:\s-]*/i, "")
    .trim();
  return blankToNull(cleaned);
}

function personFacts(decision: Decision, name: string, company: string | null, crm: CrmPerson | null): DeskFact[] {
  const does = blankToNull(decision.person?.what_they_do);
  const reach = blankToNull(decision.person?.reach);
  const stage = crm ? [stageLabel(crm.stage), trackLabel(crm.track)].filter(Boolean).join(" · ") : "";
  if (!decision.person && !crm) return [];
  if (!company && !does && !reach && !stage && !decision.person?.name) return [];
  const facts: DeskFact[] = [{ label: "Name", value: blankToNull(decision.person?.name) || name }];
  if (company) facts.push({ label: "Company", value: company });
  if (does) facts.push({ label: "Does", value: does });
  if (reach) facts.push({ label: "Reach", value: reach });
  if (stage) facts.push({ label: "Stage", value: stage });
  return facts;
}

function detailFacts(decision: Decision): DeskFact[] {
  const facts: DeskFact[] = [];
  if (decision.thread_id) facts.push({ label: "Thread", value: decision.thread_id });
  if (decision.reply_to_msg_id) facts.push({ label: "Reply to", value: decision.reply_to_msg_id });
  for (const source of machineSources(decision)) facts.push({ label: "Source", value: source });
  return facts;
}

function machineSources(decision: Decision): string[] {
  const raw = [decision.person?.source, decision.their_words?.source, ...(decision.timeline ?? []).map((row) => row.source)];
  const out: string[] = [];
  for (const item of raw) {
    const text = blankToNull(item);
    if (!text || !isMachineSource(text) || out.includes(text)) continue;
    out.push(text);
  }
  return out;
}

function isMachineSource(value: string): boolean {
  const text = value.trim();
  if (/[/\\]/.test(text) || /\.[a-z0-9]{1,4}$/i.test(text)) return true;
  return /^[a-z0-9_-]{12,}$/i.test(text);
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function crmMatch(name: string, decision: Decision, snapshot: Snapshot): CrmPerson | null {
  const email = blankToNull(decision.to_email)?.toLowerCase();
  return (
    snapshot.crm.people.find((row) => namesMatch(row.name, name) || (email && row.email?.toLowerCase() === email) || textHas(decision, row.name)) ||
    null
  );
}

function orgFor(name: string, decision: Decision, snapshot: Snapshot): { label: string; domain: string | null; logoUrl: string | null } | null {
  const person = snapshot.crm.people.find((row) => namesMatch(row.name, name) || textHas(decision, row.name));
  if (person?.firm) return { label: person.firm, domain: person.domain || decision.domain || null, logoUrl: person.logo_url || null };
  const pitch = snapshot.pitches.find((row) => row.company.length > 2 && textHas(decision, row.company));
  if (pitch) return { label: pitch.company, domain: pitch.domain || decision.domain || null, logoUrl: pitch.logo_url || null };
  return null;
}

function linksFor(decision: Decision, name: string, snapshot: Snapshot): DeskLink[] {
  const links: DeskLink[] = [];
  const person = snapshot.crm.people.find((row) => namesMatch(row.name, name) || textHas(decision, row.name));
  if (person) {
    links.push({
      kind: "person",
      id: person.id,
      name: person.name,
      detail: [blankToNull(person.firm), stageLabel(person.stage)].filter(Boolean).join(" · ") || null,
      domain: person.domain || null,
      logoUrl: person.logo_url || null,
      stage: stageLabel(person.stage),
    });
  }
  const pitch = snapshot.pitches.find((row) => row.company.length > 2 && textHas(decision, row.company));
  if (pitch) {
    links.push({
      kind: "pitch",
      id: pitchTarget(pitch),
      name: pitch.company,
      detail: [blankToNull(pitch.summary), stageLabel(pitch.stage) || blankToNull(pitch.stage), pitch.status].filter(Boolean).join(" · ") || null,
      domain: pitch.domain || null,
      logoUrl: pitch.logo_url || null,
      stage: blankToNull(pitch.stage),
    });
  }
  return links;
}

function approveChoice(decision: Decision): { choice: string; label: string } {
  const options = decision.options ?? [];
  const values = options.map((option) => option.value);
  const preferred = ["approve", "yes", "send", "approved"];
  for (const choice of preferred) {
    if (!values.length || values.includes(choice)) {
      const option = options.find((item) => item.value === choice);
      return { choice, label: option?.label || "Approve and send" };
    }
  }
  const first = options[0];
  if (first) return { choice: first.value, label: first.label || "Approve and send" };
  return { choice: "approve", label: "Approve and send" };
}

function notNowChoice(decision: Decision): DeskDecision["notNow"] {
  const values = decision.options?.map((option) => option.value) ?? [];
  for (const choice of ["not_now", "skip", "later", "hold", "no"]) {
    if (!values.length || values.includes(choice)) return { kind: "decide", choice };
  }
  return { kind: "snooze" };
}

function outreachKpi(snapshot: Snapshot): Kpi | null {
  const rows = snapshot.outreach;
  if (!rows.length) return null;
  const sent = rows.reduce((sum, row) => sum + row.sent, 0);
  const floor = rows.reduce((sum, row) => sum + row.floor, 0);
  const behind = [...rows].sort((a, b) => a.sent / Math.max(1, a.floor) - b.sent / Math.max(1, b.floor))[0];
  const sub = behind && behind.floor ? `${trackLabel(behind.label || behind.track) || behind.track} ${behind.sent} of ${behind.floor}` : null;
  return {
    label: "Outreach today",
    value: floor ? String(sent) : String(sent),
    small: floor ? ` / ${floor}` : null,
    sub,
  };
}

function needsSub(replies: number, holds: number, open: number): string | null {
  const parts: string[] = [];
  if (replies) parts.push(`${replies} ${replies === 1 ? "reply" : "replies"}`);
  if (holds) parts.push(`${holds} on hold`);
  if (open) parts.push(`${open} open`);
  return parts.length ? parts.join(", ") : null;
}

function oldestReceived(pitches: Pitch[]): string | null {
  let best: string | null = null;
  for (const pitch of pitches) {
    if (!best || pitch.received < best) best = pitch.received;
  }
  return best ? formatCt(best, false) : null;
}

function byScoreThenAge(a: Pitch, b: Pitch): number {
  const score = (b.score ?? -1) - (a.score ?? -1);
  if (score) return score;
  return a.received.localeCompare(b.received);
}

function roomOf(bot: BotRecord): string {
  if (bot.director && bot.director !== "ryan" && ROOM_NAME[bot.director]) return bot.director;
  const team = bot.team.trim().toLowerCase().replace(/\s+/g, "_");
  if (ROOM_NAME[team]) return team;
  const named = Object.entries(ROOM_NAME).find(([, label]) => label.toLowerCase() === bot.team.trim().toLowerCase());
  return named?.[0] || "firm_os";
}

function roleOf(bot: BotRecord): string {
  const role = blankToNull(bot.role);
  if (!role) return "Specialist";
  if (/executive/i.test(role)) return "Executive";
  if (/director/i.test(role)) return "Director";
  if (/outside/i.test(role)) return "Outside tree";
  return role;
}

function slugOf(bot: BotRecord, index: number): string {
  const slug = blankToNull(bot.slug);
  if (slug) return slug.toLowerCase().replace(/[^a-z0-9_]+/g, "_");
  const fromName = bot.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return fromName || `bot_${index}`;
}

function leadSlug(bots: BotRecord[], director: string): string | null {
  const lead = bots.find((bot) => bot.director === director && /director|executive/i.test(bot.role || ""));
  if (!lead) return null;
  return slugOf(lead, 0);
}

function officeStatus(status: string): OfficeBot["status"] {
  const value = status.trim().toLowerCase();
  if (!value || value === "unknown") return "Idle";
  if (value.includes("need")) return "Needs Ryan";
  if (value.includes("pause")) return "Paused";
  if (value.includes("degrad")) return "Degraded";
  if (value.includes("fail")) return "Failed";
  if (value.includes("work") || value === "active") return "Working";
  return "Idle";
}

function statusLabel(status: string, drawn: OfficeBot["status"]): string {
  const value = blankToNull(status);
  if (!value) return drawn === "Needs Ryan" ? "Needs you" : drawn;
  if (drawn === "Needs Ryan") return "Needs you";
  if (value.toLowerCase() === "unknown") return drawn;
  return value;
}

function partySlug(party: string, slugs: Map<string, string>): string | null {
  const key = party.trim().toLowerCase();
  if (!key) return null;
  if (key === "ryan") return "ryan";
  return slugs.get(key) || slugs.get(key.replace(/\s+/g, "_")) || null;
}

function stageIndex(stage: string): number {
  const index = STAGE_ORDER.indexOf(stage);
  return index === -1 ? STAGE_ORDER.length : index;
}

function stageKey(person: CrmPerson): string {
  const raw = person.stage?.trim().toLowerCase();
  if (!raw || raw === "unknown") return "unknown";
  return raw;
}

function personIsImIn(person: CrmPerson): boolean {
  return person.im_in === true;
}

/** Flagged people. crm.counts.im_in is only a cross-check against that list. */
function imInTotal(crm: Snapshot["crm"], people: CrmPerson[]): number {
  const flagged = people.filter((person) => person.im_in === true).length;
  const given = crm.counts?.im_in;
  if (typeof given === "number" && Number.isFinite(given) && Math.round(given) !== flagged) {
    console.warn(`I'm in snapshot count is ${Math.round(given)}, but ${flagged} people are flagged.`);
  }
  return flagged;
}

export function rowsForStage(rows: PeopleRow[], stage: string): PeopleRow[] {
  if (stage === "all") return rows;
  if (stage === "im_in") return rows.filter((row) => row.imIn);
  return rows.filter((row) => row.stage === stage);
}

function personIsWarm(person: CrmPerson, useFlag: boolean): boolean {
  if (person.stage === "replied" || person.stage === "call_asked" || person.stage === "call_booked") return true;
  if (useFlag) return person.im_in === true;
  return person.stage === "im_in";
}

function personIsLp(person: CrmPerson, useFlag: boolean): boolean {
  if (useFlag) return person.lp === true;
  return person.track === "lp";
}

function queueBucket(person: CrmPerson): "email" | "ig" | null {
  const value = (person.channel || person.last_touch_channel || "").trim().toLowerCase();
  if (!value) return null;
  if (value === "email" || value === "e-mail") return "email";
  if (value === "ig" || value === "ig_dm" || value === "ig dm" || value === "instagram" || value === "instagram_dm" || value === "instagram dm" || value === "dm") return "ig";
  return null;
}

function queuedDetail(people: CrmPerson[]): string | null {
  let email = 0;
  let ig = 0;
  for (const person of people) {
    if (stageKey(person) !== "queued") continue;
    const bucket = queueBucket(person);
    if (bucket === "email") email += 1;
    else if (bucket === "ig") ig += 1;
  }
  if (!email && !ig) return null;
  const parts: string[] = [];
  if (email) parts.push(`${email.toLocaleString("en-US")} email`);
  if (ig) parts.push(`${ig.toLocaleString("en-US")} IG DM`);
  return parts.join(" · ");
}

function cleanNext(value: string | null | undefined): string | null {
  const raw = sentenceOrNull(blankToNull(value));
  if (!raw) return null;
  return raw.replace(/^next_touch\s+/i, "");
}

function sentenceOrNull(value: string | null | undefined): string | null {
  const raw = blankToNull(value);
  if (!raw) return null;
  return sentence(raw);
}

function clip(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1).replace(/\s\S*$/, "");
  return `${cut || value.slice(0, max - 1)}…`;
}

function textHas(decision: Decision, needle: string): boolean {
  const name = needle.trim();
  if (name.length < 3) return false;
  return `${decision.title}\n${decision.context || ""}\n${decision.summary || ""}`.toLowerCase().includes(name.toLowerCase());
}

function namesMatch(left: string, right: string): boolean {
  const a = left.trim().toLowerCase();
  const b = right.trim().toLowerCase();
  if (!a || !b) return false;
  return a === b;
}

function mentions(value: string, name: string): boolean {
  return name.length > 2 && value.toLowerCase().includes(name);
}

function cap(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
