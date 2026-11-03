export const PITCH_STATUSES = ["new", "reviewing", "passed", "advanced"] as const;

export type PitchStatus = (typeof PITCH_STATUSES)[number];

export type Pitch = {
  company: string;
  sector: string;
  stage: string;
  received: string;
  founder: string;
  status: PitchStatus;
  score: number | null;
  source: string;
  deck: string | null;
};

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

export type Decision = {
  title: string;
  since: string;
  link: string | null;
};

export type ActivityItem = {
  timestamp: string;
  actor: string;
  summary: string;
};

export type Snapshot = {
  generated_at: string;
  pitches: Pitch[];
  bots: BotFeed;
  outreach: OutreachTrack[];
  decisions: Decision[];
  activity: ActivityItem[];
};

export const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

export const PRIVATE_HEADERS = {
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
} as const;
