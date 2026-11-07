import { apifyPosts, postFromRow, sourceForRow } from "./apify";
import { mergePosts, postId } from "./book";
import { parseFeed } from "./feed";
import type { InspoBook, InspoPost, InspoSource, SourceStatus } from "./types";

export type InspoDeps = {
  /** The raw text of a feed URL. Throws with a short reason when it can't be read. */
  readFeed: (url: string) => Promise<string>;
  /** Scraped rows for LinkedIn or X sources, or null when there's no Apify key. */
  scrape: ((kind: "linkedin" | "x", sources: InspoSource[]) => Promise<Record<string, unknown>[]>) | null;
  now: Date;
};

const PER_SOURCE = 10;

/** Read every source once and fold the new posts into the book. One bad source never stops the rest. */
export async function refreshInspo(book: InspoBook, deps: InspoDeps): Promise<{ book: InspoBook; added: number; failed: number }> {
  const at = deps.now.toISOString();
  const status: Record<string, SourceStatus> = { ...book.status };
  const found: InspoPost[] = [];

  await Promise.all(
    book.sources
      .filter((s) => s.kind === "feed")
      .map(async (source) => {
        try {
          const items = parseFeed(await deps.readFeed(source.url)).slice(0, PER_SOURCE);
          if (!items.length) throw new Error("No posts found at that link. Is it the feed URL?");
          for (const item of items) {
            found.push({ id: postId(source.id, item.link, item.title), source_id: source.id, author: source.name, kind: "feed", title: item.title || item.text.slice(0, 120), text: item.text, url: item.link, at: item.at ?? at, likes: null, comments: null });
          }
          status[source.id] = { at, ok: true, note: `Read ${items.length} ${items.length === 1 ? "post" : "posts"}.` };
        } catch (error) {
          status[source.id] = { at, ok: false, note: error instanceof Error ? error.message : "Could not read it." };
        }
      }),
  );

  for (const kind of ["linkedin", "x"] as const) {
    const group = book.sources.filter((s) => s.kind === kind);
    if (!group.length) continue;
    if (!deps.scrape) {
      for (const s of group) status[s.id] = { at, ok: false, note: "Waiting for an Apify key (APIFY_TOKEN in Vercel)." };
      continue;
    }
    try {
      const rows = await deps.scrape(kind, group);
      const counts = new Map<string, number>();
      for (const row of rows) {
        const source = sourceForRow(group, row);
        if (!source || (counts.get(source.id) ?? 0) >= PER_SOURCE) continue;
        const post = postFromRow(source, row);
        if (!post) continue;
        found.push(post);
        counts.set(source.id, (counts.get(source.id) ?? 0) + 1);
      }
      for (const s of group) {
        const n = counts.get(s.id) ?? 0;
        status[s.id] = n ? { at, ok: true, note: `Read ${n} ${n === 1 ? "post" : "posts"}.` } : { at, ok: false, note: "No recent posts came back for this profile." };
      }
    } catch (error) {
      for (const s of group) status[s.id] = { at, ok: false, note: error instanceof Error ? error.message : "Apify failed." };
    }
  }

  const before = new Set(book.posts.map((p) => p.id));
  const posts = mergePosts(book.posts, found, deps.now);
  return {
    book: { ...book, posts, status, last_run: at },
    added: posts.filter((p) => !before.has(p.id)).length,
    failed: book.sources.filter((s) => status[s.id] && !status[s.id].ok).length,
  };
}

export { apifyPosts };
