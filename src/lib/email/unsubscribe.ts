import type { Env } from "./flags";
import { DB_FLAG, flagOn } from "./flags";

export type TokenRow = {
  token: string;
  email: string;
  listId: string;
  used: boolean;
};

export const SAMPLE_TOKENS: TokenRow[] = [
  { token: "SAMPLE-TOKEN", email: "reader.one@example.com", listId: "handoff", used: false },
  { token: "USED-TOKEN", email: "reader.two@example.com", listId: "handoff", used: true },
];

export type UnsubResult =
  | { ok: true; dryRun: boolean; listId: string }
  | { ok: false; dryRun: boolean; reason: "unknown" | "used" };

export function unsubscribeByToken(token: string, env: Env = process.env, rows?: TokenRow[]): UnsubResult {
  const local = rows ?? SAMPLE_TOKENS.map((row) => ({ ...row }));
  const dryRun = !flagOn(env, DB_FLAG);
  const row = local.find((item) => item.token === token);
  if (!row) return { ok: false, dryRun, reason: "unknown" };
  if (row.used) return { ok: false, dryRun, reason: "used" };
  row.used = true;
  return { ok: true, dryRun, listId: row.listId };
}

export function unsubMessage(result: UnsubResult): string {
  if (result.ok) return "You're unsubscribed from The Handoff.";
  if (result.reason === "used") return "This link was already used. You're unsubscribed from The Handoff.";
  return "This link is not one I recognize.";
}
