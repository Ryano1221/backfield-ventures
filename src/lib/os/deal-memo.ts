/**
 * Ryan's investment work on a deal: a decision with its reason, a memo, a
 * diligence checklist, and who owns the next step. Kept apart from the
 * office's score and Ryan's quick rating, which stay where they are.
 */

export const DECISIONS = ["undecided", "diligence", "invest", "pass"] as const;
export type Decision = (typeof DECISIONS)[number];

export const DECISION_LABEL: Record<Decision, string> = {
  undecided: "No decision yet",
  diligence: "In diligence",
  invest: "Invest",
  pass: "Pass",
};

export const CHECKLIST = ["Team", "Market", "Product", "Traction", "Round and terms", "References", "Fit with the thesis"] as const;

export type Memo = {
  decision: Decision;
  reason: string;
  memo: string;
  checks: string[];
  owner: string;
  next_action: string;
  next_due: string | null;
  decided_at: string | null;
  updated_at: string;
};

export type MemoBook = { version: 1; deals: Record<string, Memo> };
export const EMPTY_MEMOS: MemoBook = { version: 1, deals: {} };

export function blankMemo(now: string): Memo {
  return { decision: "undecided", reason: "", memo: "", checks: [], owner: "Ryan", next_action: "", next_due: null, decided_at: null, updated_at: now };
}

export type MemoResult = { ok: true; book: MemoBook } | { ok: false; error: string };

/** Save one deal's memo fields. Invest or pass needs a written reason. Pure. */
export function applyMemoOp(book: MemoBook, raw: unknown, now = new Date().toISOString()): MemoResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Nothing to change." };
  const op = raw as Record<string, unknown>;
  if (op.op !== "set") return { ok: false, error: "Unknown change." };
  const id = typeof op.deal_id === "string" ? op.deal_id.trim().slice(0, 200) : "";
  if (!id) return { ok: false, error: "Which deal?" };
  if (!book.deals[id] && Object.keys(book.deals).length >= 5000) return { ok: false, error: "The memo book is full." };
  const current = book.deals[id] ?? blankMemo(now);
  const next: Memo = { ...current, updated_at: now };
  if (typeof op.reason === "string") next.reason = op.reason.slice(0, 2000);
  if (typeof op.memo === "string") next.memo = op.memo.slice(0, 20000);
  if (typeof op.owner === "string") next.owner = op.owner.trim().slice(0, 80) || "Ryan";
  if (typeof op.next_action === "string") next.next_action = op.next_action.slice(0, 300);
  if ("next_due" in op) {
    if (op.next_due === null || op.next_due === "") next.next_due = null;
    else if (typeof op.next_due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(op.next_due)) next.next_due = op.next_due;
    else return { ok: false, error: "Pick a due date." };
  }
  if (Array.isArray(op.checks)) next.checks = CHECKLIST.filter((item) => (op.checks as unknown[]).includes(item));
  if ("decision" in op) {
    if (!DECISIONS.includes(op.decision as Decision)) return { ok: false, error: "Unknown decision." };
    const decision = op.decision as Decision;
    if ((decision === "invest" || decision === "pass") && !next.reason.trim()) return { ok: false, error: "Write down why before deciding to invest or pass." };
    if (decision !== current.decision) next.decided_at = decision === "invest" || decision === "pass" ? now : null;
    next.decision = decision;
  }
  return { ok: true, book: { version: 1, deals: { ...book.deals, [id]: next } } };
}

export function parseMemos(raw: string | null): MemoBook {
  if (!raw) return { version: 1, deals: {} };
  try {
    const data = JSON.parse(raw) as { deals?: unknown };
    if (!data.deals || typeof data.deals !== "object" || Array.isArray(data.deals)) return { version: 1, deals: {} };
    return { version: 1, deals: data.deals as Record<string, Memo> };
  } catch {
    return { version: 1, deals: {} };
  }
}
