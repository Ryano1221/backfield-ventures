import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { readDoc, writeDoc } from "../doc-store";
import { fixturesAllowed } from "../store";
import { apifyPosts, apifyToken } from "./apify";
import { parseInspo } from "./book";
import { refreshInspo, type InspoDeps } from "./run";
import type { InspoBook } from "./types";

export const INSPO_DOC = "inspo";

export async function readInspo(): Promise<InspoBook> {
  return parseInspo(await readDoc(INSPO_DOC).catch(() => null));
}

export async function saveInspo(book: InspoBook): Promise<void> {
  await writeDoc(INSPO_DOC, JSON.stringify(book));
}

async function readFeedLive(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, { headers: { "User-Agent": "BackfieldOS/1.0 (feed reader)", Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" }, signal: controller.signal, redirect: "follow" });
    if (!res.ok) throw new Error(`The site answered ${res.status}.`);
    return await res.text();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("The site took too long to answer.");
    throw error instanceof Error && /answered/.test(error.message) ? error : new Error("Could not reach the site.");
  } finally {
    clearTimeout(timer);
  }
}

function deps(): InspoDeps {
  if (fixturesAllowed()) {
    const xml = readFileSync(path.join(process.cwd(), "e2e/fixtures/inspo-feed.xml"), "utf8");
    // Tests: the 20VC feed reads canned posts; every other source fails, so both states show.
    return { readFeed: async (url) => (url.includes("libsyn") || url.includes("fixture") ? xml : Promise.reject(new Error("The site answered 404."))), scrape: null, now: process.env.OUTREACH_FIXTURE_NOW ? new Date(process.env.OUTREACH_FIXTURE_NOW) : new Date() };
  }
  const token = apifyToken();
  return { readFeed: readFeedLive, scrape: token ? (kind, sources) => apifyPosts(fetch, token, kind, sources) : null, now: new Date() };
}

/** Read every source and save. Merges onto the latest saved list, so a source added meanwhile stays. */
export async function refreshAndSave() {
  const book = await readInspo();
  const result = await refreshInspo(book, deps());
  const latest = await readInspo();
  const keep = new Set(latest.sources.map((s) => s.id));
  const saved: InspoBook = { ...result.book, sources: latest.sources, posts: result.book.posts.filter((p) => keep.has(p.source_id)) };
  await saveInspo(saved);
  return { book: saved, added: result.added, failed: result.failed };
}
