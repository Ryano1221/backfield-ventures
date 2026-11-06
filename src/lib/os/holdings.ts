/**
 * What Backfield actually owns: one holding per check, through Fund I, an
 * SPV, or directly. Each holding keeps its cost, its terms, its marks over
 * time and any money that came back. Fund math (MOIC, TVPI, DPI, IRR) is
 * computed from these, never typed in. Private store only; nothing sends.
 */

export const VEHICLES = ["fund", "spv", "direct"] as const;
export type Vehicle = (typeof VEHICLES)[number];
export const VEHICLE_LABEL: Record<Vehicle, string> = { fund: "Fund I", spv: "SPV", direct: "Direct" };

export const INSTRUMENTS = ["safe", "note", "priced", "other"] as const;
export type Instrument = (typeof INSTRUMENTS)[number];
export const INSTRUMENT_LABEL: Record<Instrument, string> = { safe: "SAFE", note: "Convertible note", priced: "Priced round", other: "Other" };

export const HOLDING_STATUSES = ["active", "exited", "written_off"] as const;
export type HoldingStatus = (typeof HOLDING_STATUSES)[number];
export const HOLDING_STATUS_LABEL: Record<HoldingStatus, string> = { active: "Active", exited: "Exited", written_off: "Written off" };

export type Mark = { id: string; date: string; value_usd: number; note: string };
export type Distribution = { id: string; date: string; amount_usd: number; note: string };

export type Holding = {
  id: string;
  company: string;
  deal_id: string | null;
  spv_id: string | null;
  vehicle: Vehicle;
  instrument: Instrument;
  invested_usd: number;
  date: string;
  /** Post-money valuation, or the cap on a SAFE or note. */
  valuation_usd: number | null;
  /** Typed in when known; otherwise worked out from check over valuation. */
  ownership_pct: number | null;
  status: HoldingStatus;
  marks: Mark[];
  distributions: Distribution[];
  notes: string;
  created_at: string;
  updated_at: string;
};

export type HoldingBook = { version: 1; holdings: Holding[] };
export const EMPTY_HOLDINGS: HoldingBook = { version: 1, holdings: [] };

export type HoldingResult = { ok: true; book: HoldingBook; id: string } | { ok: false; error: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/** "$250K", "1.5M", "250000", 250000 -> dollars. */
export function money(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
  if (typeof value !== "string") return null;
  const m = value.trim().replace(/[$,\s]/g, "").match(/^(\d+(?:\.\d+)?)([kKmMbB]?)$/);
  if (!m) return null;
  const mult = { "": 1, k: 1e3, m: 1e6, b: 1e9 }[m[2].toLowerCase() as "" | "k" | "m" | "b"];
  return Math.round(Number(m[1]) * mult);
}

function pct(value: unknown): number | null | undefined {
  if (value === null || value === "") return null;
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace("%", "")) : NaN;
  if (!Number.isFinite(n) || n < 0 || n > 100) return undefined;
  return n;
}

export function applyHoldingOp(book: HoldingBook, raw: unknown, now = new Date().toISOString(), newId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`): HoldingResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Nothing to change." };
  const op = raw as Record<string, unknown>;
  const find = () => book.holdings.find((row) => row.id === text(op.id, 80));
  const put = (next: Holding): HoldingResult => ({ ok: true, id: next.id, book: { version: 1, holdings: book.holdings.map((row) => (row.id === next.id ? next : row)) } });

  if (op.op === "create") {
    const company = text(op.company, 160);
    if (!company) return { ok: false, error: "Which company?" };
    const invested = money(op.invested_usd);
    if (!invested) return { ok: false, error: "Add the check size in dollars." };
    const date = text(op.date, 10) || now.slice(0, 10);
    if (!DATE.test(date)) return { ok: false, error: "Pick the date the money went in." };
    const vehicle = VEHICLES.includes(op.vehicle as Vehicle) ? (op.vehicle as Vehicle) : "fund";
    const instrument = INSTRUMENTS.includes(op.instrument as Instrument) ? (op.instrument as Instrument) : "safe";
    const valuation = op.valuation_usd === undefined || op.valuation_usd === "" ? null : money(op.valuation_usd);
    if (op.valuation_usd !== undefined && op.valuation_usd !== "" && valuation == null) return { ok: false, error: "The valuation should be a dollar amount." };
    const ownership = pct(op.ownership_pct ?? null);
    if (ownership === undefined) return { ok: false, error: "Ownership is a percent between 0 and 100." };
    if (book.holdings.length >= 2000) return { ok: false, error: "The holdings book is full." };
    const row: Holding = {
      id: newId("hold"),
      company,
      deal_id: text(op.deal_id, 200) || null,
      spv_id: text(op.spv_id, 80) || null,
      vehicle,
      instrument,
      invested_usd: invested,
      date,
      valuation_usd: valuation,
      ownership_pct: ownership,
      status: "active",
      marks: [],
      distributions: [],
      notes: text(op.notes, 4000),
      created_at: now,
      updated_at: now,
    };
    return { ok: true, id: row.id, book: { version: 1, holdings: [row, ...book.holdings] } };
  }

  const current = find();
  if (!current) return { ok: false, error: "That holding is not on the books." };

  if (op.op === "remove") return { ok: true, id: current.id, book: { version: 1, holdings: book.holdings.filter((row) => row.id !== current.id) } };

  if (op.op === "update") {
    const next: Holding = { ...current, updated_at: now };
    if (op.status !== undefined) {
      if (!HOLDING_STATUSES.includes(op.status as HoldingStatus)) return { ok: false, error: "Unknown status." };
      next.status = op.status as HoldingStatus;
    }
    if (op.notes !== undefined) next.notes = text(op.notes, 4000);
    if (op.valuation_usd !== undefined) {
      const v = op.valuation_usd === "" || op.valuation_usd === null ? null : money(op.valuation_usd);
      if (op.valuation_usd !== "" && op.valuation_usd !== null && v == null) return { ok: false, error: "The valuation should be a dollar amount." };
      next.valuation_usd = v;
    }
    if (op.ownership_pct !== undefined) {
      const o = pct(op.ownership_pct);
      if (o === undefined) return { ok: false, error: "Ownership is a percent between 0 and 100." };
      next.ownership_pct = o;
    }
    return put(next);
  }

  if (op.op === "mark") {
    const date = text(op.date, 10) || now.slice(0, 10);
    if (!DATE.test(date)) return { ok: false, error: "Pick the date of the mark." };
    let value = op.value_usd === undefined || op.value_usd === "" ? null : money(op.value_usd);
    // A new round's post-money is easier to know than our stake's value.
    if (value == null && op.round_valuation_usd !== undefined && op.round_valuation_usd !== "") {
      const round = money(op.round_valuation_usd);
      const own = ownershipOf(current);
      if (round == null) return { ok: false, error: "The round valuation should be a dollar amount." };
      if (own == null) return { ok: false, error: "Add the valuation or ownership on this holding first, or type the value of the stake." };
      value = Math.round((round * own) / 100);
    }
    if (value == null) return { ok: false, error: "Add what the stake is worth now, or the new round's valuation." };
    const mark: Mark = { id: newId("mark"), date, value_usd: value, note: text(op.note, 300) };
    return put({ ...current, marks: [...current.marks, mark].sort((a, b) => a.date.localeCompare(b.date)), updated_at: now });
  }

  if (op.op === "distribute") {
    const date = text(op.date, 10) || now.slice(0, 10);
    if (!DATE.test(date)) return { ok: false, error: "Pick the date the money came back." };
    const amount = money(op.amount_usd);
    if (!amount) return { ok: false, error: "Add how much came back." };
    const row: Distribution = { id: newId("dist"), date, amount_usd: amount, note: text(op.note, 300) };
    return put({ ...current, distributions: [...current.distributions, row].sort((a, b) => a.date.localeCompare(b.date)), updated_at: now });
  }

  if (op.op === "remove_mark") return put({ ...current, marks: current.marks.filter((row) => row.id !== text(op.mark_id, 80)), updated_at: now });
  if (op.op === "remove_distribution") return put({ ...current, distributions: current.distributions.filter((row) => row.id !== text(op.distribution_id, 80)), updated_at: now });

  return { ok: false, error: "Unknown change." };
}

export function parseHoldings(raw: string | null): HoldingBook {
  if (!raw) return { version: 1, holdings: [] };
  try {
    const data = JSON.parse(raw) as { holdings?: unknown };
    if (!Array.isArray(data.holdings)) return { version: 1, holdings: [] };
    return { version: 1, holdings: (data.holdings as Holding[]).filter((row) => row && typeof row.id === "string" && typeof row.invested_usd === "number").map((row) => ({ ...row, marks: row.marks ?? [], distributions: row.distributions ?? [] })) };
  } catch {
    return { version: 1, holdings: [] };
  }
}

/** Percent owned: typed in, or check over post-money. */
export function ownershipOf(h: Pick<Holding, "ownership_pct" | "invested_usd" | "valuation_usd">): number | null {
  if (h.ownership_pct != null) return h.ownership_pct;
  if (h.valuation_usd && h.valuation_usd > 0) return Math.min(100, (h.invested_usd / h.valuation_usd) * 100);
  return null;
}

export type HoldingView = {
  /** What the stake is worth now: latest mark, zero if written off, else cost. */
  value: number;
  realized: number;
  moic: number;
  ownership: number | null;
  markedAt: string | null;
  /** True when no mark exists and value is just the cost. */
  atCost: boolean;
};

export function viewHolding(h: Holding): HoldingView {
  const last = h.marks[h.marks.length - 1];
  const realized = h.distributions.reduce((sum, row) => sum + row.amount_usd, 0);
  const value = h.status === "written_off" ? 0 : h.status === "exited" ? (last?.value_usd ?? 0) : (last?.value_usd ?? h.invested_usd);
  return {
    value,
    realized,
    moic: h.invested_usd > 0 ? (value + realized) / h.invested_usd : 0,
    ownership: ownershipOf(h),
    markedAt: last?.date ?? null,
    atCost: !last && h.status === "active",
  };
}

export type BookMetrics = { count: number; invested: number; value: number; realized: number; tvpi: number | null; dpi: number | null; irr: number | null; atCost: number };

/** Money in, money back, what is left, and the fund ratios, for any set of holdings. */
export function bookMetrics(holdings: Holding[], todayIso: string): BookMetrics {
  let invested = 0;
  let value = 0;
  let realized = 0;
  let atCost = 0;
  const flows: { date: string; amount: number }[] = [];
  for (const h of holdings) {
    const v = viewHolding(h);
    invested += h.invested_usd;
    value += v.value;
    realized += v.realized;
    if (v.atCost) atCost += 1;
    flows.push({ date: h.date, amount: -h.invested_usd });
    for (const d of h.distributions) flows.push({ date: d.date, amount: d.amount_usd });
  }
  if (value > 0) flows.push({ date: todayIso.slice(0, 10), amount: value });
  return {
    count: holdings.length,
    invested,
    value,
    realized,
    tvpi: invested ? (value + realized) / invested : null,
    dpi: invested ? realized / invested : null,
    irr: xirr(flows),
    atCost,
  };
}

/**
 * Annual internal rate of return on dated cash flows (money out negative,
 * money back and today's value positive). Null when it can't be known:
 * under 90 days of history, or no sign change.
 */
export function xirr(flows: { date: string; amount: number }[]): number | null {
  const rows = flows.filter((row) => DATE.test(row.date) && row.amount !== 0).map((row) => ({ t: Date.parse(`${row.date}T00:00:00Z`), a: row.amount }));
  if (rows.length < 2 || !rows.some((r) => r.a < 0) || !rows.some((r) => r.a > 0)) return null;
  const t0 = Math.min(...rows.map((r) => r.t));
  const span = (Math.max(...rows.map((r) => r.t)) - t0) / 86_400_000;
  if (span < 90) return null;
  const years = rows.map((r) => ({ y: (r.t - t0) / (365 * 86_400_000), a: r.a }));
  const npv = (rate: number) => years.reduce((sum, r) => sum + r.a / Math.pow(1 + rate, r.y), 0);
  // Bisection between -99% and +10,000%: slow but never diverges.
  let lo = -0.99;
  let hi = 100;
  let fLo = npv(lo);
  if (fLo * npv(hi) > 0) return null;
  for (let i = 0; i < 200; i += 1) {
    const mid = (lo + hi) / 2;
    const f = npv(mid);
    if (Math.abs(f) < 1e-6) return mid;
    if (f * fLo > 0) {
      lo = mid;
      fLo = f;
    } else hi = mid;
  }
  return (lo + hi) / 2;
}

export function multiple(n: number | null): string {
  return n == null ? "None yet" : `${n.toFixed(2)}x`;
}
