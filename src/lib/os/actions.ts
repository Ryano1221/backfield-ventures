import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { appendDecisionLog } from "./decision-log";
import { ACTION_TYPES, type ActionPayload, type ActionType, type Decision, type DecisionAnswer, type DecisionSwap, type OsAction } from "./types";
import { defaultSnapshotFile, SnapshotStoreError, storeKind } from "./store";

export const ACTIONS_BLOB_PATH = "os-dashboard/actions.json";
export const NOTE_MAX = 2000;
const LEGACY_BLOB_PATH = "os-dashboard/decisions.json";
const PAYLOAD_MAX = 8000;

type Ledger = { actions: OsAction[] };
type LegacyLedger = { answers: DecisionAnswer[] };

export function exactMessageHash(message: string): string {
  return createHash("sha256").update(message, "utf8").digest("hex");
}

export function sanitizePayload(value: unknown): ActionPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const payload: ActionPayload = {};
  for (const [key, item] of Object.entries(value)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,40}$/.test(key)) continue;
    if (key === "swaps" && Array.isArray(item)) {
      const swaps = item
        .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object" && !Array.isArray(row))
        .slice(0, 8)
        .map((row) => ({
          out: typeof row.out === "string" ? row.out.trim().slice(0, 40) : "",
          in: typeof row.in === "string" ? row.in.trim().slice(0, 40) : "",
        }))
        .filter((row) => row.out && row.in);
      if (swaps.length) payload.swaps = swaps;
      continue;
    }
    if (item == null) payload[key] = null;
    else if (typeof item === "string") payload[key] = item.slice(0, 6000);
    else if (typeof item === "number" && Number.isFinite(item)) payload[key] = item;
    else if (typeof item === "boolean") payload[key] = item;
  }
  if (JSON.stringify(payload).length > PAYLOAD_MAX) return null;
  return payload;
}

export function normalizeDecidePayload(
  decision: Decision,
  payload: ActionPayload,
): { ok: true; payload: ActionPayload } | { ok: false; error: string } {
  const choice = typeof payload.choice === "string" ? payload.choice.trim() : "";
  const note = typeof payload.note === "string" ? payload.note.trim() : "";
  const edited = typeof payload.edited_message === "string" ? payload.edited_message.trim() : "";
  if (note.length > NOTE_MAX) return { ok: false, error: "Note is too long" };
  if (choice === "swap") {
    const swaps = validateSwaps(decision, payload.swaps);
    if (!swaps.ok) return swaps;
    return { ok: true, payload: withHash(decision, payload, { choice: "swap", note: note || null, swaps: swaps.swaps }) };
  }
  if (choice === "reply") {
    if (!note) return { ok: false, error: "Reply needs a note" };
    return { ok: true, payload: withHash(decision, payload, { choice: "reply", note }) };
  }
  if (!choice && !edited) return { ok: false, error: "Missing choice" };
  if (edited && edited !== (decision.exact_message || "")) {
    if (edited.length > 6000) return { ok: false, error: "Edited message is too long" };
    return {
      ok: true,
      payload: {
        choice: "edit",
        note: note || null,
        edited_message: edited,
        exact_message_hash: exactMessageHash(edited),
        prior_message_hash: decision.exact_message ? exactMessageHash(decision.exact_message) : null,
      },
    };
  }
  const allowed = decision.options?.length
    ? decision.options.map((option) => option.value)
    : ["approve", "skip", "yes", "no"];
  if (!choice || !allowed.includes(choice)) return { ok: false, error: "That choice is not offered" };
  return { ok: true, payload: withHash(decision, payload, { choice, note: note || null }) };
}

function withHash(decision: Decision, payload: ActionPayload, next: ActionPayload): ActionPayload {
  const provided = typeof payload.exact_message_hash === "string" && /^[a-f0-9]{64}$/.test(payload.exact_message_hash) ? payload.exact_message_hash : "";
  if (provided) next.exact_message_hash = provided;
  else if (decision.exact_message) next.exact_message_hash = exactMessageHash(decision.exact_message);
  else if (decision.detail?.preview?.hash) next.exact_message_hash = decision.detail.preview.hash;
  return next;
}

function validateSwaps(decision: Decision, swaps: DecisionSwap[] | undefined): { ok: true; swaps: DecisionSwap[] } | { ok: false; error: string } {
  if (!swaps?.length) return { ok: false, error: "Swap needs a pick and a replacement" };
  if (swaps.length > 8) return { ok: false, error: "Too many swaps" };
  const picks = new Set((decision.detail?.picks ?? []).map((company) => company.slug));
  const candidates = new Set((decision.detail?.candidates ?? []).map((company) => company.slug));
  const clean: DecisionSwap[] = [];
  for (const swap of swaps) {
    if (!picks.has(swap.out)) return { ok: false, error: "That pick is not in the pack" };
    if (!candidates.has(swap.in)) return { ok: false, error: "That company is not a candidate" };
    clean.push({ out: swap.out, in: swap.in });
  }
  return { ok: true, swaps: clean };
}

export function answersFromActions(actions: OsAction[]): DecisionAnswer[] {
  return actions
    .filter((action) => action.type === "decide")
    .map((action) => ({
      decision_id: action.target_id,
      choice: typeof action.payload.choice === "string" ? action.payload.choice : "",
      note: typeof action.payload.note === "string" ? action.payload.note : null,
      decided_at: action.created_at,
      exact_message_hash: typeof action.payload.exact_message_hash === "string" ? action.payload.exact_message_hash : null,
      acked_at: action.acked_at,
      ...(Array.isArray(action.payload.swaps) && action.payload.swaps.length ? { swaps: action.payload.swaps } : {}),
    }));
}

export async function readActions(env: Record<string, string | undefined> = process.env): Promise<OsAction[]> {
  const [stored, legacy] = await Promise.all([readStored(env), readLegacy(env)]);
  return mergeLegacy(stored, legacy);
}

export async function recordAction(
  input: { type: ActionType; target_id: string; payload: ActionPayload; idempotency_key: string; created_at?: string },
  env: Record<string, string | undefined> = process.env,
): Promise<{ created: boolean; conflict: boolean; action: OsAction }> {
  const current = await readActions(env);
  const sameKey = current.find((action) => action.idempotency_key === input.idempotency_key);
  const previous = input.type === "decide"
    ? [...current].reverse().find((action) => action.type === "decide" && action.target_id === input.target_id && action.status !== "failed")
    : undefined;
  if (previous && newDecisionRevision(previous, input)) {
    return writeRevision(current, previous, input, env);
  }
  if (sameKey) return { created: false, conflict: false, action: sameKey };
  if (previous) return { created: false, conflict: true, action: previous };
  const action: OsAction = {
    action_id: randomUUID(),
    type: input.type,
    target_id: input.target_id,
    payload: input.payload,
    created_at: input.created_at || new Date().toISOString(),
    idempotency_key: input.idempotency_key,
    acked_at: null,
    result: null,
    status: "pending",
  };
  await writeActions([...current, action], env);
  if (action.type === "decide") await logDecision(action, env);
  return { created: true, conflict: false, action };
}

async function logDecision(action: OsAction, env: Record<string, string | undefined>): Promise<void> {
  try {
    await appendDecisionLog(
      {
        at: action.created_at,
        id: action.target_id,
        answer: typeof action.payload.choice === "string" ? action.payload.choice : "",
        hash: typeof action.payload.exact_message_hash === "string" ? action.payload.exact_message_hash : null,
        note: typeof action.payload.note === "string" ? action.payload.note : null,
        swaps: Array.isArray(action.payload.swaps) ? action.payload.swaps : null,
      },
      env,
    );
  } catch {
    console.error("decision log failed");
  }
}

function newDecisionRevision(previous: OsAction, input: { type: ActionType; payload: ActionPayload }): boolean {
  if (input.type !== "decide") return false;
  const oldHash = typeof previous.payload.exact_message_hash === "string" ? previous.payload.exact_message_hash : "";
  const nextHash = typeof input.payload.exact_message_hash === "string" ? input.payload.exact_message_hash : "";
  return Boolean(oldHash && nextHash && oldHash !== nextHash);
}

async function writeRevision(
  current: OsAction[],
  previous: OsAction,
  input: { type: ActionType; target_id: string; payload: ActionPayload; idempotency_key: string; created_at?: string },
  env: Record<string, string | undefined>,
): Promise<{ created: boolean; conflict: boolean; action: OsAction }> {
  const action: OsAction = {
    action_id: randomUUID(),
    type: input.type,
    target_id: input.target_id,
    payload: input.payload,
    created_at: input.created_at || new Date().toISOString(),
    idempotency_key: input.idempotency_key,
    acked_at: null,
    result: null,
    status: "pending",
  };
  const next = current.map((row) =>
    row.action_id === previous.action_id && row.idempotency_key === input.idempotency_key
      ? { ...row, idempotency_key: `superseded:${row.action_id}` }
      : row,
  );
  await writeActions([...next, action], env);
  if (action.type === "decide") await logDecision(action, env);
  return { created: true, conflict: false, action };
}

export async function ackActions(
  ids: string[],
  result: { status: "done" | "failed"; note: string | null },
  env: Record<string, string | undefined> = process.env,
  match: "action" | "either" = "action",
): Promise<string[]> {
  const current = await readActions(env);
  const wanted = new Set(ids);
  const now = new Date().toISOString();
  const acked: string[] = [];
  const next = current.map((action) => {
    const hit = wanted.has(action.action_id) || (match === "either" && wanted.has(action.target_id));
    if (!hit || action.acked_at) return action;
    acked.push(action.action_id);
    return { ...action, acked_at: now, status: result.status, result: result.note };
  });
  if (acked.length) await writeActions(next, env);
  return acked;
}

export function isActionType(value: string): value is ActionType {
  return (ACTION_TYPES as readonly string[]).includes(value);
}

function mergeLegacy(actions: OsAction[], legacy: DecisionAnswer[]): OsAction[] {
  const ids = new Set(actions.map((action) => action.action_id));
  const targets = new Set(actions.filter((action) => action.type === "decide").map((action) => action.target_id));
  const extra = legacy
    .filter((answer) => !ids.has(`legacy:${answer.decision_id}`) && !targets.has(answer.decision_id))
    .map(legacyAction);
  return [...actions, ...extra];
}

function legacyAction(answer: DecisionAnswer): OsAction {
  return {
    action_id: `legacy:${answer.decision_id}`,
    type: "decide",
    target_id: answer.decision_id,
    payload: {
      choice: answer.choice,
      note: answer.note,
      exact_message_hash: answer.exact_message_hash,
    },
    created_at: answer.decided_at,
    idempotency_key: `decide:${answer.decision_id}`,
    acked_at: answer.acked_at,
    result: answer.acked_at ? "Picked up" : null,
    status: answer.acked_at ? "done" : "pending",
  };
}

function actionsFile(env: Record<string, string | undefined>): string {
  return path.join(path.dirname(defaultSnapshotFile(env)), "os-actions.json");
}

function legacyFile(env: Record<string, string | undefined>): string {
  return path.join(path.dirname(defaultSnapshotFile(env)), "os-decisions.json");
}

async function readStored(env: Record<string, string | undefined>): Promise<OsAction[]> {
  const raw = await readKind(env, actionsFile(env), ACTIONS_BLOB_PATH);
  return parseActions(raw);
}

async function readLegacy(env: Record<string, string | undefined>): Promise<DecisionAnswer[]> {
  const raw = await readKind(env, legacyFile(env), LEGACY_BLOB_PATH);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as LegacyLedger;
    return Array.isArray(parsed.answers) ? parsed.answers.filter(isAnswer) : [];
  } catch {
    return [];
  }
}

function parseActions(raw: string | null): OsAction[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Ledger;
    return Array.isArray(parsed.actions) ? parsed.actions.filter(isAction) : [];
  } catch {
    return [];
  }
}

async function writeActions(actions: OsAction[], env: Record<string, string | undefined>): Promise<void> {
  const kept = actions.filter(isAction).slice(-5000);
  const raw = JSON.stringify({ actions: kept } satisfies Ledger);
  const kind = storeKind(env);
  if (kind === "unconfigured") throw new SnapshotStoreError("Snapshot store is not configured", "unconfigured");
  if (kind === "file") {
    const file = actionsFile(env);
    await mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    await writeFile(tmp, raw, "utf8");
    await rename(tmp, file);
    return;
  }
  const { put } = await import("@vercel/blob");
  await put(ACTIONS_BLOB_PATH, raw, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}

async function readKind(env: Record<string, string | undefined>, file: string, blobPath: string): Promise<string | null> {
  const kind = storeKind(env);
  if (kind === "unconfigured") return null;
  if (kind === "file") return readFileOrNull(file);
  const { get } = await import("@vercel/blob");
  const result = await get(blobPath, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  return new Response(result.stream).text();
}

async function readFileOrNull(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function isAnswer(value: unknown): value is DecisionAnswer {
  if (!value || typeof value !== "object") return false;
  const row = value as DecisionAnswer;
  return typeof row.decision_id === "string" && typeof row.choice === "string" && typeof row.decided_at === "string";
}

function isAction(value: unknown): value is OsAction {
  if (!value || typeof value !== "object") return false;
  const row = value as OsAction;
  return typeof row.action_id === "string" && isActionType(row.type) && typeof row.target_id === "string" && typeof row.idempotency_key === "string";
}
