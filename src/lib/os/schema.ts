import {
  DIRECTOR_KEYS,
  INTERACTION_KINDS,
  PITCH_STATUSES,
  type ActivityItem,
  type BotFeed,
  type BotRecord,
  type Decision,
  type DirectorKey,
  type Interaction,
  type InteractionKind,
  type OutreachTrack,
  type Pitch,
  type PitchStatus,
  type RoutineRecord,
  type Snapshot,
} from "./types";

const LIMITS = {
  pitches: 2000,
  bots: 500,
  outreach: 50,
  decisions: 300,
  activity: 1000,
  routines: 200,
  interactions: 500,
} as const;

export type SchemaResult =
  | { ok: true; snapshot: Snapshot }
  | { ok: false; issues: string[] };

export function validateSnapshot(input: unknown): SchemaResult {
  const issues: string[] = [];
  if (!isRecord(input)) {
    return { ok: false, issues: ["Body must be a JSON object"] };
  }

  const generated_at = reqStr(input.generated_at, "generated_at", 80, issues);
  if (generated_at && !isDate(generated_at)) {
    issues.push("generated_at must be an ISO-8601 timestamp");
  }

  const pitches = validatePitches(input.pitches, issues);
  const bots = validateBots(input.bots, issues);
  const outreach = validateOutreach(input.outreach, issues);
  const decisions = validateDecisions(input.decisions, issues);
  const activity = validateActivity(input.activity, issues);
  const interactions =
    input.interactions === undefined ? [] : validateInteractions(input.interactions, issues);

  if (!generated_at || !pitches || !bots || !outreach || !decisions || !activity || !interactions || issues.length) {
    return { ok: false, issues: issues.slice(0, 30) };
  }

  return {
    ok: true,
    snapshot: {
      generated_at,
      pitches,
      bots,
      outreach,
      decisions,
      activity,
      interactions,
    },
  };
}

function validatePitches(value: unknown, issues: string[]): Pitch[] | null {
  if (!Array.isArray(value)) {
    issues.push("pitches must be an array");
    return null;
  }
  if (value.length > LIMITS.pitches) {
    issues.push(`pitches is limited to ${LIMITS.pitches} rows`);
    return null;
  }
  const rows: Pitch[] = [];
  for (let i = 0; i < value.length; i++) {
    const row = validatePitch(value[i], `pitches[${i}]`, issues);
    if (row) rows.push(row);
  }
  return rows;
}

function validatePitch(value: unknown, path: string, issues: string[]): Pitch | null {
  if (!isRecord(value)) {
    issues.push(`${path} must be an object`);
    return null;
  }
  const company = reqStr(value.company, `${path}.company`, 200, issues);
  const sector = reqStr(value.sector, `${path}.sector`, 200, issues);
  const stage = reqStr(value.stage, `${path}.stage`, 80, issues);
  const received = reqStr(value.received, `${path}.received`, 80, issues);
  const founder = reqStr(value.founder, `${path}.founder`, 200, issues);
  const source = reqStr(value.source, `${path}.source`, 200, issues);
  const status = pitchStatus(value.status, `${path}.status`, issues);
  const score = scoreValue(value.score, `${path}.score`, issues);
  const deck = optionalUrl(value.deck, `${path}.deck`, issues);
  if (received && !isDate(received)) issues.push(`${path}.received must be a date`);
  if (!company || !sector || !stage || !received || !founder || !source || !status || score === undefined) {
    return null;
  }
  return { company, sector, stage, received, founder, status, score, source, deck };
}

function validateBots(value: unknown, issues: string[]): BotFeed | null {
  if (Array.isArray(value)) {
    const bots = validateBotList(value, "bots", issues);
    return bots ? { bots } : null;
  }
  if (!isRecord(value)) {
    issues.push("bots must be an array or the bot-office feed object");
    return null;
  }
  if (!Array.isArray(value.bots)) {
    issues.push("bots.bots must be an array");
    return null;
  }
  const bots = validateBotList(value.bots, "bots.bots", issues);
  if (!bots) return null;
  const feed: BotFeed = { bots };
  if (typeof value.built_at === "string") feed.built_at = clip(value.built_at, 80);
  if (typeof value.today === "string") feed.today = clip(value.today, 40);
  if (Array.isArray(value.routines)) {
    if (value.routines.length > LIMITS.routines) {
      issues.push(`bots.routines is limited to ${LIMITS.routines} rows`);
    } else {
      feed.routines = value.routines.filter(isRecord).map(sanitizeRoutine);
    }
  }
  if (value.pulse !== undefined) feed.pulse = value.pulse;
  if (isRecord(value.usage)) feed.usage = value.usage;
  return feed;
}

function validateBotList(value: unknown[], path: string, issues: string[]): BotRecord[] | null {
  if (value.length > LIMITS.bots) {
    issues.push(`${path} is limited to ${LIMITS.bots} rows`);
    return null;
  }
  const bots: BotRecord[] = [];
  for (let i = 0; i < value.length; i++) {
    const bot = validateBot(value[i], `${path}[${i}]`, issues);
    if (bot) bots.push(bot);
  }
  return bots;
}

function validateBot(value: unknown, path: string, issues: string[]): BotRecord | null {
  if (!isRecord(value)) {
    issues.push(`${path} must be an object`);
    return null;
  }
  const name = reqStr(value.name, `${path}.name`, 120, issues);
  const team = reqStr(value.team, `${path}.team`, 80, issues);
  const status = reqStr(value.status, `${path}.status`, 40, issues);
  if (!name || !team || !status) return null;
  const bot: BotRecord = { name, team, status };
  const slug = optStr(value.slug, `${path}.slug`, 80, issues);
  const role = optStr(value.role, `${path}.role`, 80, issues);
  const scope = optStr(value.scope, `${path}.scope`, 1000, issues);
  const registry = optStr(value.registry_status, `${path}.registry_status`, 40, issues);
  const last = optStr(value.last, `${path}.last`, 120, issues);
  const source = optStr(value.source, `${path}.source`, 500, issues);
  if (slug) bot.slug = slug;
  if (role) bot.role = role;
  if (scope) bot.scope = scope;
  if (registry) bot.registry_status = registry;
  if (last) bot.last = last;
  if (source) bot.source = source;
  if (typeof value.result === "string" && value.result.trim()) {
    bot.result = clip(value.result.trim(), 2000);
  }
  if (value.last_iso === null) bot.last_iso = null;
  else if (value.last_iso !== undefined) {
    if (typeof value.last_iso !== "string" || !isDate(value.last_iso)) {
      issues.push(`${path}.last_iso must be a date or null`);
    } else bot.last_iso = value.last_iso;
  }
  if (value.usage_share === null) bot.usage_share = null;
  else if (value.usage_share !== undefined) {
    if (typeof value.usage_share !== "number" || !Number.isFinite(value.usage_share)) {
      issues.push(`${path}.usage_share must be a number or null`);
    } else bot.usage_share = value.usage_share;
  }
  if (value.director !== undefined && value.director !== null && value.director !== "") {
    const director = directorKey(value.director, `${path}.director`, issues);
    if (director) bot.director = director;
  }
  return bot;
}

function sanitizeRoutine(value: Record<string, unknown>): RoutineRecord {
  const routine: RoutineRecord = {};
  if (typeof value.name === "string") routine.name = clip(value.name.trim(), 160);
  if (typeof value.status === "string") routine.status = clip(value.status.trim(), 40);
  if (typeof value.last === "string") routine.last = clip(value.last.trim(), 120);
  if (typeof value.next === "string") routine.next = clip(value.next.trim(), 120);
  if (typeof value.note === "string") routine.note = clip(value.note.trim(), 500);
  return routine;
}

function validateOutreach(value: unknown, issues: string[]): OutreachTrack[] | null {
  if (!Array.isArray(value)) {
    issues.push("outreach must be an array");
    return null;
  }
  if (value.length > LIMITS.outreach) {
    issues.push(`outreach is limited to ${LIMITS.outreach} rows`);
    return null;
  }
  const rows: OutreachTrack[] = [];
  for (let i = 0; i < value.length; i++) {
    const row = validateTrack(value[i], `outreach[${i}]`, issues);
    if (row) rows.push(row);
  }
  return rows;
}

function validateTrack(value: unknown, path: string, issues: string[]): OutreachTrack | null {
  if (!isRecord(value)) {
    issues.push(`${path} must be an object`);
    return null;
  }
  const track = reqStr(value.track, `${path}.track`, 80, issues);
  const sent = countValue(value.sent, `${path}.sent`, issues);
  const floor = countValue(value.floor, `${path}.floor`, issues);
  const label = optStr(value.label, `${path}.label`, 80, issues);
  if (!track || sent === undefined || floor === undefined) return null;
  const row: OutreachTrack = { track, sent, floor };
  if (label) row.label = label;
  return row;
}

function validateDecisions(value: unknown, issues: string[]): Decision[] | null {
  if (!Array.isArray(value)) {
    issues.push("decisions must be an array");
    return null;
  }
  if (value.length > LIMITS.decisions) {
    issues.push(`decisions is limited to ${LIMITS.decisions} rows`);
    return null;
  }
  const rows: Decision[] = [];
  for (let i = 0; i < value.length; i++) {
    const row = validateDecision(value[i], `decisions[${i}]`, issues);
    if (row) rows.push(row);
  }
  return rows;
}

function validateDecision(value: unknown, path: string, issues: string[]): Decision | null {
  if (!isRecord(value)) {
    issues.push(`${path} must be an object`);
    return null;
  }
  const title = reqStr(value.title, `${path}.title`, 300, issues);
  const since = reqStr(value.since, `${path}.since`, 80, issues);
  const link = optionalUrl(value.link, `${path}.link`, issues);
  if (since && !isDate(since)) issues.push(`${path}.since must be a date`);
  if (!title || !since) return null;
  return { title, since, link };
}

function validateActivity(value: unknown, issues: string[]): ActivityItem[] | null {
  if (!Array.isArray(value)) {
    issues.push("activity must be an array");
    return null;
  }
  if (value.length > LIMITS.activity) {
    issues.push(`activity is limited to ${LIMITS.activity} rows`);
    return null;
  }
  const rows: ActivityItem[] = [];
  for (let i = 0; i < value.length; i++) {
    const row = validateActivityItem(value[i], `activity[${i}]`, issues);
    if (row) rows.push(row);
  }
  return rows;
}

function validateActivityItem(value: unknown, path: string, issues: string[]): ActivityItem | null {
  if (!isRecord(value)) {
    issues.push(`${path} must be an object`);
    return null;
  }
  const timestamp = reqStr(value.timestamp, `${path}.timestamp`, 80, issues);
  const actor = reqStr(value.actor, `${path}.actor`, 120, issues);
  const summary = reqStr(value.summary, `${path}.summary`, 500, issues);
  if (timestamp && !isDate(timestamp)) issues.push(`${path}.timestamp must be a date`);
  if (!timestamp || !actor || !summary) return null;
  return { timestamp, actor, summary };
}

function validateInteractions(value: unknown, issues: string[]): Interaction[] | null {
  if (!Array.isArray(value)) {
    issues.push("interactions must be an array");
    return null;
  }
  if (value.length > LIMITS.interactions) {
    issues.push(`interactions is limited to ${LIMITS.interactions} rows`);
    return null;
  }
  const rows: Interaction[] = [];
  for (let i = 0; i < value.length; i++) {
    const row = validateInteraction(value[i], `interactions[${i}]`, issues);
    if (row) rows.push(row);
  }
  return rows;
}

function validateInteraction(value: unknown, path: string, issues: string[]): Interaction | null {
  if (!isRecord(value)) {
    issues.push(`${path} must be an object`);
    return null;
  }
  const timestamp = reqStr(value.timestamp, `${path}.timestamp`, 80, issues);
  const from = reqStr(value.from, `${path}.from`, 120, issues);
  const to = reqStr(value.to, `${path}.to`, 120, issues);
  const kind = interactionKind(value.kind, `${path}.kind`, issues);
  const title = reqStr(value.title, `${path}.title`, 160, issues);
  const packet_id = optionalId(value.packet_id, `${path}.packet_id`, issues);
  const status = optionalStatus(value.status, `${path}.status`, issues);
  if (timestamp && !isDate(timestamp)) issues.push(`${path}.timestamp must be a date`);
  if (!timestamp || !from || !to || !kind || !title || packet_id === undefined || status === undefined) return null;
  return { timestamp, from, to, kind, title, packet_id, status };
}

function interactionKind(value: unknown, path: string, issues: string[]): InteractionKind | null {
  if (typeof value !== "string") {
    issues.push(`${path} must be a string`);
    return null;
  }
  const kind = value.trim().toLowerCase();
  if (!INTERACTION_KINDS.includes(kind as InteractionKind)) {
    issues.push(`${path} must be packet, amendment, result, or message`);
    return null;
  }
  return kind as InteractionKind;
}

function directorKey(value: unknown, path: string, issues: string[]): DirectorKey | null {
  if (typeof value !== "string") {
    issues.push(`${path} must be a director key`);
    return null;
  }
  const key = value.trim().toLowerCase();
  if (!DIRECTOR_KEYS.includes(key as DirectorKey)) {
    issues.push(`${path} must be investment, intelligence, network, growth, firm_os, executive, or ryan`);
    return null;
  }
  return key as DirectorKey;
}

function optionalId(value: unknown, path: string, issues: string[]): string | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") {
    issues.push(`${path} must be a string or null`);
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 80) {
    issues.push(`${path} is too long`);
    return undefined;
  }
  return trimmed;
}

function optionalStatus(value: unknown, path: string, issues: string[]): string | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") {
    issues.push(`${path} must be a string or null`);
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 40) {
    issues.push(`${path} is too long`);
    return undefined;
  }
  return trimmed;
}

function pitchStatus(value: unknown, path: string, issues: string[]): PitchStatus | null {
  if (typeof value !== "string") {
    issues.push(`${path} must be a string`);
    return null;
  }
  const status = value.trim().toLowerCase();
  if (!PITCH_STATUSES.includes(status as PitchStatus)) {
    issues.push(`${path} must be new, reviewing, passed, or advanced`);
    return null;
  }
  return status as PitchStatus;
}

function scoreValue(value: unknown, path: string, issues: string[]): number | null | undefined {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    issues.push(`${path} must be a number or null`);
    return undefined;
  }
  return value;
}

function countValue(value: unknown, path: string, issues: string[]): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1_000_000) {
    issues.push(`${path} must be a number from 0 to 1000000`);
    return undefined;
  }
  return value;
}

function optionalUrl(value: unknown, path: string, issues: string[]): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") {
    issues.push(`${path} must be an http(s) URL or null`);
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 2000) {
    issues.push(`${path} is too long`);
    return null;
  }
  if (!isHttpUrl(trimmed)) {
    issues.push(`${path} must be an http(s) URL or null`);
    return null;
  }
  return trimmed;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function isDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function reqStr(value: unknown, path: string, max: number, issues: string[]): string | null {
  if (typeof value !== "string") {
    issues.push(`${path} must be a string`);
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    issues.push(`${path} is required`);
    return null;
  }
  if (trimmed.length > max) {
    issues.push(`${path} is too long`);
    return null;
  }
  return trimmed;
}

function optStr(value: unknown, path: string, max: number, issues: string[]): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    issues.push(`${path} must be a string`);
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > max) {
    issues.push(`${path} is too long`);
    return undefined;
  }
  return trimmed;
}

function clip(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
