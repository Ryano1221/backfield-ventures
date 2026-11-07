import { DEFAULT_SOURCES } from "./sources";
import { KEEP_DAYS, KEEP_POSTS, type InspoBook, type InspoKind, type InspoPost, type InspoSource } from "./types";

export const EMPTY_INSPO: InspoBook = { version: 1, sources: DEFAULT_SOURCES, posts: [], status: {}, last_run: null };

export function parseInspo(raw: string | null): InspoBook {
  if (!raw) return EMPTY_INSPO;
  try {
    const data = JSON.parse(raw) as Partial<InspoBook>;
    return {
      version: 1,
      sources: Array.isArray(data.sources) ? data.sources : DEFAULT_SOURCES,
      posts: Array.isArray(data.posts) ? data.posts : [],
      status: data.status && typeof data.status === "object" ? data.status : {},
      last_run: typeof data.last_run === "string" ? data.last_run : null,
    };
  } catch {
    return EMPTY_INSPO;
  }
}

/** New posts in, duplicates out, newest first, old ones trimmed. */
export function mergePosts(existing: InspoPost[], incoming: InspoPost[], now: Date): InspoPost[] {
  const cutoff = now.getTime() - KEEP_DAYS * 86_400_000;
  const byId = new Map<string, InspoPost>();
  for (const post of [...existing, ...incoming]) byId.set(post.id, { ...byId.get(post.id), ...post });
  return [...byId.values()]
    .filter((post) => Date.parse(post.at) >= cutoff)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, KEEP_POSTS);
}

/** A stable id for a post, from where it lives. */
export function postId(sourceId: string, url: string, title: string): string {
  const key = `${sourceId}|${url || title}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (Math.imul(hash, 31) + key.charCodeAt(i)) | 0;
  return `${sourceId}-${(hash >>> 0).toString(36)}`;
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "source";
}

/** What Ryan typed into "Add someone": a feed URL, a LinkedIn profile, or an X handle or URL. */
export function sourceFromInput(name: string, raw: string): { ok: true; source: InspoSource } | { ok: false; error: string } {
  const value = raw.trim();
  const label = name.trim();
  if (!value) return { ok: false, error: "Paste a feed link, a LinkedIn profile, or an X handle." };
  let kind: InspoKind;
  let url = value;
  const x = value.match(/^(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\/@?([A-Za-z0-9_]{1,15})\/?$/i) ?? value.match(/^@([A-Za-z0-9_]{1,15})$/);
  if (x) {
    kind = "x";
    url = x[1];
  } else if (/^(?:https?:\/\/)?(?:[a-z]+\.)?linkedin\.com\/in\/[^/?#]+\/?/i.test(value)) {
    kind = "linkedin";
    url = value.startsWith("http") ? value : `https://${value}`;
  } else if (/^https?:\/\/\S+\.\S+/i.test(value)) {
    kind = "feed";
  } else return { ok: false, error: "That doesn't look like a link or an @handle." };
  const shown = label || (kind === "x" ? `@${url}` : kind === "linkedin" ? url.replace(/^https?:\/\/(?:www\.)?linkedin\.com\/in\//i, "").replace(/\/$/, "") : new URL(url).hostname.replace(/^www\./, ""));
  return { ok: true, source: { id: `${kind === "feed" ? "" : `${kind}-`}${slug(shown)}`, name: shown, kind, url } };
}

export type InspoOp = { op: "add_source"; name?: string; url: string } | { op: "remove_source"; id: string };

export function applyInspoOp(book: InspoBook, raw: unknown): { ok: true; book: InspoBook } | { ok: false; error: string } {
  const op = (raw ?? {}) as Record<string, unknown>;
  if (op.op === "add_source") {
    const made = sourceFromInput(typeof op.name === "string" ? op.name.slice(0, 80) : "", typeof op.url === "string" ? op.url.slice(0, 500) : "");
    if (!made.ok) return made;
    if (book.sources.some((s) => s.kind === made.source.kind && s.url.toLowerCase() === made.source.url.toLowerCase())) return { ok: false, error: "Already on the list." };
    let id = made.source.id;
    for (let n = 2; book.sources.some((s) => s.id === id); n++) id = `${made.source.id}-${n}`;
    if (book.sources.length >= 80) return { ok: false, error: "That's 80 people already. Remove someone first." };
    return { ok: true, book: { ...book, sources: [...book.sources, { ...made.source, id }] } };
  }
  if (op.op === "remove_source" && typeof op.id === "string") {
    if (!book.sources.some((s) => s.id === op.id)) return { ok: false, error: "Not on the list." };
    const { [op.id]: _gone, ...status } = book.status;
    void _gone;
    return { ok: true, book: { ...book, sources: book.sources.filter((s) => s.id !== op.id), posts: book.posts.filter((p) => p.source_id !== op.id), status } };
  }
  return { ok: false, error: "Nothing to change." };
}
