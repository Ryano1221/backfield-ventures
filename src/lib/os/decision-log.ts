import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { DecisionSwap } from "./types";
import { defaultSnapshotFile, storeKind } from "./store";

export const DECISION_LOG_BLOB = "os-dashboard/decision-log.jsonl";

export type DecisionLogEntry = {
  at: string;
  id: string;
  answer: string;
  hash: string | null;
  note: string | null;
  swaps: DecisionSwap[] | null;
};

export function decisionLogFile(env: Record<string, string | undefined> = process.env): string {
  return path.join(path.dirname(defaultSnapshotFile(env)), "decision-log.jsonl");
}

export async function appendDecisionLog(entry: DecisionLogEntry, env: Record<string, string | undefined> = process.env): Promise<void> {
  const line = `${JSON.stringify(entry)}\n`;
  const kind = storeKind(env);
  if (kind === "unconfigured") return;
  if (kind === "file") {
    const file = decisionLogFile(env);
    await mkdir(path.dirname(file), { recursive: true });
    await appendFile(file, line, "utf8");
    return;
  }
  const { get, put } = await import("@vercel/blob");
  const existing = await get(DECISION_LOG_BLOB, { access: "private", useCache: false });
  const prior = existing && existing.statusCode === 200 && existing.stream ? await new Response(existing.stream).text() : "";
  await put(DECISION_LOG_BLOB, `${prior}${line}`, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "text/plain",
    cacheControlMaxAge: 60,
  });
}

export async function readDecisionLog(env: Record<string, string | undefined> = process.env): Promise<DecisionLogEntry[]> {
  const kind = storeKind(env);
  if (kind !== "file") return [];
  try {
    const raw = await readFile(decisionLogFile(env), "utf8");
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as DecisionLogEntry);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
