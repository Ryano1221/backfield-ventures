export const PITCH_STATUSES = ["new", "reviewing", "passed", "advanced"] as const;

export type PitchStatus = (typeof PITCH_STATUSES)[number];

export const PITCH_RATINGS = ["great", "good", "maybe", "no"] as const;

export type PitchRating = (typeof PITCH_RATINGS)[number];

export type Pitch = {
  company: string;
  sector: string | null;
  stage: string | null;
  received: string;
  founder: string | null;
  status: PitchStatus;
  score: number | null;
  source: string | null;
  deck: string | null;
  title?: string;
  summary?: string;
  domain?: string;
  logo_url?: string;
  /** Stable id, pitch_<slug>. Rate actions and deal links use it. */
  id?: string;
  website?: string | null;
  deck_url?: string | null;
  deck_note?: string | null;
  ryan_rating?: PitchRating | null;
  field_sources?: Record<string, string>;
};

export const DIRECTOR_KEYS = [
  "investment",
  "intelligence",
  "network",
  "growth",
  "firm_os",
  "executive",
  "ryan",
] as const;

export type DirectorKey = (typeof DIRECTOR_KEYS)[number];

export const INTERACTION_KINDS = ["packet", "amendment", "result", "message"] as const;

export type InteractionKind = (typeof INTERACTION_KINDS)[number];

export type BotRecord = {
  name: string;
  team: string;
  status: string;
  slug?: string;
  role?: string;
  scope?: string;
  registry_status?: string;
  last?: string;
  last_iso?: string | null;
  source?: string;
  result?: string;
  usage_share?: number | null;
  director?: DirectorKey;
};

export type RoutineRecord = {
  name?: string;
  status?: string;
  last?: string;
  next?: string;
  note?: string;
};

export type BotUsage = {
  weekly_used_pct?: number;
  on_demand_cycle_usd?: number;
  weekly_reset?: string;
  on_demand?: string;
  share_window?: string;
  [key: string]: unknown;
};

/** Bot-office feed. The live file is stored as-is under snapshot.bots. */
export type BotFeed = {
  built_at?: string;
  today?: string;
  bots: BotRecord[];
  routines?: RoutineRecord[];
  pulse?: unknown;
  usage?: BotUsage;
};

export type OutreachTrack = {
  track: string;
  sent: number;
  floor: number;
  label?: string;
};

export type DecisionOption = {
  value: string;
  label: string;
};

export type DecisionFact = {
  label: string;
  value: string;
  source_note?: string;
};

export type DecisionCompany = {
  slug: string;
  name: string;
  one_liner?: string;
  category?: string;
  stage?: string | null;
  location?: string | null;
  score?: string | null;
  why?: string;
  concerns?: string | null;
  source?: string;
  website?: string | null;
  facts?: DecisionFact[];
};

export type DecisionPreview = {
  subject?: string;
  to_label?: string;
  text?: string;
  html?: string;
  attachment_label?: string;
  version?: string;
  hash?: string;
};

export type DecisionDetail = {
  kind?: string;
  picks?: DecisionCompany[];
  candidates?: DecisionCompany[];
  preview?: DecisionPreview;
};

export type DecisionSwap = {
  out: string;
  in: string;
};

export type DecisionChannel = "email" | "linkedin";

export type DecisionBlockBy = "email and name" | "name only";

export type DecisionBlockCheck = {
  blocked: boolean;
  at: string;
  by: DecisionBlockBy;
  reason?: string;
};

export type DecisionPerson = {
  name?: string;
  company?: string;
  what_they_do?: string;
  reach?: string;
  source?: string;
  block_check?: DecisionBlockCheck;
};

export type DecisionWords = {
  quote?: string;
  at?: string;
  at_et?: string;
  source?: string;
  approx?: boolean;
};

export type DecisionEvent = {
  at?: string;
  at_et?: string;
  event?: string;
  source?: string;
  approx?: boolean;
};

export type DecisionVersion = {
  version: number;
  body: string;
  subject?: string;
  at?: string;
  by?: string;
  note?: string;
  sent_at?: string;
  sent_via?: string;
};

/** Optional end-of-day briefing rows. Absent until the snapshot builder emits them. */
export type DriveBrief = {
  id: string;
  kind: "yesno" | "question" | "note";
  title: string;
  body?: string;
  why?: string;
  from?: string;
  options?: DecisionOption[];
};

export type Decision = {
  title: string;
  since: string;
  link: string | null;
  id?: string;
  context?: string;
  summary?: string;
  domain?: string;
  logo_url?: string;
  options?: DecisionOption[];
  exact_message?: string;
  requested_by?: string;
  created_at?: string;
  to_email?: string;
  cc?: string;
  subject?: string;
  thread_id?: string;
  reply_to_msg_id?: string;
  channel?: DecisionChannel;
  person?: DecisionPerson;
  their_words?: DecisionWords;
  timeline?: DecisionEvent[];
  why_ryan?: string;
  /** queue_decisions vs draft_decisions, when the builder sends them apart from decisions. */
  lane?: "queue" | "draft";
  versions?: DecisionVersion[];
  /** Set when the owning bot has sent the latest approved text. */
  sent_at?: string;
  sent_via?: string;
  body_formatted?: string;
  context_raw?: string;
  checks?: string[];
  detail?: DecisionDetail;
};

export const CRM_TRACKS = [
  "investor",
  "family_office",
  "athlete",
  "creator",
  "real_estate",
  "lp",
  "founder",
  "other",
] as const;

export type CrmTrack = (typeof CRM_TRACKS)[number];

export type CrmPerson = {
  id: string;
  name: string;
  firm: string | null;
  track: CrmTrack;
  stage: string | null;
  owner: string | null;
  last_touch_at: string | null;
  last_touch_channel: string | null;
  next_step: string | null;
  next_step_due: string | null;
  email: string | null;
  linkedin: string | null;
  notes: string | null;
  domain?: string;
  logo_url?: string;
  /** Lasting yes. Present only once the snapshot builder sends it. */
  im_in?: boolean;
  /** LP relationship, independent of track. */
  lp?: boolean;
  /** Planned queue channel, when it is not the last touch. */
  channel?: string | null;
};

export const ACTION_TYPES = [
  "decide",
  "pitch_status",
  "crm_stage",
  "crm_next_step",
  "crm_note",
  "crm_hold",
  "crm_dnc",
  "draft_followup",
  "bot_request",
  "bot_pause",
  "bot_resume",
  "snooze",
  "free_text",
  "rate",
  "drive_approve",
  "drive_edit",
  "drive_skip",
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export type ActionPayload = {
  [key: string]: string | number | boolean | null | DecisionSwap[] | undefined;
  swaps?: DecisionSwap[];
};

export type OsAction = {
  action_id: string;
  type: ActionType;
  target_id: string;
  payload: ActionPayload;
  created_at: string;
  idempotency_key: string;
  acked_at: string | null;
  result: string | null;
  status: "pending" | "done" | "failed";
};

export type CrmBook = {
  people: CrmPerson[];
};

export type DecisionAnswer = {
  decision_id: string;
  choice: string;
  note: string | null;
  decided_at: string;
  exact_message_hash: string | null;
  acked_at: string | null;
  swaps?: DecisionSwap[] | null;
};

export type ActivityItem = {
  timestamp: string;
  actor: string;
  summary: string;
};

export type Interaction = {
  timestamp: string;
  from: string;
  to: string;
  kind: InteractionKind;
  packet_id: string | null;
  title: string;
  status: string | null;
};

export type Snapshot = {
  generated_at: string;
  pitches: Pitch[];
  bots: BotFeed;
  outreach: OutreachTrack[];
  decisions: Decision[];
  activity: ActivityItem[];
  interactions: Interaction[];
  crm: CrmBook;
  /** Present only when the builder sends ops/drive-briefings. */
  drive?: DriveBrief[];
};

export const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

export const PRIVATE_HEADERS = {
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
} as const;
