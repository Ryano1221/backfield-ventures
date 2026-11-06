/**
 * The LP pipeline: where each LP stands before money moves, what Ryan expects
 * them to put in, how sure he is, and the next action.
 *
 * Money itself (soft circle, committed, wired) lives in the raise ledger. A
 * person with a ledger row shows that status here and is not counted twice.
 */
import type { Commitment, RaiseLedger } from "./raise-model";

export const PIPE_STAGES = ["reached", "replied", "interested", "call_booked"] as const;
export type PipeStage = (typeof PIPE_STAGES)[number];

export const STAGE_LABEL: Record<PipeStage | "soft" | "committed" | "wired", string> = {
  reached: "Reached",
  replied: "Replied",
  interested: "Interested",
  call_booked: "Call booked",
  soft: "Soft circled",
  committed: "Committed",
  wired: "Wired",
};

export const CONFIDENCE = { low: 0.2, medium: 0.5, high: 0.8 } as const;
export type Confidence = keyof typeof CONFIDENCE;
export const CONFIDENCE_LABEL: Record<Confidence, string> = { low: "Low (20%)", medium: "Medium (50%)", high: "High (80%)" };

export type PipeEntry = {
  stage: PipeStage | null;
  expected_usd: number | null;
  confidence: Confidence | null;
  next_action: string;
  next_due: string | null;
  updated_at: string;
};

export type Pipeline = { version: 1; entries: Record<string, PipeEntry> };
export const EMPTY_PIPELINE: Pipeline = { version: 1, entries: {} };

/** CRM stage to pipeline stage, used until Ryan sets one himself. */
export function stageFromCrm(crm: string | null | undefined, imIn = false): PipeStage {
  const key = (crm || "").toLowerCase();
  if (key === "call_asked" || key === "call_booked" || key === "call_held") return "call_booked";
  if (imIn || key === "im_in") return "interested";
  if (key === "replied" || key === "talking") return "replied";
  return "reached";
}

export type PipeRow = {
  id: string;
  name: string;
  firm: string | null;
  /** Ledger status wins once money is on the table. */
  stage: PipeStage | "soft" | "committed" | "wired";
  stageSet: "you" | "crm" | "ledger";
  expected: number | null;
  confidence: Confidence | null;
  weighted: number;
  next: string;
  due: string | null;
  overdue: boolean;
};

export type PipePerson = { id: string; name: string; firm: string | null; stage: string | null; im_in?: boolean; next_step?: string | null; next_step_short?: string | null; next_step_due?: string | null };

export function buildPipeline(people: PipePerson[], pipeline: Pipeline, ledger: RaiseLedger, today: string): { rows: PipeRow[]; weighted: number; expected: number; counts: Record<string, number> } {
  const byPerson = new Map<string, Commitment>();
  for (const row of ledger.commitments) {
    if (row.person_id) byPerson.set(row.person_id, row);
    byPerson.set(`name:${row.name.trim().toLowerCase()}`, row);
  }
  const rows: PipeRow[] = people.map((person) => {
    const entry = pipeline.entries[person.id];
    const money = byPerson.get(person.id) ?? byPerson.get(`name:${person.name.trim().toLowerCase()}`);
    const stage = money ? money.status : entry?.stage ?? stageFromCrm(person.stage, person.im_in);
    const stageSet = money ? "ledger" : entry?.stage ? "you" : "crm";
    const expected = money ? money.amount_usd : entry?.expected_usd ?? null;
    const confidence = money ? null : entry?.confidence ?? null;
    // Hard money counts in full, soft money at its confidence (medium if unset), pipeline at its confidence.
    const weight = money ? (money.status === "soft" ? CONFIDENCE[entry?.confidence ?? "medium"] : 1) : confidence ? CONFIDENCE[confidence] : 0;
    // A due date set here wins; otherwise the CRM next step's due date counts.
    const due = entry?.next_due ?? (entry?.next_action?.trim() ? null : person.next_step_due?.slice(0, 10) ?? null);
    return {
      id: person.id,
      name: person.name,
      firm: person.firm,
      stage,
      stageSet,
      expected,
      confidence,
      weighted: expected ? Math.round(expected * weight) : 0,
      next: entry?.next_action?.trim() || person.next_step_short?.trim() || person.next_step?.trim() || "",
      due,
      overdue: Boolean(due && due <= today),
    };
  });
  const order = ["wired", "committed", "soft", "call_booked", "interested", "replied", "reached"];
  rows.sort((a, b) => Number(b.overdue) - Number(a.overdue) || order.indexOf(a.stage) - order.indexOf(b.stage) || (b.expected ?? 0) - (a.expected ?? 0) || a.name.localeCompare(b.name));
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.stage] = (counts[row.stage] ?? 0) + 1;
  return {
    rows,
    weighted: rows.reduce((sum, row) => sum + row.weighted, 0),
    expected: rows.reduce((sum, row) => sum + (row.expected ?? 0), 0),
    counts,
  };
}

export type PipeResult = { ok: true; pipeline: Pipeline } | { ok: false; error: string };

/** Set one LP's pipeline fields. Pure. */
export function applyPipelineOp(pipeline: Pipeline, raw: unknown, now = new Date().toISOString()): PipeResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Nothing to change." };
  const op = raw as Record<string, unknown>;
  if (op.op !== "set") return { ok: false, error: "Unknown change." };
  const id = typeof op.person_id === "string" ? op.person_id.trim().slice(0, 120) : "";
  if (!id) return { ok: false, error: "Which LP?" };
  if (Object.keys(pipeline.entries).length >= 5000 && !pipeline.entries[id]) return { ok: false, error: "The pipeline is full." };
  const current = pipeline.entries[id] ?? { stage: null, expected_usd: null, confidence: null, next_action: "", next_due: null, updated_at: now };
  const next: PipeEntry = { ...current, updated_at: now };
  if ("stage" in op) {
    if (op.stage === null || op.stage === "") next.stage = null;
    else if (PIPE_STAGES.includes(op.stage as PipeStage)) next.stage = op.stage as PipeStage;
    else return { ok: false, error: "Unknown stage." };
  }
  if ("expected_usd" in op) {
    if (op.expected_usd === null || op.expected_usd === "") next.expected_usd = null;
    else {
      const amount = typeof op.expected_usd === "number" ? op.expected_usd : parseUsd(String(op.expected_usd));
      if (amount == null || amount < 0 || amount > 1_000_000_000) return { ok: false, error: "Expected check should be a dollar amount, like $250K." };
      next.expected_usd = Math.round(amount);
    }
  }
  if ("confidence" in op) {
    if (op.confidence === null || op.confidence === "") next.confidence = null;
    else if (typeof op.confidence === "string" && op.confidence in CONFIDENCE) next.confidence = op.confidence as Confidence;
    else return { ok: false, error: "Confidence is low, medium or high." };
  }
  if (typeof op.next_action === "string") next.next_action = op.next_action.slice(0, 300);
  if ("next_due" in op) {
    if (op.next_due === null || op.next_due === "") next.next_due = null;
    else if (typeof op.next_due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(op.next_due)) next.next_due = op.next_due;
    else return { ok: false, error: "Pick a due date." };
  }
  return { ok: true, pipeline: { version: 1, entries: { ...pipeline.entries, [id]: next } } };
}

/** "$250K", "1.5m", "250000" -> dollars. */
export function parseUsd(value: string): number | null {
  const match = /^\$?\s*([\d,]*\.?\d+)\s*([kmb])?$/i.exec(value.trim());
  if (!match) return null;
  const base = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(base)) return null;
  const mult = { k: 1e3, m: 1e6, b: 1e9 }[(match[2] || "").toLowerCase() as "k" | "m" | "b"] ?? 1;
  return base * mult;
}

export function parsePipeline(raw: string | null): Pipeline {
  if (!raw) return { version: 1, entries: {} };
  try {
    const data = JSON.parse(raw) as { entries?: unknown };
    if (!data.entries || typeof data.entries !== "object" || Array.isArray(data.entries)) return { version: 1, entries: {} };
    return { version: 1, entries: data.entries as Record<string, PipeEntry> };
  } catch {
    return { version: 1, entries: {} };
  }
}
