import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateSnapshot } from "./schema";
import type { Snapshot } from "./types";

export const BLOB_PATH = "os-dashboard/latest.json";
const MAX_BYTES = 1_500_000;

export class SnapshotStoreError extends Error {
  constructor(
    message: string,
    readonly code: "unconfigured" | "failed",
  ) {
    super(message);
  }
}

type Envelope = { snapshot: Snapshot; stored_at: string };

export function fixturesAllowed(env: Record<string, string | undefined> = process.env): boolean {
  return env.OS_DASHBOARD_FIXTURES === "1" && env.VERCEL_ENV !== "production";
}

export function blobConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.BLOB_STORE_ID || env.BLOB_READ_WRITE_TOKEN);
}

export function storeKind(env: Record<string, string | undefined> = process.env): "file" | "blob" | "unconfigured" {
  if (env.OS_SNAPSHOT_FILE) return "file";
  if (blobConfigured(env)) return "blob";
  if (env.VERCEL) return "unconfigured";
  return "file";
}

export function defaultSnapshotFile(env: Record<string, string | undefined> = process.env): string {
  return env.OS_SNAPSHOT_FILE || path.join(process.cwd(), ".data", "os-snapshot.json");
}

export async function readSnapshot(env: Record<string, string | undefined> = process.env): Promise<Snapshot | null> {
  const stored = await readStored(env);
  if (stored) return stored;
  if (!fixturesAllowed(env)) return null;
  return readFixture();
}

export async function writeSnapshot(snapshot: Snapshot, env: Record<string, string | undefined> = process.env): Promise<string> {
  const stored_at = new Date().toISOString();
  const raw = JSON.stringify({ snapshot, stored_at } satisfies Envelope);
  if (Buffer.byteLength(raw) > MAX_BYTES) {
    throw new SnapshotStoreError("Snapshot is too large", "failed");
  }
  const kind = storeKind(env);
  if (kind === "unconfigured") {
    throw new SnapshotStoreError("Snapshot store is not configured", "unconfigured");
  }
  if (kind === "file") {
    await writeFileSnapshot(defaultSnapshotFile(env), raw);
    return stored_at;
  }
  await writeBlob(raw);
  return stored_at;
}

async function readStored(env: Record<string, string | undefined>): Promise<Snapshot | null> {
  const kind = storeKind(env);
  if (kind === "unconfigured") return null;
  const raw = kind === "file" ? await readFileOrNull(defaultSnapshotFile(env)) : await readBlob();
  if (!raw) return null;
  return unwrap(raw);
}

async function readFixture(): Promise<Snapshot | null> {
  const raw = await readFileOrNull(path.join(process.cwd(), "src", "fixtures", "os-dashboard.sample.json"));
  if (!raw) return null;
  return unwrap(raw);
}

function unwrap(raw: string): Snapshot | null {
  try {
    const parsed = JSON.parse(raw) as { snapshot?: unknown };
    const body = parsed && typeof parsed === "object" && "snapshot" in parsed ? parsed.snapshot : parsed;
    const result = validateSnapshot(body);
    return result.ok ? result.snapshot : null;
  } catch {
    return null;
  }
}

async function readFileOrNull(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function writeFileSnapshot(file: string, raw: string): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, raw, "utf8");
  await rename(tmp, file);
}

async function writeBlob(raw: string): Promise<void> {
  const { put } = await import("@vercel/blob");
  await put(BLOB_PATH, raw, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}

async function readBlob(): Promise<string | null> {
  const { get } = await import("@vercel/blob");
  const result = await get(BLOB_PATH, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  return await new Response(result.stream).text();
}
