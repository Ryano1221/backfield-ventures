import { answersFromActions, ackActions, exactMessageHash, readActions, recordAction } from "./actions";
import type { DecisionAnswer } from "./types";

export { exactMessageHash };

export function sameOriginRequest(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site === "cross-site") return false;
  const origin = req.headers.get("origin");
  if (!origin) return site !== "cross-site";
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").split(",")[0]?.trim();
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function readAnswers(env: Record<string, string | undefined> = process.env): Promise<DecisionAnswer[]> {
  return answersFromActions(await readActions(env));
}

export async function recordAnswer(
  answer: Omit<DecisionAnswer, "acked_at">,
  env: Record<string, string | undefined> = process.env,
): Promise<"stored" | "duplicate"> {
  const result = await recordAction(
    {
      type: "decide",
      target_id: answer.decision_id,
      payload: {
        choice: answer.choice,
        note: answer.note,
        exact_message_hash: answer.exact_message_hash,
      },
      idempotency_key: `decide:${answer.decision_id}`,
      created_at: answer.decided_at,
    },
    env,
  );
  return result.created ? "stored" : "duplicate";
}

export async function ackAnswers(ids: string[], env: Record<string, string | undefined> = process.env): Promise<string[]> {
  const before = await readAnswers(env);
  const wanted = new Set(ids);
  const pending = before.filter((answer) => wanted.has(answer.decision_id) && !answer.acked_at).map((answer) => answer.decision_id);
  if (!pending.length) return [];
  await ackActions(pending, { status: "done", note: "Picked up" }, env, "either");
  const after = await readAnswers(env);
  return pending.filter((id) => after.some((answer) => answer.decision_id === id && answer.acked_at));
}
