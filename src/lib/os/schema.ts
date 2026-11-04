import { sanitizePreviewHtml } from "./preview-html";
import { blankToNull, normalizeDomain, normalizeLogoUrl } from "./present";
import {
  CRM_TRACKS,
  DIRECTOR_KEYS,
  INTERACTION_KINDS,
  PITCH_STATUSES,
  type ActivityItem,
  type BotFeed,
  type BotRecord,
  type CrmBook,
  type CrmPerson,
  type CrmTrack,
  type Decision,
  type DecisionBlockCheck,
  type DecisionChannel,
  type DecisionCompany,
  type DecisionDetail,
  type DecisionEvent,
  type DecisionFact,
  type DecisionOption,
  type DecisionPreview,
  type DecisionPerson,
  type DecisionWords,
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
  people: 5000,
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
  const crm = input.crm === undefined ? { people: [] } : validateCrm(input.crm, issues);

  if (!generated_at || !pitches || !bots || !outreach || !decisions || !activity || !interactions || !crm || issues.length) {
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
      crm,
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
  const sector = softBlank(value.sector, 200);
  const stage = softBlank(value.stage, 80);
  const received = reqStr(value.received, `${path}.received`, 80, issues);
  const founder = softBlank(value.founder, 200);
  const source = softBlank(value.source, 200);
  const status = pitchStatus(value.status, `${path}.status`, issues);
  const score = scoreValue(value.score, `${path}.score`, issues);
  const deck = optionalUrl(value.deck, `${path}.deck`, issues);
  if (received && !isDate(received)) issues.push(`${path}.received must be a date`);
  if (!company || !received || !status || score === undefined) return null;
  const pitch: Pitch = { company, sector, stage, received, founder, status, score, source, deck };
  const title = softText(value.title, 160);
  const summary = softText(value.summary, 2000);
  const domain = normalizeDomain(typeof value.domain === "string" ? value.domain : null);
  const logo = normalizeLogoUrl(typeof value.logo_url === "string" ? value.logo_url : null);
  if (title) pitch.title = title;
  if (summary) pitch.summary = summary;
  if (domain) pitch.domain = domain;
  if (logo) pitch.logo_url = logo;
  return pitch;
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
  const title = requiredClip(value.title, `${path}.title`, 4000, issues);
  const since = reqStr(value.since, `${path}.since`, 80, issues);
  const link = optionalUrl(value.link, `${path}.link`, issues);
  if (since && !isDate(since)) issues.push(`${path}.since must be a date`);
  if (!title || !since) return null;
  const decision: Decision = { title, since, link };
  const id = optStr(value.id, `${path}.id`, 80, issues);
  const context = softText(value.context, 600);
  const summary = softText(value.summary, 2000);
  const domain = normalizeDomain(typeof value.domain === "string" ? value.domain : null);
  const logo = normalizeLogoUrl(typeof value.logo_url === "string" ? value.logo_url : null);
  const exact = softText(value.exact_message, 8000);
  const requested = optStr(value.requested_by, `${path}.requested_by`, 120, issues);
  const created = optStr(value.created_at, `${path}.created_at`, 80, issues);
  if (id) decision.id = id;
  if (context) decision.context = context;
  if (summary) decision.summary = summary;
  if (domain) decision.domain = domain;
  if (logo) decision.logo_url = logo;
  if (exact) decision.exact_message = exact;
  if (requested) decision.requested_by = requested;
  if (created) {
    if (!isDate(created)) issues.push(`${path}.created_at must be a date`);
    else decision.created_at = created;
  }
  if (value.options !== undefined) {
    const options = validateOptions(value.options, `${path}.options`, issues);
    if (options) decision.options = options;
  }
  const toEmail = optStr(value.to_email, `${path}.to_email`, 200, issues);
  const cc = optStr(value.cc, `${path}.cc`, 500, issues);
  const subject = optStr(value.subject, `${path}.subject`, 300, issues);
  const threadId = optStr(value.thread_id, `${path}.thread_id`, 200, issues);
  const replyTo = optStr(value.reply_to_msg_id, `${path}.reply_to_msg_id`, 200, issues);
  const channel = decisionChannel(value.channel, `${path}.channel`, issues);
  const person = validateDecisionPerson(value.person, `${path}.person`, issues);
  const words = validateTheirWords(value.their_words, `${path}.their_words`, issues);
  const timeline = validateTimeline(value.timeline, `${path}.timeline`, issues);
  const why = softBlock(value.why_ryan, 2000, `${path}.why_ryan`, issues);
  const body = softBlock(value.body_formatted, 8000, `${path}.body_formatted`, issues);
  const raw = softBlock(value.context_raw, 8000, `${path}.context_raw`, issues);
  const checks = validateChecks(value.checks, `${path}.checks`, issues);
  if (toEmail) decision.to_email = toEmail;
  if (cc) decision.cc = cc;
  if (subject) decision.subject = subject;
  if (threadId) decision.thread_id = threadId;
  if (replyTo) decision.reply_to_msg_id = replyTo;
  if (channel) decision.channel = channel;
  if (person) decision.person = person;
  if (words) decision.their_words = words;
  if (timeline) decision.timeline = timeline;
  if (why) decision.why_ryan = why;
  if (body) decision.body_formatted = body;
  if (raw) decision.context_raw = raw;
  if (checks) decision.checks = checks;
  if (value.detail !== undefined && value.detail !== null) {
    const detail = validateDecisionDetail(value.detail, `${path}.detail`, issues);
    if (detail) decision.detail = detail;
  }
  return decision;
}

function decisionChannel(value: unknown, path: string, issues: string[]): DecisionChannel | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    issues.push(`${path} must be email or linkedin`);
    return undefined;
  }
  const channel = value.trim().toLowerCase();
  if (channel === "email" || channel === "linkedin") return channel;
  issues.push(`${path} must be email or linkedin`);
  return undefined;
}

function validateDecisionPerson(value: unknown, path: string, issues: string[]): DecisionPerson | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) {
    issues.push(`${path} must be an object`);
    return undefined;
  }
  const person: DecisionPerson = {};
  const name = optStr(value.name, `${path}.name`, 120, issues);
  const company = optStr(value.company, `${path}.company`, 160, issues);
  const does = optStr(value.what_they_do, `${path}.what_they_do`, 240, issues);
  const reach = optStr(value.reach, `${path}.reach`, 160, issues);
  const source = optStr(value.source, `${path}.source`, 500, issues);
  if (name) person.name = name;
  if (company) person.company = company;
  if (does) person.what_they_do = does;
  if (reach) person.reach = reach;
  if (source) person.source = source;
  if (value.block_check !== undefined && value.block_check !== null) {
    const check = validateBlockCheck(value.block_check, `${path}.block_check`, issues);
    if (check) person.block_check = check;
  }
  return Object.keys(person).length ? person : undefined;
}

function validateBlockCheck(value: unknown, path: string, issues: string[]): DecisionBlockCheck | undefined {
  if (!isRecord(value)) {
    issues.push(`${path} must be an object`);
    return undefined;
  }
  if (typeof value.blocked !== "boolean") {
    issues.push(`${path}.blocked must be a boolean`);
    return undefined;
  }
  const at = optStr(value.at, `${path}.at`, 80, issues);
  if (at && !isDate(at)) issues.push(`${path}.at must be a date`);
  const byRaw = typeof value.by === "string" ? value.by.trim().toLowerCase() : "";
  const by = byRaw === "email and name" || byRaw === "name only" ? byRaw : null;
  if (!by) issues.push(`${path}.by must be "email and name" or "name only"`);
  const reason = softBlock(value.reason, 300, `${path}.reason`, issues);
  if (!at || !isDate(at) || !by) return undefined;
  const check: DecisionBlockCheck = { blocked: value.blocked, at, by };
  if (reason) check.reason = reason;
  return check;
}

function validateTheirWords(value: unknown, path: string, issues: string[]): DecisionWords | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) {
    issues.push(`${path} must be an object`);
    return undefined;
  }
  const words: DecisionWords = {};
  const quote = softBlock(value.quote, 2000, `${path}.quote`, issues);
  const at = optStr(value.at, `${path}.at`, 80, issues);
  const atEt = optStr(value.at_et, `${path}.at_et`, 120, issues);
  const source = optStr(value.source, `${path}.source`, 500, issues);
  if (quote) words.quote = quote;
  if (at) {
    if (!isDate(at)) issues.push(`${path}.at must be a date`);
    else words.at = at;
  }
  if (atEt) words.at_et = atEt;
  if (source) words.source = source;
  const approx = optionalBool(value.approx, `${path}.approx`, issues);
  if (approx !== undefined) words.approx = approx;
  return Object.keys(words).length ? words : undefined;
}

function validateTimeline(value: unknown, path: string, issues: string[]): DecisionEvent[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array`);
    return undefined;
  }
  const rows: DecisionEvent[] = [];
  for (let i = 0; i < value.length && rows.length < 40; i++) {
    const item = value[i];
    if (!isRecord(item)) {
      issues.push(`${path}[${i}] must be an object`);
      continue;
    }
    const row: DecisionEvent = {};
    const at = optStr(item.at, `${path}[${i}].at`, 80, issues);
    const atEt = optStr(item.at_et, `${path}[${i}].at_et`, 120, issues);
    const event = softBlock(item.event, 1000, `${path}[${i}].event`, issues);
    const source = optStr(item.source, `${path}[${i}].source`, 500, issues);
    if (at) {
      if (!isDate(at)) issues.push(`${path}[${i}].at must be a date`);
      else row.at = at;
    }
    if (atEt) row.at_et = atEt;
    if (event) row.event = event;
    if (source) row.source = source;
    const approx = optionalBool(item.approx, `${path}[${i}].approx`, issues);
    if (approx !== undefined) row.approx = approx;
    if (Object.keys(row).length) rows.push(row);
  }
  return rows.length ? rows : undefined;
}

function validateChecks(value: unknown, path: string, issues: string[]): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array`);
    return undefined;
  }
  const checks: string[] = [];
  for (const item of value) {
    if (checks.length >= 12) break;
    if (typeof item !== "string") {
      issues.push(`${path} must be strings`);
      continue;
    }
    const text = item.trim();
    if (text) checks.push(text.slice(0, 400));
  }
  return checks.length ? checks : undefined;
}

function optionalBool(value: unknown, path: string, issues: string[]): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") {
    issues.push(`${path} must be a boolean`);
    return undefined;
  }
  return value;
}

function softBlock(value: unknown, max: number, path: string, issues: string[]): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    issues.push(`${path} must be a string`);
    return undefined;
  }
  const trimmed = value.replace(/\r\n/g, "\n").trim();
  if (!trimmed) return undefined;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function validateOptions(value: unknown, path: string, issues: string[]): DecisionOption[] | null {
  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array`);
    return null;
  }
  if (value.length > 8) {
    issues.push(`${path} is limited to 8 choices`);
    return null;
  }
  const rows: DecisionOption[] = [];
  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    if (!isRecord(item)) {
      issues.push(`${path}[${i}] must be an object`);
      continue;
    }
    const optionValue = reqStr(item.value, `${path}[${i}].value`, 80, issues);
    const label = reqStr(item.label, `${path}[${i}].label`, 80, issues);
    if (optionValue && label) rows.push({ value: optionValue, label });
  }
  return rows;
}

function validateDecisionDetail(value: unknown, path: string, issues: string[]): DecisionDetail | undefined {
  if (!isRecord(value)) {
    issues.push(`${path} must be an object`);
    return undefined;
  }
  const detail: DecisionDetail = {};
  const kind = optStr(value.kind, `${path}.kind`, 40, issues);
  if (kind) detail.kind = kind;
  if (value.picks !== undefined) {
    const picks = validateCompanies(value.picks, `${path}.picks`, 12, issues);
    if (picks) detail.picks = picks;
  }
  if (value.candidates !== undefined) {
    const candidates = validateCompanies(value.candidates, `${path}.candidates`, 24, issues);
    if (candidates) detail.candidates = candidates;
  }
  if (value.preview !== undefined && value.preview !== null) {
    const preview = validatePreview(value.preview, `${path}.preview`, issues);
    if (preview) detail.preview = preview;
  }
  return Object.keys(detail).length ? detail : undefined;
}

function validateCompanies(value: unknown, path: string, max: number, issues: string[]): DecisionCompany[] | undefined {
  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array`);
    return undefined;
  }
  if (value.length > max) {
    issues.push(`${path} is limited to ${max} companies`);
    return undefined;
  }
  const rows: DecisionCompany[] = [];
  for (let i = 0; i < value.length; i++) {
    const company = validateCompany(value[i], `${path}[${i}]`, issues);
    if (company) rows.push(company);
  }
  return rows;
}

function validateCompany(value: unknown, path: string, issues: string[]): DecisionCompany | null {
  if (!isRecord(value)) {
    issues.push(`${path} must be an object`);
    return null;
  }
  const slug = optStr(value.slug, `${path}.slug`, 40, issues);
  const name = publicText(value.name, 120);
  if (!slug || !/^[a-z0-9][a-z0-9-]{0,39}$/.test(slug) || !name) {
    issues.push(`${path} needs a slug and a name`);
    return null;
  }
  const company: DecisionCompany = { slug, name };
  const one = publicText(value.one_liner, 240);
  const category = publicText(value.category, 80);
  const stage = publicText(value.stage, 80);
  const location = publicText(value.location, 80);
  const score = publicText(value.score, 40);
  const why = publicText(value.why, 600);
  const concerns = publicText(value.concerns, 600);
  const source = publicText(value.source, 240);
  const website = httpsUrl(value.website);
  if (one) company.one_liner = one;
  if (category) company.category = category;
  if (stage) company.stage = stage;
  else if (value.stage === null) company.stage = null;
  if (location) company.location = location;
  else if (value.location === null) company.location = null;
  if (score) company.score = score;
  else if (value.score === null) company.score = null;
  if (why) company.why = why;
  if (concerns) company.concerns = concerns;
  else if (value.concerns === null) company.concerns = null;
  if (source) company.source = source;
  if (website) company.website = website;
  else company.website = null;
  if (value.facts !== undefined) {
    const facts = validateFacts(value.facts, `${path}.facts`, issues);
    if (facts?.length) company.facts = facts;
  }
  return company;
}

function validateFacts(value: unknown, path: string, issues: string[]): DecisionFact[] | undefined {
  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array`);
    return undefined;
  }
  const facts: DecisionFact[] = [];
  for (let i = 0; i < Math.min(value.length, 12); i++) {
    const item = value[i];
    if (!isRecord(item)) continue;
    const label = publicText(item.label, 80);
    const factValue = publicText(item.value, 240);
    if (!label || !factValue) continue;
    const fact: DecisionFact = { label, value: factValue };
    const source = publicText(item.source_note, 80);
    if (source) fact.source_note = source;
    facts.push(fact);
  }
  return facts;
}

function validatePreview(value: unknown, path: string, issues: string[]): DecisionPreview | undefined {
  if (!isRecord(value)) {
    issues.push(`${path} must be an object`);
    return undefined;
  }
  const preview: DecisionPreview = {};
  const subject = publicText(value.subject, 200);
  const toLabel = publicText(value.to_label, 80);
  const text = publicText(value.text, 8000);
  const html = typeof value.html === "string" ? sanitizePreviewHtml(stripPrivate(value.html)).trim().slice(0, 20000) : "";
  const attachment = publicText(value.attachment_label, 120);
  const version = publicText(value.version, 40);
  const hash = optStr(value.hash, `${path}.hash`, 80, issues);
  if (subject) preview.subject = subject;
  if (toLabel) preview.to_label = toLabel;
  if (text) preview.text = text;
  if (html) preview.html = html;
  if (attachment) preview.attachment_label = attachment;
  if (version) preview.version = version;
  if (hash && /^[a-f0-9]{64}$/.test(hash)) preview.hash = hash;
  return Object.keys(preview).length ? preview : undefined;
}

function publicText(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const stripped = stripPrivate(value).replace(/\s{2,}/g, " ").trim();
  if (!stripped) return undefined;
  return stripped.slice(0, max);
}

function stripPrivate(value: string): string {
  return value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "").replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, "");
}

function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2000) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function validateCrm(value: unknown, issues: string[]): CrmBook | null {
  if (!isRecord(value)) {
    issues.push("crm must be an object");
    return null;
  }
  if (!Array.isArray(value.people)) {
    issues.push("crm.people must be an array");
    return null;
  }
  if (value.people.length > LIMITS.people) {
    issues.push(`crm.people is limited to ${LIMITS.people} rows`);
    return null;
  }
  const people: CrmPerson[] = [];
  for (let i = 0; i < value.people.length; i++) {
    const person = validatePerson(value.people[i], `crm.people[${i}]`, issues);
    if (person) people.push(person);
  }
  return { people };
}

function validatePerson(value: unknown, path: string, issues: string[]): CrmPerson | null {
  if (!isRecord(value)) {
    issues.push(`${path} must be an object`);
    return null;
  }
  const id = reqStr(value.id, `${path}.id`, 80, issues);
  const name = reqStr(value.name, `${path}.name`, 120, issues);
  const stage = personStage(value.stage);
  const track = crmTrack(value.track, `${path}.track`, issues);
  const firm = nullableStr(value.firm, `${path}.firm`, 120, issues);
  const owner = nullableStr(value.owner, `${path}.owner`, 80, issues);
  const lastTouch = nullableDate(value.last_touch_at, `${path}.last_touch_at`, issues);
  const channel = nullableStr(value.last_touch_channel, `${path}.last_touch_channel`, 40, issues);
  const nextStep = nullableStr(value.next_step, `${path}.next_step`, 200, issues);
  const nextDue = nullableDate(value.next_step_due, `${path}.next_step_due`, issues);
  const email = nullableStr(value.email, `${path}.email`, 200, issues);
  const linkedin = nullableStr(value.linkedin, `${path}.linkedin`, 200, issues);
  const notes = nullableStr(value.notes, `${path}.notes`, 280, issues);
  if (!id || !name || !track) return null;
  if ([firm, owner, lastTouch, channel, nextStep, nextDue, email, linkedin, notes].includes(undefined)) return null;
  const person: CrmPerson = {
    id,
    name,
    firm: firm ?? null,
    track,
    stage,
    owner: owner ?? null,
    last_touch_at: lastTouch ?? null,
    last_touch_channel: channel ?? null,
    next_step: nextStep ?? null,
    next_step_due: nextDue ?? null,
    email: email ?? null,
    linkedin: linkedin ?? null,
    notes: notes ?? null,
  };
  const domain = normalizeDomain(typeof value.domain === "string" ? value.domain : null);
  const logo = normalizeLogoUrl(typeof value.logo_url === "string" ? value.logo_url : null);
  if (domain) person.domain = domain;
  if (logo) person.logo_url = logo;
  if (typeof value.im_in === "boolean") person.im_in = value.im_in;
  else if (value.im_in !== undefined && value.im_in !== null) issues.push(`${path}.im_in must be a boolean`);
  if (typeof value.lp === "boolean") person.lp = value.lp;
  else if (value.lp !== undefined && value.lp !== null) issues.push(`${path}.lp must be a boolean`);
  const queueChannel = value.channel === undefined ? null : nullableStr(value.channel, `${path}.channel`, 40, issues);
  if (queueChannel === undefined) return null;
  if (queueChannel) person.channel = queueChannel;
  if (issues.some((issue) => issue.startsWith(`${path}.im_in`) || issue.startsWith(`${path}.lp`))) return null;
  return person;
}

function personStage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase() === "unknown") return "unknown";
  const text = blankToNull(trimmed);
  return text ? text.slice(0, 80) : null;
}

function crmTrack(value: unknown, path: string, issues: string[]): CrmTrack | null {
  if (typeof value !== "string") {
    issues.push(`${path} must be a string`);
    return null;
  }
  const track = value.trim().toLowerCase();
  if (!CRM_TRACKS.includes(track as CrmTrack)) {
    issues.push(`${path} must be a known track`);
    return null;
  }
  return track as CrmTrack;
}

function nullableStr(value: unknown, path: string, max: number, issues: string[]): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    issues.push(`${path} must be a string or null`);
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) {
    issues.push(`${path} is too long`);
    return undefined;
  }
  return trimmed;
}

function nullableDate(value: unknown, path: string, issues: string[]): string | null | undefined {
  const text = nullableStr(value, path, 80, issues);
  if (text && !isDate(text)) {
    issues.push(`${path} must be a date or null`);
    return undefined;
  }
  return text;
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

function requiredClip(value: unknown, path: string, max: number, issues: string[]): string | null {
  if (typeof value !== "string" || !value.trim()) {
    issues.push(typeof value === "string" ? `${path} is required` : `${path} must be a string`);
    return null;
  }
  return value.trim().slice(0, max);
}

function softBlank(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = blankToNull(value);
  return text ? text.slice(0, max) : null;
}

function softText(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
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
