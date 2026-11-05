import { decisionKey } from "./decision-id";
import { storedDecisionAnswer } from "./decision-merge";
import { formatCt } from "./night";
import { botPaused, isSnoozed } from "./overlays";
import { pitchTarget, shownPitchRating } from "./pitch-rate";
import type { Decision, DecisionVersion, DriveBrief, OsAction, Pitch, Snapshot } from "./types";

export type DriveVersion = {
  version: number;
  subject: string;
  body: string;
  at: string;
  by: string;
  note: string | null;
  sentAt: string | null;
  sentVia: string | null;
};

export type DriveKind = "draft" | "yesno" | "rate" | "question";

export type DriveCard = {
  id: string;
  kind: DriveKind;
  title: string;
  why: string | null;
  from: string | null;
  toName: string | null;
  toEmail: string | null;
  channel: string | null;
  versions: DriveVersion[];
  choices: { value: string; label: string }[];
  stage: string | null;
  sector: string | null;
};

export type DriveQueue = {
  cards: DriveCard[];
};

/** Subject and body exactly as shown, joined the way the bot must send them. */
export function approvedText(subject: string | null | undefined, body: string | null | undefined): string {
  const heading = (subject || "").replace(/\r\n/g, "\n").trim();
  const draft = (body || "").replace(/\r\n/g, "\n").trim();
  if (heading && draft) return `${heading}\n\n${draft}`;
  return draft || heading;
}

export function decisionVersions(decision: Decision): DriveVersion[] {
  const rows = [...(decision.versions || [])]
    .filter((row) => row.body.trim())
    .map((row) => toVersion(row, decision))
    .sort((a, b) => a.version - b.version);
  if (rows.length) {
    const latest = rows[rows.length - 1];
    if (latest && !latest.sentAt && decision.sent_at) {
      latest.sentAt = decision.sent_at;
      latest.sentVia = decision.sent_via || latest.sentVia;
    }
    return rows;
  }
  const body = decision.body_formatted || decision.exact_message || "";
  if (!body.trim() && !(decision.subject || "").trim()) return [];
  return [
    {
      version: 1,
      subject: (decision.subject || "").trim(),
      body: body.trim() || decision.title,
      at: decision.created_at || decision.since,
      by: decision.requested_by || "Bot",
      note: null,
      sentAt: decision.sent_at || null,
      sentVia: decision.sent_via || null,
    },
  ];
}

export function latestVersion(versions: DriveVersion[]): DriveVersion | null {
  return versions.length ? versions[versions.length - 1] : null;
}

export function canApprove(versions: DriveVersion[], version: number): boolean {
  const latest = latestVersion(versions);
  return Boolean(latest && latest.version === version);
}

export type DiffPart = { text: string; added: boolean };

/** Words in the newer draft that are not carried over from the previous one. */
export function highlightAdded(previous: string, next: string): DiffPart[] {
  const parts = next.split(/(\s+)/);
  const prevWords = previous.split(/\s+/).filter(Boolean);
  const nextWords = parts.filter((part) => part.trim());
  const keep = lcsIndices(prevWords, nextWords);
  let word = 0;
  return parts.map((part) => {
    if (!part) return { text: part, added: false };
    if (!part.trim()) return { text: part, added: false };
    const added = !keep.has(word);
    word += 1;
    return { text: part, added };
  });
}

export function buildDrive(snapshot: Snapshot | null, actions: OsAction[], now = Date.now()): DriveQueue {
  if (!snapshot) return { cards: [] };
  const cards: DriveCard[] = [];
  const seenBots = new Set<string>();
  for (const decision of snapshot.decisions) {
    const id = decisionKey(decision);
    if (storedDecisionAnswer(actions, id, now, { exact: decision.exact_message })) continue;
    if (isSnoozed(id, actions, now)) continue;
    if (isApproved(actions, id)) continue;
    const card = decisionCard(decision);
    if (!card) continue;
    cards.push(card);
    const owner = (decision.requested_by || "").trim().toLowerCase();
    if (owner) seenBots.add(owner);
  }
  for (const pitch of snapshot.pitches) {
    if (pitch.status === "passed") continue;
    const id = pitchTarget(pitch);
    const rating = shownPitchRating({
      logged: pitch.ryan_rating ?? null,
      generatedAt: snapshot.generated_at,
      actions,
      pitchId: id,
    });
    if (rating) continue;
    if (isApproved(actions, id)) continue;
    cards.push(rateCard(pitch));
  }
  for (const [index, bot] of snapshot.bots.bots.entries()) {
    if (botPaused(bot.name, actions)) continue;
    if (!needsRyan(bot.status)) continue;
    const ask = firstSentence(bot.result);
    if (!ask) continue;
    if (seenBots.has(bot.name.trim().toLowerCase())) continue;
    const id = botQuestionId(bot.name, index);
    if (isApproved(actions, id)) continue;
    cards.push({
      id,
      kind: "question",
      title: ask,
      why: null,
      from: bot.name,
      toName: null,
      toEmail: null,
      channel: null,
      versions: [],
      choices: [],
      stage: null,
      sector: null,
    });
  }
  for (const brief of snapshot.drive || []) {
    if (isApproved(actions, brief.id)) continue;
    cards.push(briefCard(brief));
  }
  return { cards };
}

export function isSkipped(actions: OsAction[], id: string): boolean {
  return actions.some((action) => action.type === "drive_skip" && action.target_id === id && action.status !== "failed");
}

export function isApproved(actions: OsAction[], id: string): boolean {
  return actions.some((action) => action.target_id === id && action.status !== "failed" && (action.type === "drive_approve" || action.type === "rate"));
}

export function driveCount(queue: DriveQueue, actions: OsAction[]): number {
  return queue.cards.filter((card) => !isSkipped(actions, card.id) && !isApproved(actions, card.id)).length;
}

export function pendingEdit(actions: OsAction[], id: string, latest: number): OsAction | null {
  let found: OsAction | null = null;
  for (const action of actions) {
    if (action.type !== "drive_edit" || action.target_id !== id || action.status === "failed") continue;
    if (action.payload.base_version !== latest) continue;
    if (!found || action.created_at >= found.created_at) found = action;
  }
  return found;
}

export function pendingApproval(actions: OsAction[], id: string): OsAction | null {
  let found: OsAction | null = null;
  for (const action of actions) {
    if (action.type !== "drive_approve" || action.target_id !== id || action.status === "failed") continue;
    if (!found || action.created_at >= found.created_at) found = action;
  }
  return found;
}

function decisionCard(decision: Decision): DriveCard | null {
  const id = decisionKey(decision);
  const versions = decisionVersions(decision);
  const yes = decision.options?.some((option) => option.value === "yes");
  const no = decision.options?.some((option) => option.value === "no");
  const draft = versions.length > 0 && (Boolean(decision.channel) || Boolean(decision.subject) || Boolean(decision.body_formatted) || Boolean(decision.exact_message) || versions.length > 1);
  if (draft) {
    const person = decision.person?.name || null;
    return {
      id,
      kind: "draft",
      title: decision.subject || decision.title,
      why: decision.why_ryan || decision.context || null,
      from: decision.requested_by || null,
      toName: person,
      toEmail: decision.to_email || null,
      channel: decision.channel === "linkedin" ? "LinkedIn" : decision.channel === "email" ? "Gmail" : null,
      versions,
      choices: [],
      stage: null,
      sector: null,
    };
  }
  if (yes && no) {
    return {
      id,
      kind: "yesno",
      title: decision.title,
      why: decision.why_ryan || decision.context || decision.summary || null,
      from: decision.requested_by || null,
      toName: decision.person?.name || null,
      toEmail: decision.to_email || null,
      channel: null,
      versions: [],
      choices: (decision.options || []).filter((option) => option.value === "yes" || option.value === "no"),
      stage: null,
      sector: null,
    };
  }
  if (versions.length) {
    return {
      id,
      kind: "draft",
      title: decision.subject || decision.title,
      why: decision.why_ryan || decision.context || null,
      from: decision.requested_by || null,
      toName: decision.person?.name || null,
      toEmail: decision.to_email || null,
      channel: decision.channel === "linkedin" ? "LinkedIn" : "Gmail",
      versions,
      choices: [],
      stage: null,
      sector: null,
    };
  }
  return null;
}

function rateCard(pitch: Pitch): DriveCard {
  return {
    id: pitchTarget(pitch),
    kind: "rate",
    title: pitch.company,
    why: pitch.summary || pitch.title || null,
    from: null,
    toName: null,
    toEmail: null,
    channel: null,
    versions: [],
    choices: [],
    stage: pitch.stage,
    sector: pitch.sector,
  };
}

function briefCard(brief: DriveBrief): DriveCard {
  return {
    id: brief.id,
    kind: brief.kind === "yesno" ? "yesno" : brief.kind === "question" ? "question" : "draft",
    title: brief.title,
    why: brief.why || null,
    from: brief.from || null,
    toName: null,
    toEmail: null,
    channel: null,
    versions: brief.body
      ? [{ version: 1, subject: brief.title, body: brief.body, at: "", by: brief.from || "Bot", note: null, sentAt: null, sentVia: null }]
      : [],
    choices: brief.options || [],
    stage: null,
    sector: null,
  };
}

function toVersion(row: DecisionVersion, decision: Decision): DriveVersion {
  return {
    version: row.version,
    subject: (row.subject || decision.subject || "").trim(),
    body: row.body,
    at: row.at || decision.created_at || decision.since,
    by: row.by || "Bot",
    note: row.note || null,
    sentAt: row.sent_at || null,
    sentVia: row.sent_via || null,
  };
}

function needsRyan(status: string | null | undefined): boolean {
  return (status || "").toLowerCase().includes("need");
}

function firstSentence(value: string | null | undefined): string | null {
  const raw = (value || "").replace(/\s+/g, " ").trim();
  if (!raw) return null;
  const cut = raw.split(/(?<=[.;])\s/)[0]?.replace(/[;,.]$/, "").trim();
  return cut || null;
}

export function botQuestionId(name: string, index: number): string {
  return `bot:${slug(name, index)}`;
}

function slug(name: string, index: number): string {
  const fromName = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return fromName || `bot_${index}`;
}

function lcsIndices(a: string[], b: string[]): Set<number> {
  const n = a.length;
  const m = b.length;
  if (n > 1500 || m > 1500) return new Set();
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const keep = new Set<number>();
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      keep.add(j);
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i += 1;
    else j += 1;
  }
  return keep;
}

export function versionWhen(at: string): string {
  return formatCt(at, true) || "";
}
