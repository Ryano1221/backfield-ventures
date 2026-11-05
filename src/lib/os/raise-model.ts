/**
 * The Fund I raise ledger. Ryan keeps it by hand in the OS: a target, a close
 * date, and one row per LP commitment. Bots never write here.
 */


export const COMMIT_STATUSES = ["soft", "committed", "wired"] as const;
export type CommitStatus = (typeof COMMIT_STATUSES)[number];

export type Commitment = {
  id: string;
  name: string;
  firm: string | null;
  amount_usd: number;
  status: CommitStatus;
  person_id: string | null;
  note: string | null;
  updated_at: string;
};

export type RaiseLedger = {
  fund: string;
  target_usd: number | null;
  close_date: string | null;
  commitments: Commitment[];
  updated_at: string | null;
};

export type RaiseSummary = {
  fund: string;
  target: number | null;
  committed: number;
  wired: number;
  soft: number;
  hard: number;
  pctHard: number | null;
  pctSoft: number | null;
  remaining: number | null;
  lpCount: number;
  softCount: number;
  daysLeft: number | null;
  perWeekNeeded: number | null;
  closeLabel: string | null;
};

export const EMPTY_LEDGER: RaiseLedger = { fund: "Fund I", target_usd: null, close_date: null, commitments: [], updated_at: null };

const MAX_ROWS = 500;
const MAX_USD = 1_000_000_000;

export function summarizeRaise(ledger: RaiseLedger, now = Date.now()): RaiseSummary {
  const sum = (status: CommitStatus) => ledger.commitments.filter((row) => row.status === status).reduce((total, row) => total + row.amount_usd, 0);
  const wired = sum("wired");
  const committed = sum("committed");
  const soft = sum("soft");
  const hard = wired + committed;
  const target = ledger.target_usd && ledger.target_usd > 0 ? ledger.target_usd : null;
  let daysLeft: number | null = null;
  let closeLabel: string | null = null;
  if (ledger.close_date && /^\d{4}-\d{2}-\d{2}$/.test(ledger.close_date)) {
    const close = Date.parse(`${ledger.close_date}T23:59:59-06:00`);
    if (Number.isFinite(close)) {
      daysLeft = Math.max(0, Math.ceil((close - now) / 86_400_000));
      closeLabel = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", year: "numeric" }).format(new Date(`${ledger.close_date}T12:00:00-06:00`));
    }
  }
  const remaining = target ? Math.max(0, target - hard) : null;
  const weeks = daysLeft != null ? Math.max(1, daysLeft / 7) : null;
  return {
    fund: ledger.fund || "Fund I",
    target,
    committed,
    wired,
    soft,
    hard,
    pctHard: target ? Math.min(100, (hard / target) * 100) : null,
    pctSoft: target ? Math.min(100, ((hard + soft) / target) * 100) : null,
    remaining,
    lpCount: ledger.commitments.filter((row) => row.status !== "soft").length,
    softCount: ledger.commitments.filter((row) => row.status === "soft").length,
    daysLeft,
    perWeekNeeded: remaining != null && weeks ? Math.ceil(remaining / weeks) : null,
    closeLabel,
  };
}

/** $1.2M, $250K, $40K, $900 */
export function usd(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${trim(value / 1_000_000)}M`;
  if (abs >= 1_000) return `$${trim(value / 1_000)}K`;
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function trim(value: number): string {
  return value >= 100 ? Math.round(value).toString() : value.toFixed(value >= 10 ? 1 : 2).replace(/\.?0+$/, "");
}

export type RaiseOp =
  | { op: "upsert"; commitment: Partial<Commitment> & { name?: unknown; amount_usd?: unknown } }
  | { op: "remove"; id: string }
  | { op: "settings"; target_usd?: unknown; close_date?: unknown; fund?: unknown };

/** Apply one change from the page. Returns the new ledger or a plain error. */
export function applyRaiseOp(ledger: RaiseLedger, input: unknown, now = new Date()): { ok: true; ledger: RaiseLedger } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "Send an op" };
  const body = input as Record<string, unknown>;
  const stamp = now.toISOString();
  if (body.op === "settings") {
    const next = { ...ledger, updated_at: stamp };
    if (body.target_usd !== undefined) {
      const target = money(body.target_usd);
      if (target === undefined) return { ok: false, error: "Target must be a dollar amount" };
      next.target_usd = target;
    }
    if (body.close_date !== undefined) {
      if (body.close_date === null || body.close_date === "") next.close_date = null;
      else if (typeof body.close_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.close_date)) next.close_date = body.close_date;
      else return { ok: false, error: "Close date must look like 2027-03-31" };
    }
    if (body.fund !== undefined) {
      const fund = text(body.fund, 40);
      if (!fund) return { ok: false, error: "Fund name is empty" };
      next.fund = fund;
    }
    return { ok: true, ledger: next };
  }
  if (body.op === "remove") {
    const id = typeof body.id === "string" ? body.id : "";
    if (!ledger.commitments.some((row) => row.id === id)) return { ok: false, error: "That commitment is gone" };
    return { ok: true, ledger: { ...ledger, commitments: ledger.commitments.filter((row) => row.id !== id), updated_at: stamp } };
  }
  if (body.op === "upsert") {
    const row = (body.commitment && typeof body.commitment === "object" ? body.commitment : {}) as Record<string, unknown>;
    const name = text(row.name, 120);
    if (!name) return { ok: false, error: "Add the LP's name" };
    const amount = money(row.amount_usd);
    if (amount == null) return { ok: false, error: "Add an amount in dollars" };
    const status = COMMIT_STATUSES.includes(row.status as CommitStatus) ? (row.status as CommitStatus) : "soft";
    const id = typeof row.id === "string" && /^[a-z0-9-]{6,64}$/.test(row.id) ? row.id : `c-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const next: Commitment = {
      id,
      name,
      firm: text(row.firm, 120),
      amount_usd: amount,
      status,
      person_id: text(row.person_id, 200),
      note: text(row.note, 500),
      updated_at: stamp,
    };
    const rest = ledger.commitments.filter((item) => item.id !== id);
    if (rest.length >= MAX_ROWS) return { ok: false, error: "The ledger is full" };
    return { ok: true, ledger: { ...ledger, commitments: [...rest, next], updated_at: stamp } };
  }
  return { ok: false, error: "Unknown op" };
}

function money(value: unknown): number | null | undefined {
  if (value === null || value === "") return null;
  const raw = typeof value === "number" ? value : typeof value === "string" ? parseMoney(value) : NaN;
  if (!Number.isFinite(raw) || raw < 0 || raw > MAX_USD) return undefined;
  return Math.round(raw);
}

/** Accepts 250000, 250,000, $250k, 1.5m. */
export function parseMoney(value: string): number {
  const clean = value.trim().toLowerCase().replace(/[$,\s]/g, "");
  const match = clean.match(/^(\d+(?:\.\d+)?)([km]?)$/);
  if (!match) return NaN;
  const base = Number(match[1]);
  return match[2] === "m" ? base * 1_000_000 : match[2] === "k" ? base * 1_000 : base;
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const clean = value.replace(/\s+/g, " ").trim().slice(0, max);
  return clean || null;
}

export function parseLedger(raw: string | null): RaiseLedger {
  if (!raw) return { ...EMPTY_LEDGER };
  try {
    const parsed = JSON.parse(raw) as Partial<RaiseLedger>;
    const commitments = Array.isArray(parsed.commitments)
      ? parsed.commitments.filter(
          (row): row is Commitment =>
            Boolean(row) && typeof row.id === "string" && typeof row.name === "string" && typeof row.amount_usd === "number" && COMMIT_STATUSES.includes(row.status),
        )
      : [];
    return {
      fund: typeof parsed.fund === "string" && parsed.fund ? parsed.fund : "Fund I",
      target_usd: typeof parsed.target_usd === "number" ? parsed.target_usd : null,
      close_date: typeof parsed.close_date === "string" ? parsed.close_date : null,
      commitments,
      updated_at: typeof parsed.updated_at === "string" ? parsed.updated_at : null,
    };
  } catch {
    return { ...EMPTY_LEDGER };
  }
}

