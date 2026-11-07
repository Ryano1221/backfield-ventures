/**
 * Outreach sequences: a short series of emails to one lead, sent from Ryan's
 * Gmail on a schedule, stopped the moment they reply, bounce or opt out.
 * Cadence follows Apollo's cold email playbook: first email, value 3 days
 * later, a new angle a week after, a soft breakup a week after that, and one
 * check-in three months on.
 */
import type { LeadKind } from "../leads/types";

export type StepKind = "first" | "value" | "angle" | "breakup" | "nurture";

export type Step = {
  n: number;
  kind: StepKind;
  /** Days after the previous step. */
  gap_days: number;
  subject: string;
  body: string;
  /** Follow-ups 2 to 4 reply in the same thread; the 3-month check-in starts a new one. */
  new_thread: boolean;
  sent_at: string | null;
  gmail_id: string | null;
  message_id: string | null;
};

export type EnrollmentStatus = "active" | "replied" | "bounced" | "opted_out" | "finished" | "stopped";

export type Enrollment = {
  lead_id: string;
  kind: LeadKind;
  email: string;
  name: string | null;
  company: string;
  /** IANA zone the emails are timed for. */
  tz: string;
  steps: Step[];
  thread_id: string | null;
  status: EnrollmentStatus;
  reason: string;
  started_at: string;
  updated_at: string;
  by: "auto" | "you";
  /** Their reply, for Ryan to act on. Cleared from the to-do list once he marks it done. */
  reply?: { at: string; snippet: string; handled_at: string | null; triage?: ReplyTriage | null } | null;
  /** An out-of-office came back; noted once, and it doesn't stop the sequence. */
  auto_reply_seen?: boolean;
  /** Subject test arm: A keeps the draft's subject, B uses the playbook formula. */
  variant?: "A" | "B";
};

export type OutreachSettings = {
  /** The master switch. Nothing sends while it is off. */
  enabled: boolean;
  /** Leads at or above this score start a sequence on their own. */
  threshold: number;
  kinds: Record<LeadKind, boolean>;
  /** New people per day: starts at `start_cap`, adds `ramp_per_week`, stops at `max_cap`. */
  start_cap: number;
  max_cap: number;
  ramp_per_week: number;
  /** When autopilot was first switched on; the ramp counts from here. */
  ramp_from: string | null;
  /** Why autopilot switched itself off, if it did. */
  paused_reason: string | null;
  /** A short morning email to Ryan: replies waiting, new top leads, what went out. */
  digest: boolean;
  /** The Central-time date the last morning email went out, YYYY-MM-DD. */
  last_digest: string | null;
  /** Split first-email subjects A/B per lead type until one clearly wins. */
  subject_test: boolean;
  /** The winning arm per lead type, once the test has decided. */
  subject_winner: Partial<Record<LeadKind, "A" | "B">>;
  /** Ryan's booking link (Calendly or similar), offered only once someone is interested. */
  calendar_url: string | null;
};

export type OutreachEvent = { at: string; lead_id: string | null; text: string };

export type OutreachBook = {
  version: 1;
  settings: OutreachSettings;
  enrollments: Enrollment[];
  /** Addresses never to email again: opt-outs, bounces, and stopped by hand. */
  suppress: string[];
  log: OutreachEvent[];
  /** When the hourly scheduled run last reached the OS. */
  last_cron_at?: string | null;
};

export const DEFAULT_SETTINGS: OutreachSettings = {
  enabled: false,
  threshold: 80,
  kinds: { founder: true, partner: true, lp: true },
  start_cap: 20,
  max_cap: 50,
  ramp_per_week: 5,
  ramp_from: null,
  paused_reason: null,
  digest: false,
  last_digest: null,
  subject_test: true,
  subject_winner: {},
  calendar_url: null,
};

export const EMPTY_OUTREACH: OutreachBook = { version: 1, settings: DEFAULT_SETTINGS, enrollments: [], suppress: [], log: [] };

export const INTENTS = ["interested", "question", "referral", "not_now", "not_interested", "other"] as const;
export type Intent = (typeof INTENTS)[number];
export const INTENT_LABEL: Record<Intent, string> = { interested: "Interested", question: "Has a question", referral: "Pointed you to someone", not_now: "Not now", not_interested: "Not interested", other: "Replied" };

/** What the reply means and a suggested answer, written by AI from the reply's text. Ryan sends it himself. */
export type ReplyTriage = { intent: Intent; summary: string; suggested: string };
