import type { Env } from "./flags";
import { DOUBLE_OPT_IN_FLAG, flagOn } from "./flags";
import { knownList, listsToJoin } from "./lists";
import { fileSignupToSheet, type SheetResult } from "./sheet";
import { recordSignup } from "./store";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SubscribeInput = {
  name: string;
  email: string;
  list: string;
  optInHandoff: boolean;
};

export type SubscribeResult = {
  ok: true;
  dryRun: boolean;
  joined: string[];
  status: "active" | "pending";
  sheet: SheetResult;
  confirmationSent: false;
};

export function parseSubscribe(body: unknown): { ok: true; value: SubscribeInput } | { ok: false } {
  if (!body || typeof body !== "object") return { ok: false };
  const record = body as Record<string, unknown>;
  const name = String(record.name ?? "").trim();
  const email = String(record.email ?? "").trim().toLowerCase();
  const list = String(record.list ?? "").trim().toLowerCase();
  const optInHandoff = record.optInHandoff === true;
  if (!name || name.length > 200) return { ok: false };
  if (!email || email.length > 254 || !EMAIL.test(email)) return { ok: false };
  if (!knownList(list)) return { ok: false };
  return { ok: true, value: { name, email, list, optInHandoff } };
}

export async function subscribe(input: SubscribeInput, env: Env = process.env): Promise<SubscribeResult> {
  const joined = listsToJoin(input);
  const status = flagOn(env, DOUBLE_OPT_IN_FLAG) ? "pending" : "active";
  const sheet = await fileSignupToSheet(
    {
      name: input.name,
      email: input.email,
      source: input.list,
      signupSource: input.optInHandoff ? `${input.list} handoff-opt-in` : input.list,
    },
    env,
  );
  const write = await recordSignup(
    {
      name: input.name,
      email: input.email,
      source: input.list,
      joined,
      status,
    },
    env,
  );
  return {
    ok: true,
    dryRun: write.dryRun,
    joined,
    status,
    sheet,
    confirmationSent: false,
  };
}
