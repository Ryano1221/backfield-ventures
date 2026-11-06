/**
 * SPVs: one vehicle per deal. Terms, who is in and for how much, and the
 * operations checklist from terms to reporting. Ryan keeps this by hand.
 * Nothing here moves money, sends documents, or contacts anyone.
 */

export const SPV_STATUSES = ["forming", "raising", "closing", "closed", "cancelled"] as const;
export type SpvStatus = (typeof SPV_STATUSES)[number];
export const SPV_STATUS_LABEL: Record<SpvStatus, string> = {
  forming: "Forming",
  raising: "Raising",
  closing: "Closing",
  closed: "Closed",
  cancelled: "Cancelled",
};

export const ALLOC_STATUSES = ["soft", "committed", "wired"] as const;
export type AllocStatus = (typeof ALLOC_STATUSES)[number];
export const ALLOC_LABEL: Record<AllocStatus, string> = { soft: "Soft circled", committed: "Committed", wired: "Wired" };

/** The operations of one SPV, in the order they usually happen. */
export const SPV_STEPS = [
  "Terms confirmed with the company",
  "Allocation confirmed",
  "Entity formed",
  "Subscription docs out",
  "KYC and accreditation done",
  "Wire instructions sent",
  "All money received",
  "Funds wired to the company",
  "Reporting and K-1s set up",
] as const;

export type Allocation = { id: string; name: string; person_id: string | null; amount_usd: number; status: AllocStatus; note: string; updated_at: string };

export type Spv = {
  id: string;
  name: string;
  company: string;
  deal_id: string | null;
  status: SpvStatus;
  target_usd: number | null;
  min_check_usd: number | null;
  carry_pct: number | null;
  fee_pct: number | null;
  close_date: string | null;
  steps: string[];
  notes: string;
  next_action: string;
  allocations: Allocation[];
  created_at: string;
  updated_at: string;
};

export type SpvBook = { version: 1; spvs: Spv[] };
export const EMPTY_SPVS: SpvBook = { version: 1, spvs: [] };

export type SpvSummary = {
  soft: number;
  committed: number;
  wired: number;
  hard: number;
  pctHard: number | null;
  pctSoft: number | null;
  remaining: number | null;
  daysLeft: number | null;
  investors: number;
  stepsDone: number;
  nextStep: string | null;
  belowMin: string[];
};

export function summarizeSpv(spv: Spv, now = Date.now()): SpvSummary {
  const sum = (status: AllocStatus) => spv.allocations.filter((row) => row.status === status).reduce((total, row) => total + row.amount_usd, 0);
  const soft = sum("soft");
  const committed = sum("committed");
  const wired = sum("wired");
  const hard = committed + wired;
  const target = spv.target_usd && spv.target_usd > 0 ? spv.target_usd : null;
  let daysLeft: number | null = null;
  if (spv.close_date && /^\d{4}-\d{2}-\d{2}$/.test(spv.close_date)) {
    const close = Date.parse(`${spv.close_date}T23:59:59-06:00`);
    if (Number.isFinite(close)) daysLeft = Math.max(0, Math.ceil((close - now) / 86_400_000));
  }
  return {
    soft,
    committed,
    wired,
    hard,
    pctHard: target ? Math.min(100, (hard / target) * 100) : null,
    pctSoft: target ? Math.min(100, ((hard + soft) / target) * 100) : null,
    remaining: target ? Math.max(0, target - hard) : null,
    daysLeft,
    investors: spv.allocations.length,
    stepsDone: SPV_STEPS.filter((step) => spv.steps.includes(step)).length,
    nextStep: SPV_STEPS.find((step) => !spv.steps.includes(step)) ?? null,
    belowMin: spv.min_check_usd ? spv.allocations.filter((row) => row.amount_usd < spv.min_check_usd!).map((row) => row.name) : [],
  };
}

/** One plain sentence on what this SPV needs next. */
export function spvNext(spv: Spv, now = Date.now()): string {
  if (spv.status === "cancelled") return "Cancelled.";
  if (spv.next_action.trim()) return spv.next_action.trim();
  const s = summarizeSpv(spv, now);
  if (!spv.target_usd) return "Set the target and terms.";
  const unwired = spv.allocations.filter((row) => row.status === "committed");
  if ((spv.status === "closing" || (s.remaining === 0 && spv.status !== "closed")) && unwired.length) {
    return `Collect ${usdShort(s.committed)} in wires from ${unwired.length} ${unwired.length === 1 ? "investor" : "investors"}.`;
  }
  if (s.remaining && s.remaining > 0 && spv.status !== "closed") return `Raise ${usdShort(s.remaining)} more${s.daysLeft != null ? ` in ${s.daysLeft} ${s.daysLeft === 1 ? "day" : "days"}` : ""}.`;
  if (s.nextStep) return `Next: ${s.nextStep.charAt(0).toLowerCase()}${s.nextStep.slice(1)}.`;
  return "Done. Keep reporting current.";
}

function usdShort(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

export type SpvResult = { ok: true; book: SpvBook; id: string } | { ok: false; error: string };

const usdOrNull = (value: unknown): number | null | "bad" => {
  if (value === null || value === "" || value === undefined) return null;
  const raw = typeof value === "number" ? value : parseMoney(String(value));
  if (raw == null || !Number.isFinite(raw) || raw < 0 || raw > 1_000_000_000) return "bad";
  return Math.round(raw);
};
const pctOrNull = (value: unknown): number | null | "bad" => {
  if (value === null || value === "" || value === undefined) return null;
  const raw = typeof value === "number" ? value : Number(String(value).replace("%", "").trim());
  if (!Number.isFinite(raw) || raw < 0 || raw > 100) return "bad";
  return Math.round(raw * 100) / 100;
};

/** "$250K", "1.5m", "250000" -> dollars. */
export function parseMoney(value: string): number | null {
  const match = /^\$?\s*([\d,]*\.?\d+)\s*([kmb])?$/i.exec(value.trim());
  if (!match) return null;
  const base = Number(match[1].replace(/,/g, ""));
  const mult = { k: 1e3, m: 1e6, b: 1e9 }[(match[2] || "").toLowerCase() as "k" | "m" | "b"] ?? 1;
  return Number.isFinite(base) ? base * mult : null;
}

/** Apply one change. Pure. */
export function applySpvOp(book: SpvBook, raw: unknown, now = new Date().toISOString(), newId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`): SpvResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Nothing to change." };
  const op = raw as Record<string, unknown>;
  const text = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : "");
  const spvs = book.spvs.map((spv) => ({ ...spv, allocations: spv.allocations.map((row) => ({ ...row })), steps: [...spv.steps] }));

  if (op.op === "create") {
    const company = text(op.company, 160).trim();
    if (!company) return { ok: false, error: "Which company is this SPV for?" };
    if (spvs.length >= 300) return { ok: false, error: "That is a lot of SPVs. Archive old ones first." };
    const id = newId("spv");
    spvs.unshift({
      id,
      name: text(op.name, 160).trim() || `Backfield ${company} SPV`,
      company,
      deal_id: typeof op.deal_id === "string" && op.deal_id.trim() ? op.deal_id.trim().slice(0, 200) : null,
      status: "forming",
      target_usd: null,
      min_check_usd: null,
      carry_pct: null,
      fee_pct: null,
      close_date: null,
      steps: [],
      notes: "",
      next_action: "",
      allocations: [],
      created_at: now,
      updated_at: now,
    });
    return { ok: true, book: { version: 1, spvs }, id };
  }

  const id = typeof op.id === "string" ? op.id : "";
  const spv = spvs.find((row) => row.id === id);
  if (!spv) return { ok: false, error: "That SPV is gone. Reload the page." };
  spv.updated_at = now;

  if (op.op === "update") {
    if (typeof op.name === "string") spv.name = text(op.name, 160).trim() || spv.name;
    if (typeof op.notes === "string") spv.notes = text(op.notes, 10000);
    if (typeof op.next_action === "string") spv.next_action = text(op.next_action, 300);
    if ("status" in op) {
      if (!SPV_STATUSES.includes(op.status as SpvStatus)) return { ok: false, error: "Unknown status." };
      spv.status = op.status as SpvStatus;
    }
    for (const [key, parse, label] of [
      ["target_usd", usdOrNull, "Target should be a dollar amount, like $500K."],
      ["min_check_usd", usdOrNull, "Minimum check should be a dollar amount, like $10K."],
      ["carry_pct", pctOrNull, "Carry is a percent from 0 to 100."],
      ["fee_pct", pctOrNull, "Fee is a percent from 0 to 100."],
    ] as const) {
      if (key in op) {
        const value = parse(op[key]);
        if (value === "bad") return { ok: false, error: label };
        spv[key] = value;
      }
    }
    if ("close_date" in op) {
      if (op.close_date === null || op.close_date === "") spv.close_date = null;
      else if (typeof op.close_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(op.close_date)) spv.close_date = op.close_date;
      else return { ok: false, error: "Pick a close date." };
    }
    if (Array.isArray(op.steps)) spv.steps = SPV_STEPS.filter((step) => (op.steps as unknown[]).includes(step));
    return { ok: true, book: { version: 1, spvs }, id };
  }

  if (op.op === "allocate") {
    const name = text(op.name, 160).trim();
    const amount = usdOrNull(op.amount_usd);
    const status = op.status as AllocStatus;
    if (!ALLOC_STATUSES.includes(status)) return { ok: false, error: "Pick soft circled, committed or wired." };
    if (amount === "bad" || amount === null || amount === 0) return { ok: false, error: "Amount should be a dollar amount, like $25K." };
    const existing = typeof op.allocation_id === "string" ? spv.allocations.find((row) => row.id === op.allocation_id) : null;
    if (existing) {
      if (name) existing.name = name;
      existing.amount_usd = amount;
      existing.status = status;
      if (typeof op.note === "string") existing.note = text(op.note, 300);
      existing.updated_at = now;
    } else {
      if (!name) return { ok: false, error: "Who is this allocation for?" };
      if (spv.allocations.length >= 500) return { ok: false, error: "Five hundred investors is the limit." };
      spv.allocations.push({ id: newId("al"), name, person_id: typeof op.person_id === "string" && op.person_id ? op.person_id.slice(0, 120) : null, amount_usd: amount, status, note: text(op.note, 300), updated_at: now });
    }
    return { ok: true, book: { version: 1, spvs }, id };
  }

  if (op.op === "remove_allocation") {
    spv.allocations = spv.allocations.filter((row) => row.id !== op.allocation_id);
    return { ok: true, book: { version: 1, spvs }, id };
  }

  return { ok: false, error: "Unknown change." };
}

export function parseSpvs(raw: string | null): SpvBook {
  if (!raw) return { version: 1, spvs: [] };
  try {
    const data = JSON.parse(raw) as { spvs?: unknown };
    if (!Array.isArray(data.spvs)) return { version: 1, spvs: [] };
    return { version: 1, spvs: data.spvs.filter((row): row is Spv => Boolean(row && typeof row === "object" && typeof (row as Spv).id === "string" && Array.isArray((row as Spv).allocations))) };
  } catch {
    return { version: 1, spvs: [] };
  }
}

export type SpvToday = { id: string; name: string; when: string; next: string; urgent: boolean };

/** Open SPVs that close within two weeks, or are closing now: what Today should show. */
export function spvsForToday(book: SpvBook, now = Date.now()): SpvToday[] {
  return book.spvs
    .filter((spv) => spv.status !== "closed" && spv.status !== "cancelled")
    .map((spv) => ({ spv, s: summarizeSpv(spv, now) }))
    .filter(({ spv, s }) => spv.status === "closing" || (s.daysLeft != null && s.daysLeft <= 14))
    .sort((a, b) => (a.s.daysLeft ?? 99) - (b.s.daysLeft ?? 99))
    .map(({ spv, s }) => ({
      id: spv.id,
      name: spv.name,
      when: s.daysLeft == null ? "Closing" : s.daysLeft === 0 ? "Closes today" : `${s.daysLeft} ${s.daysLeft === 1 ? "day" : "days"} left`,
      next: spvNext(spv, now),
      urgent: s.daysLeft != null && s.daysLeft <= 3,
    }));
}

/**
 * A plain status note Ryan can paste into an email to the SPV's investors.
 * Built only from what the SPV record holds; nothing is sent from the OS.
 */
export function spvUpdateText(spv: Spv, now = Date.now()): string {
  const s = summarizeSpv(spv, now);
  const lines: string[] = [`${spv.name}: update`, ""];
  lines.push(spv.target_usd ? `Committed so far: ${usdShort(s.hard)} of ${usdShort(spv.target_usd)}.` : `Committed so far: ${usdShort(s.hard)}.`);
  if (spv.close_date && /^\d{4}-\d{2}-\d{2}$/.test(spv.close_date)) {
    const date = new Date(`${spv.close_date}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
    lines.push(`Target close: ${date}${s.daysLeft != null && s.daysLeft <= 90 && spv.status !== "closed" ? ` (${s.daysLeft} ${s.daysLeft === 1 ? "day" : "days"} out)` : ""}.`);
  }
  const terms = [
    spv.min_check_usd ? `minimum check ${usdShort(spv.min_check_usd)}` : null,
    spv.carry_pct != null ? `${spv.carry_pct}% carry` : null,
    spv.fee_pct != null ? `${spv.fee_pct}% management fee` : null,
  ].filter(Boolean);
  if (terms.length) lines.push(`Terms: ${terms.join(", ")}.`);
  if (spv.status === "closed") lines.push("", "The SPV is closed and the money has gone to the company. Reporting and K-1s will follow.");
  else if (s.nextStep) lines.push("", `Where we are: ${s.stepsDone} of ${SPV_STEPS.length} steps done. Next up: ${s.nextStep.charAt(0).toLowerCase()}${s.nextStep.slice(1)}.`);
  if (spv.status !== "closed") lines.push("", "Reply here if you want in, or if your allocation has changed.");
  return lines.join("\n");
}

export type Backer = { key: string; name: string; personId: string | null; spvs: number; committed: number; typical: number; wiredShare: number | null; last: string };

/**
 * Everyone who has put money into Backfield SPVs, biggest first: how many
 * deals, how much, their usual check, and how reliably they wire. Soft
 * circles don't count as backing. Cancelled SPVs are ignored.
 */
export function spvBackers(book: SpvBook): Backer[] {
  const rows = new Map<string, { name: string; personId: string | null; spvs: Set<string>; checks: number[]; hard: number; wired: number; last: string }>();
  for (const spv of book.spvs) {
    if (spv.status === "cancelled") continue;
    for (const a of spv.allocations) {
      if (a.status === "soft") continue;
      const key = a.person_id ? `p:${a.person_id}` : `n:${a.name.trim().toLowerCase()}`;
      const row = rows.get(key) ?? { name: a.name.trim(), personId: a.person_id, spvs: new Set<string>(), checks: [], hard: 0, wired: 0, last: "" };
      // Keep the properly capitalized spelling when one entry was typed in lower case.
      if (row.name === row.name.toLowerCase() && a.name.trim() !== a.name.trim().toLowerCase()) row.name = a.name.trim();
      row.spvs.add(spv.id);
      row.checks.push(a.amount_usd);
      row.hard += 1;
      if (a.status === "wired") row.wired += 1;
      if (a.updated_at > row.last) row.last = a.updated_at;
      rows.set(key, row);
    }
  }
  return [...rows.entries()]
    .map(([key, row]) => {
      const sorted = [...row.checks].sort((a, b) => a - b);
      return {
        key,
        name: row.name,
        personId: row.personId,
        spvs: row.spvs.size,
        committed: row.checks.reduce((sum, n) => sum + n, 0),
        typical: sorted[Math.floor((sorted.length - 1) / 2)],
        wiredShare: row.hard ? row.wired / row.hard : null,
        last: row.last,
      };
    })
    .sort((a, b) => b.committed - a.committed || b.spvs - a.spvs || a.name.localeCompare(b.name));
}
