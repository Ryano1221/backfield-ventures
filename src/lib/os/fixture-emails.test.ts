import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const ALLOWED_DOMAINS = new Set(["example.com", "example.net", "example.org"]);
const EMAIL = /[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

test("fixtures and tests only use example email domains", () => {
  const hits: string[] = [];
  for (const file of fixtureAndTestFiles(process.cwd())) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(EMAIL)) {
      const domain = match[1]?.toLowerCase() ?? "";
      if (ALLOWED_DOMAINS.has(domain) || domain.endsWith(".example")) continue;
      const line = text.slice(0, match.index ?? 0).split("\n").length;
      hits.push(`${path.relative(process.cwd(), file)}:${line} ${match[0]}`);
    }
  }
  assert.deepEqual(hits, []);
});

function fixtureAndTestFiles(root: string): string[] {
  const files: string[] = [];
  walk(root, files);
  return files;
}

function walk(dir: string, files: string[]): void {
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git" || entry === "test-results" || entry === "playwright-report") continue;
    const full = path.join(dir, entry);
    let info;
    try {
      info = statSync(full);
    } catch {
      continue;
    }
    if (info.isDirectory()) {
      walk(full, files);
      continue;
    }
    if (!info.isFile()) continue;
    if (isFixtureOrTest(full)) files.push(full);
  }
}

function isFixtureOrTest(file: string): boolean {
  const normalized = file.split(path.sep).join("/");
  if (normalized.includes("/node_modules/") || normalized.includes("/.next/")) return false;
  if (normalized.includes("/fixtures/")) return true;
  if (normalized.includes("/e2e/")) return true;
  return /\.(test|spec)\.[cm]?[jt]sx?$/.test(normalized);
}
