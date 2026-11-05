import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const ALLOWED_DOMAINS = new Set(["example.com", "example.net", "example.org"]);
const FILE_DOMAIN_ALLOW: Record<string, Set<string>> = {
  "test/pitch-notify.test.mjs": new Set(["backfieldventures.com", "resend.dev"]),
};
const EMAIL = /[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
const PHONE = /(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]\d{3}[\s.-]\d{4}/g;
const NAME_FIELD = /(?:name|founder|company)\s*[:=]\s*["']([^"'\n]{2,80})["']/g;
const FAKE_NAME = /\b(example|fixture|sample|test|ada|casey|northwind|acme|director|founder)\b/i;
const PERSONAL_NAME = /^(?:[A-Z][a-z]+(?:['-][A-Z][a-z]+)?)(?:\s+[A-Z][a-z]+(?:['-][A-Z][a-z]+)?){1,3}$/;

test("fixtures and tests only use example emails, fictional phones, and fake names", () => {
  const hits: string[] = [];
  for (const file of fixtureAndTestFiles(process.cwd())) {
    const text = readFileSync(file, "utf8");
    const rel = path.relative(process.cwd(), file).split(path.sep).join("/");
    for (const match of text.matchAll(EMAIL)) {
      const domain = match[1]?.toLowerCase() ?? "";
      if (allowedDomain(rel, domain)) continue;
      hits.push(`${rel}:${lineOf(text, match.index)} ${match[0]}`);
    }
    for (const match of text.matchAll(PHONE)) {
      if (fictionalPhone(match[0])) continue;
      hits.push(`${rel}:${lineOf(text, match.index)} phone ${match[0]}`);
    }
    if (rel.includes("/fixtures/")) {
      for (const match of text.matchAll(NAME_FIELD)) {
        const value = match[1]?.trim() ?? "";
        if (!value || FAKE_NAME.test(value) || !PERSONAL_NAME.test(value)) continue;
        hits.push(`${rel}:${lineOf(text, match.index)} name ${value}`);
      }
    }
  }
  assert.deepEqual(hits, []);
});

function allowedDomain(file: string, domain: string): boolean {
  if (ALLOWED_DOMAINS.has(domain) || domain.endsWith(".example")) return true;
  return FILE_DOMAIN_ALLOW[file]?.has(domain) ?? false;
}

function fictionalPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return national.length === 10 && national.slice(3, 6) === "555";
}

function lineOf(text: string, index: number | undefined): number {
  return text.slice(0, index ?? 0).split("\n").length;
}

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
