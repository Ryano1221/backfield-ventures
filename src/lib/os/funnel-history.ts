import type { FunnelStep } from "./command";
import { ctDate } from "./outreach-history";

/** Daily LP funnel counts (CRM only), so Fund I can show this week vs last. */
export type FunnelHistory = { days: Record<string, Record<string, number>> };

export function parseFunnelHistory(raw: string | null): FunnelHistory {
  if (!raw) return { days: {} };
  try {
    const parsed = JSON.parse(raw) as FunnelHistory;
    if (!parsed?.days || typeof parsed.days !== "object") return { days: {} };
    return { days: Object.fromEntries(Object.entries(parsed.days).filter(([date, row]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && row && typeof row === "object")) };
  } catch {
    return { days: {} };
  }
}

export function recordFunnel(history: FunnelHistory, steps: FunnelStep[], at: number): FunnelHistory {
  const date = ctDate(at);
  const days = { ...history.days, [date]: Object.fromEntries(steps.map((step) => [step.key, step.count])) };
  const keep = Object.keys(days).sort().slice(-90);
  return { days: Object.fromEntries(keep.map((day) => [day, days[day]!])) };
}

/** Change per step against the latest day at least seven days ago. Null when there is no such day yet. */
export function weekDeltas(history: FunnelHistory, steps: FunnelStep[], now: number): Record<string, number> | null {
  const cutoff = ctDate(now - 7 * 86_400_000);
  const past = Object.keys(history.days).filter((date) => date <= cutoff).sort().pop();
  if (!past) return null;
  const then = history.days[past]!;
  return Object.fromEntries(steps.map((step) => [step.key, step.count - (then[step.key] ?? 0)]));
}

export type Diagnosis = { from: string; to: string; rate: number; advice: string };

const ADVICE: Record<string, string> = {
  replied: "Few replies usually means the list or the first note. Tighten who you reach and the opening line.",
  call: "Replies that do not turn into calls usually means the ask is unclear. Offer two times and one sentence on why now.",
  materials: "Calls that stall before the deck or data room usually means fit or messaging. Sharpen the thesis and the Fund I edge.",
  soft: "Interest that stalls before a soft circle usually needs proof: track record, references, or an anchor LP.",
  committed: "Soft circles that do not close usually means process. Set a first close date and send docs.",
};

/** The weakest step-to-step conversion with at least three people above it. */
export function diagnoseFunnel(steps: FunnelStep[]): Diagnosis | null {
  let worst: Diagnosis | null = null;
  for (let i = 1; i < steps.length; i++) {
    const prev = steps[i - 1]!;
    const step = steps[i]!;
    if (prev.count < 3) continue;
    const rate = Math.round((step.count / prev.count) * 100);
    if (!worst || rate < worst.rate) worst = { from: prev.label, to: step.label, rate, advice: ADVICE[step.key] ?? "" };
  }
  return worst;
}
