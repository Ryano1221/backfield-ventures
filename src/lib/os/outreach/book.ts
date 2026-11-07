/** Saved outreach state and the changes Ryan makes to it. Pure functions. */
import type { Lead } from "../leads/types";
import { altSubject, autoAddress, buildSteps, LP_FORBIDDEN, OPT_OUT, pickVariant, suppressed, templateSteps, zoneFor } from "./plan";
import { DEFAULT_SETTINGS, EMPTY_OUTREACH, type Enrollment, type OutreachBook, type OutreachEvent } from "./types";

const MAX_LOG = 300;
const EMAIL = /^[^@\s,;<>]+@[^@\s,;<>]+\.[a-z]{2,}$/i;

export function parseOutreach(raw: string | null): OutreachBook {
  if (!raw) return structuredClone(EMPTY_OUTREACH);
  try {
    const data = JSON.parse(raw) as Partial<OutreachBook>;
    return {
      version: 1,
      settings: { ...DEFAULT_SETTINGS, ...(data.settings ?? {}), kinds: { ...DEFAULT_SETTINGS.kinds, ...(data.settings?.kinds ?? {}) }, subject_winner: { ...(data.settings?.subject_winner ?? {}) } },
      enrollments: Array.isArray(data.enrollments) ? data.enrollments.filter((e) => e && typeof e.lead_id === "string" && Array.isArray(e.steps)) : [],
      suppress: Array.isArray(data.suppress) ? data.suppress.filter((s) => typeof s === "string") : [],
      log: Array.isArray(data.log) ? data.log.slice(-MAX_LOG) : [],
    };
  } catch {
    return structuredClone(EMPTY_OUTREACH);
  }
}

export function logEvent(book: OutreachBook, event: OutreachEvent): OutreachBook {
  return { ...book, log: [...book.log, event].slice(-MAX_LOG) };
}

/** Written steps for a lead: the AI's when given and clean, else the templates. LP notes never mention the fund. */
export function writtenSteps(lead: Lead, ai: { subject: string; body: string }[] | null): { subject: string; body: string }[] {
  const firstEmail = lead.draft ? { subject: lead.draft.subject, body: lead.draft.body } : null;
  const templates = templateSteps(lead.kind, lead.company, lead.contacts.find((c) => c.email === lead.to)?.name ?? lead.people[0]?.name ?? null, lead.kind === "lp" ? null : firstEmail);
  if (lead.kind === "lp" && firstEmail && !LP_FORBIDDEN.test(`${firstEmail.subject} ${firstEmail.body}`)) templates[0] = firstEmail;
  if (!ai || ai.length < templates.length) return templates;
  return templates.map((template, i) => {
    const mine = ai[i];
    if (!mine?.body.trim()) return template;
    if (lead.kind === "lp" && LP_FORBIDDEN.test(`${mine.subject} ${mine.body}`)) return template;
    // Step 1 stays the draft Ryan saw on the lead card when it exists.
    if (i === 0 && firstEmail) return template;
    return { subject: mine.subject || template.subject, body: mine.body };
  });
}

export function makeEnrollment(lead: Lead, email: string, by: "auto" | "you", now: string, ai: { subject: string; body: string }[] | null, variant?: "A" | "B"): Enrollment {
  const name = lead.contacts.find((c) => c.email === email)?.name ?? lead.people[0]?.name ?? null;
  let steps = buildSteps(writtenSteps(lead, ai));
  if (variant === "B") {
    // Arm B swaps only the first subject; follow-ups in the thread reply under it.
    const subject = altSubject(lead.kind, lead.company, name);
    steps = steps.map((step) => (step.n === 1 ? { ...step, subject } : step.new_thread ? step : { ...step, subject: `Re: ${subject}` }));
  }
  return {
    ...(variant ? { variant } : {}),
    lead_id: lead.id,
    kind: lead.kind,
    email: email.toLowerCase(),
    name,
    company: lead.company,
    tz: zoneFor(lead.location),
    steps,
    thread_id: null,
    status: "active",
    reason: by === "auto" ? `Started automatically at score ${lead.score}.` : "Started by you.",
    started_at: now,
    updated_at: now,
    by,
  };
}

export type OutreachResult = { ok: true; book: OutreachBook } | { ok: false; error: string };

const clampInt = (value: unknown, min: number, max: number, fallback: number) => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};

export function applyOutreachOp(book: OutreachBook, raw: unknown, leads: Lead[], now = new Date().toISOString(), gmailConnected = false): OutreachResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Nothing to change." };
  const op = raw as Record<string, unknown>;
  switch (op.op) {
    case "settings": {
      const s = { ...book.settings };
      if (typeof op.enabled === "boolean") {
        if (op.enabled && !gmailConnected) return { ok: false, error: "Connect Gmail first. Autopilot sends from your mailbox." };
        s.enabled = op.enabled;
        if (op.enabled) {
          s.paused_reason = null;
          s.ramp_from = s.ramp_from ?? now;
        }
      }
      if (typeof op.digest === "boolean") s.digest = op.digest;
      if (typeof op.subject_test === "boolean") s.subject_test = op.subject_test;
      if (op.threshold !== undefined) s.threshold = clampInt(op.threshold, 50, 100, s.threshold);
      if (op.kinds && typeof op.kinds === "object") {
        const k = op.kinds as Record<string, unknown>;
        s.kinds = { founder: k.founder === undefined ? s.kinds.founder : Boolean(k.founder), partner: k.partner === undefined ? s.kinds.partner : Boolean(k.partner), lp: k.lp === undefined ? s.kinds.lp : Boolean(k.lp) };
      }
      const next = { ...book, settings: s };
      return { ok: true, book: logEvent(next, { at: now, lead_id: null, text: typeof op.enabled === "boolean" ? `Autopilot ${op.enabled ? "on" : "off"}.` : "Autopilot settings changed." }) };
    }
    case "enroll": {
      const lead = leads.find((l) => l.id === op.lead_id);
      if (!lead) return { ok: false, error: "That lead is not on the list." };
      const email = (typeof op.to === "string" && op.to.trim() ? op.to.trim() : lead.to ?? autoAddress(lead) ?? "").toLowerCase();
      if (!EMAIL.test(email)) return { ok: false, error: "Pick or type an email address first." };
      if (suppressed(book, email)) return { ok: false, error: "That address asked not to be contacted, or bounced." };
      if (book.enrollments.some((e) => e.email === email && e.status === "active")) return { ok: false, error: "That person is already in a sequence." };
      const enrollment = makeEnrollment({ ...lead, to: email }, email, "you", now, null, pickVariant(book, lead.kind));
      const others = book.enrollments.filter((e) => e.lead_id !== lead.id);
      return { ok: true, book: logEvent({ ...book, enrollments: [...others, enrollment] }, { at: now, lead_id: lead.id, text: `Sequence started for ${enrollment.company}.` }) };
    }
    case "stop": {
      const index = book.enrollments.findIndex((e) => e.lead_id === op.lead_id);
      if (index < 0) return { ok: false, error: "No sequence for that lead." };
      const enrollments = [...book.enrollments];
      enrollments[index] = { ...enrollments[index], status: "stopped", reason: "Stopped by you.", updated_at: now };
      // Stopping by hand also means "never auto-start this person again".
      const suppress = [...new Set([...book.suppress, enrollments[index].email])];
      return { ok: true, book: logEvent({ ...book, enrollments, suppress }, { at: now, lead_id: enrollments[index].lead_id, text: `Sequence stopped for ${enrollments[index].company}.` }) };
    }
    case "edit_step": {
      const index = book.enrollments.findIndex((e) => e.lead_id === op.lead_id);
      if (index < 0) return { ok: false, error: "No sequence for that lead." };
      const enrollment = book.enrollments[index];
      const step = enrollment.steps.find((s) => s.n === Number(op.n));
      if (!step) return { ok: false, error: "No such email in the sequence." };
      if (step.sent_at) return { ok: false, error: "That email already went out." };
      const body = typeof op.body === "string" ? op.body.replace(OPT_OUT, "").trim() : "";
      if (!body || body.length > 4000) return { ok: false, error: "The email needs some text." };
      const subject = step.new_thread && typeof op.subject === "string" && op.subject.trim() ? op.subject.trim().slice(0, 200) : step.subject;
      if (enrollment.kind === "lp" && LP_FORBIDDEN.test(`${subject} ${body}`)) return { ok: false, error: "LP emails can't mention the fund, raising, returns or commitments." };
      const steps = enrollment.steps.map((s) => (s.n === step.n ? { ...s, subject, body: `${body}\n\n${OPT_OUT}` } : s));
      // A new first subject carries to the replies in its thread.
      const threaded = step.n === 1 ? steps.map((s) => (!s.new_thread ? { ...s, subject: `Re: ${subject}` } : s)) : steps;
      const enrollments = [...book.enrollments];
      enrollments[index] = { ...enrollment, steps: threaded, updated_at: now };
      return { ok: true, book: { ...book, enrollments } };
    }
    case "unsuppress": {
      const email = typeof op.email === "string" ? op.email.trim().toLowerCase() : "";
      if (!book.suppress.includes(email)) return { ok: false, error: "That address isn't on the list." };
      return { ok: true, book: logEvent({ ...book, suppress: book.suppress.filter((entry) => entry !== email) }, { at: now, lead_id: null, text: `${email} removed from do-not-contact by you.` }) };
    }
    case "handled": {
      const index = book.enrollments.findIndex((e) => e.lead_id === op.lead_id && e.reply);
      if (index < 0) return { ok: false, error: "No reply for that lead." };
      const enrollments = [...book.enrollments];
      enrollments[index] = { ...enrollments[index], reply: { ...enrollments[index].reply!, handled_at: now } };
      return { ok: true, book: { ...book, enrollments } };
    }
    default:
      return { ok: false, error: "Unknown change." };
  }
}

/**
 * Saves a run without losing what changed meanwhile: settings Ryan changed win
 * (except the run's own bounce pause), a sequence he stopped stays stopped,
 * and sequences he started meanwhile are kept.
 */
export function mergeRun(before: OutreachBook, latest: OutreachBook, ran: OutreachBook): OutreachBook {
  const settingsChanged = JSON.stringify(latest.settings) !== JSON.stringify(before.settings);
  const pausedByRun = before.settings.enabled && !ran.settings.enabled && Boolean(ran.settings.paused_reason);
  const picked = pausedByRun ? { ...(settingsChanged ? latest.settings : ran.settings), enabled: false, paused_reason: ran.settings.paused_reason } : settingsChanged ? latest.settings : ran.settings;
  // The run's own bookkeeping always survives, so the morning email never goes twice.
  const settings = { ...picked, last_digest: ran.settings.last_digest ?? picked.last_digest, subject_winner: { ...picked.subject_winner, ...ran.settings.subject_winner } };
  const latestById = new Map(latest.enrollments.map((e) => [e.lead_id, e]));
  const enrollments = ran.enrollments.map((e) => {
    const now = latestById.get(e.lead_id);
    return now && now.status === "stopped" && e.status === "active" ? { ...e, status: now.status, reason: now.reason, updated_at: now.updated_at } : e;
  });
  const ranIds = new Set(ran.enrollments.map((e) => e.lead_id));
  for (const e of latest.enrollments) if (!ranIds.has(e.lead_id)) enrollments.push(e);
  const log = [...ran.log];
  for (const event of latest.log) if (!before.log.some((old) => old.at === event.at && old.text === event.text) && !log.some((old) => old.at === event.at && old.text === event.text)) log.push(event);
  log.sort((a, b) => a.at.localeCompare(b.at));
  return { ...ran, settings, enrollments, suppress: [...new Set([...ran.suppress, ...latest.suppress])], log: log.slice(-300) };
}
