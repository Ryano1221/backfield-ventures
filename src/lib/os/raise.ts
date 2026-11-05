import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { EMPTY_LEDGER, parseLedger, type RaiseLedger } from "./raise-model";
import { defaultSnapshotFile, SnapshotStoreError, storeKind } from "./store";

export * from "./raise-model";

export const RAISE_BLOB_PATH = "os-dashboard/raise.json";

function raiseFile(env: Record<string, string | undefined>): string {
  return path.join(path.dirname(defaultSnapshotFile(env)), "os-raise.json");
}

export async function readRaise(env: Record<string, string | undefined> = process.env): Promise<RaiseLedger> {
  const kind = storeKind(env);
  if (kind === "unconfigured") return { ...EMPTY_LEDGER };
  if (kind === "file") {
    try {
      return parseLedger(await readFile(raiseFile(env), "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { ...EMPTY_LEDGER };
      throw error;
    }
  }
  const { get } = await import("@vercel/blob");
  const result = await get(RAISE_BLOB_PATH, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200 || !result.stream) return { ...EMPTY_LEDGER };
  return parseLedger(await new Response(result.stream).text());
}

export async function writeRaise(ledger: RaiseLedger, env: Record<string, string | undefined> = process.env): Promise<void> {
  const raw = JSON.stringify(ledger);
  const kind = storeKind(env);
  if (kind === "unconfigured") throw new SnapshotStoreError("Raise store is not configured", "unconfigured");
  if (kind === "file") {
    const file = raiseFile(env);
    await mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    await writeFile(tmp, raw, "utf8");
    await rename(tmp, file);
    return;
  }
  const { put } = await import("@vercel/blob");
  await put(RAISE_BLOB_PATH, raw, { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 60 });
}
