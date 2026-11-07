import type { InspoPost, InspoSource } from "./types";
import { postId } from "./book";

/**
 * LinkedIn and X posts through Apify, a scraping service that stays inside
 * those sites' rules. Needs APIFY_TOKEN. Which Apify actor reads each site can
 * be changed with APIFY_LINKEDIN_ACTOR and APIFY_X_ACTOR; the reader below
 * accepts the field names the common actors use.
 */
export const DEFAULT_ACTORS = { linkedin: "harvestapi~linkedin-profile-posts", x: "apidojo~tweet-scraper" } as const;

type Fetch = typeof fetch;
type Row = Record<string, unknown>;

export function apifyToken(env: Record<string, string | undefined> = process.env): string | null {
  const token = env.APIFY_TOKEN?.trim();
  return token ? token : null;
}

function pick(row: Row, paths: string[]): unknown {
  for (const path of paths) {
    let value: unknown = row;
    for (const key of path.split(".")) value = value && typeof value === "object" ? (value as Row)[key] : undefined;
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function num(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value.replace(/,/g, "")) : typeof value === "number" ? value : NaN;
  return Number.isFinite(n) ? n : null;
}

/** One scraped LinkedIn or X post, in whatever shape the actor returned, as an InspoPost. */
export function postFromRow(source: InspoSource, row: Row): InspoPost | null {
  const text = String(pick(row, ["text", "content", "full_text", "fullText", "postText", "commentary"]) ?? "").trim();
  const url = String(pick(row, ["url", "postUrl", "linkedinUrl", "twitterUrl", "link"]) ?? "").trim();
  const rawAt = pick(row, ["postedAt.date", "postedAt.timestamp", "postedAt", "createdAt", "created_at", "date", "timestamp"]);
  const ms = typeof rawAt === "number" ? (rawAt < 1e12 ? rawAt * 1000 : rawAt) : Date.parse(String(rawAt ?? ""));
  if (!text || !Number.isFinite(ms)) return null;
  const firstLine = text.split("\n").find((line) => line.trim())?.trim() ?? text;
  return {
    id: postId(source.id, url, text.slice(0, 80)),
    source_id: source.id,
    author: source.name,
    kind: source.kind,
    title: firstLine.length > 140 ? `${firstLine.slice(0, 137)}...` : firstLine,
    text: text.slice(0, 1600),
    url,
    at: new Date(ms).toISOString(),
    likes: num(pick(row, ["engagement.likes", "likeCount", "likes", "numLikes", "favorite_count", "favoriteCount", "reactionsCount"])),
    comments: num(pick(row, ["engagement.comments", "commentCount", "comments", "numComments", "replyCount", "reply_count"])),
  };
}

/** Recent posts for a group of LinkedIn profiles or X handles, in one Apify run. */
export async function apifyPosts(fetcher: Fetch, token: string, kind: "linkedin" | "x", sources: InspoSource[], env: Record<string, string | undefined> = process.env): Promise<Row[]> {
  const actor = (kind === "linkedin" ? env.APIFY_LINKEDIN_ACTOR : env.APIFY_X_ACTOR)?.trim() || DEFAULT_ACTORS[kind];
  const input =
    kind === "linkedin"
      ? { profileUrls: sources.map((s) => s.url), targetUrls: sources.map((s) => s.url), maxPosts: 8, postedLimit: "month" }
      : { twitterHandles: sources.map((s) => s.url), handles: sources.map((s) => s.url), maxItems: sources.length * 10, sort: "Latest" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  try {
    const res = await fetcher(`https://api.apify.com/v2/acts/${encodeURIComponent(actor)}/run-sync-get-dataset-items?timeout=110`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    if (res.status === 401 || res.status === 403) throw new Error("Apify refused the key. Check APIFY_TOKEN.");
    if (res.status === 404) throw new Error(`Apify has no actor named ${actor}. Set APIFY_${kind === "linkedin" ? "LINKEDIN" : "X"}_ACTOR.`);
    if (!res.ok) throw new Error(`Apify answered ${res.status}.`);
    const rows = (await res.json()) as unknown;
    return Array.isArray(rows) ? (rows as Row[]) : [];
  } finally {
    clearTimeout(timer);
  }
}

/** Which source a scraped row belongs to, by the profile or handle it mentions. */
export function sourceForRow(sources: InspoSource[], row: Row): InspoSource | null {
  if (sources.length === 1) return sources[0];
  const hay = JSON.stringify(pick(row, ["author", "user", "authorProfileUrl", "profileUrl", "author.url", "author.userName", "user.screen_name", "url"]) ?? row).toLowerCase();
  return (
    sources.find((s) => {
      const key = s.kind === "x" ? s.url.toLowerCase() : s.url.toLowerCase().replace(/\/$/, "").split("/in/")[1] ?? "";
      return key && hay.includes(key);
    }) ?? null
  );
}
