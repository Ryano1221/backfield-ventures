/**
 * "What top VCs are posting": public posts from people Ryan learns from, for
 * ideas in the content studio. Newsletters, podcasts and YouTube come from their
 * public feeds; LinkedIn and X come through Apify once a key is set.
 */
export type InspoKind = "feed" | "linkedin" | "x";

export type InspoSource = {
  id: string;
  name: string;
  kind: InspoKind;
  /** Feed URL, LinkedIn profile URL, or X handle (without @). */
  url: string;
};

export type InspoPost = {
  id: string;
  source_id: string;
  author: string;
  kind: InspoKind;
  title: string;
  text: string;
  url: string;
  at: string;
  likes: number | null;
  comments: number | null;
};

export type SourceStatus = { at: string; ok: boolean; note: string };

export type InspoBook = {
  version: 1;
  sources: InspoSource[];
  posts: InspoPost[];
  status: Record<string, SourceStatus>;
  last_run: string | null;
};

export const KIND_LABEL: Record<InspoKind, string> = { feed: "Newsletter / podcast", linkedin: "LinkedIn", x: "X" };

/** Keep 60 days of posts, at most this many. */
export const KEEP_DAYS = 60;
export const KEEP_POSTS = 600;
