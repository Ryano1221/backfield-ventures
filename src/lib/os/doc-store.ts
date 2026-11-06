import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { defaultSnapshotFile, SnapshotStoreError, storeKind } from "./store";

/** A small JSON document next to the snapshot: a local file in dev, a private blob on Vercel. */
export async function readDoc(name: string, env: Record<string, string | undefined> = process.env): Promise<string | null> {
  const kind = storeKind(env);
  if (kind === "unconfigured") return null;
  if (kind === "file") {
    try {
      return await readFile(docFile(name, env), "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
  const { get } = await import("@vercel/blob");
  const result = await get(`os-dashboard/${name}.json`, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  return new Response(result.stream).text();
}

export async function writeDoc(name: string, raw: string, env: Record<string, string | undefined> = process.env): Promise<void> {
  const kind = storeKind(env);
  if (kind === "unconfigured") throw new SnapshotStoreError("Store is not configured", "unconfigured");
  if (kind === "file") {
    const file = docFile(name, env);
    await mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    await writeFile(tmp, raw, "utf8");
    await rename(tmp, file);
    return;
  }
  const { put } = await import("@vercel/blob");
  await put(`os-dashboard/${name}.json`, raw, { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 60 });
}

function docFile(name: string, env: Record<string, string | undefined>): string {
  return path.join(path.dirname(defaultSnapshotFile(env)), `os-${name}.json`);
}
