// Server-side selection for the /handoff past-issues archive.
// Imported by a server component. This module never reads process.env itself,
// so a client bundle cannot pick up BEEHIIV_API_KEY from here.

export const ARCHIVE_REVALIDATE_SECONDS = 3600;

export const ARCHIVE_HEADING = "Past issues";
export const ARCHIVE_SUBHEADING = "Read earlier issues";
export const ARCHIVE_LINE = "Every Handoff I've sent, newest first.";

const PUBLISH_SKEW_MS = 5 * 60 * 1000;
const MAX_PAGES = 20;
const PAGE_LIMIT = 100;
const MAX_RSS_CHARS = 2_000_000;
const PREVIEW_LIMIT = 180;

const WORD_RULES: { reason: string; pattern: RegExp }[] = [
  { reason: "word:fund-i", pattern: /\bfund\s+i\b/i },
  { reason: "word:funds", pattern: /\bfunds\b/i },
  { reason: "word:fund", pattern: /\bfund\b/i },
  { reason: "word:raising", pattern: /\braising\b/i },
  { reason: "word:raised", pattern: /\braised\b/i },
  { reason: "word:raise", pattern: /\braise\b/i },
];

const ARCHIVE_DATE = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "America/Chicago",
});

export type ArchiveIssue = {
  id: string;
  title: string;
  url: string;
  publishedAt: number;
  preview: string;
};

export type ArchiveEnv = {
  VERCEL_ENV?: string;
  HANDOFF_ARCHIVE_FIXTURE?: string;
  BEEHIIV_RSS_URL?: string;
  BEEHIIV_API_KEY?: string;
  BEEHIIV_PUBLICATION_ID?: string;
};

export type GuardInput = {
  title: string;
  subtitle: string;
  preview: string;
  content: string;
};

export type BeehiivPost = {
  id?: string;
  title?: string | null;
  subtitle?: string | null;
  preview_text?: string | null;
  status?: string | null;
  platform?: string | null;
  audience?: string | null;
  publish_date?: number | null;
  web_url?: string | null;
  hidden_from_feed?: boolean | null;
  content?: { free?: { web?: string | null } | null } | null;
};

export type RssItem = {
  id: string;
  title: string;
  link: string;
  description: string;
  content: string;
  publishedAt: number | null;
};

type DropLogger = (entry: { id: string; reason: string }) => void;

type ArchiveFetch = (
  input: string,
  init?: RequestInit & { next?: { revalidate?: number; tags?: string[] } },
) => Promise<Response>;

const defaultLogger: DropLogger = (entry) => {
  console.warn("handoff-archive: dropped", { id: entry.id, reason: entry.reason });
};

export function formatArchiveDate(publishedAtMs: number): string {
  return ARCHIVE_DATE.format(new Date(publishedAtMs));
}

export function plainText(value: string): string {
  return decodeEntities(value)
    .replace(/<!--/g, " ")
    .replace(/-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function blockReason(input: GuardInput): string | null {
  const combined = `${input.title}\n${input.subtitle}\n${input.preview}\n${input.content}`;
  const text = plainText(combined);
  for (const rule of WORD_RULES) {
    if (rule.pattern.test(text)) return rule.reason;
  }
  return firstBlockedLink(combined);
}

export function fixtureRequested(env: ArchiveEnv): boolean {
  return env.VERCEL_ENV === "preview" && env.HANDOFF_ARCHIVE_FIXTURE === "1";
}

export function fixtureActive(env: ArchiveEnv, host: string | null): boolean {
  // NODE_ENV is "production" on Vercel preview deployments, so it is not a gate.
  if (!fixtureRequested(env)) return false;
  const hostname = hostnameOf(host);
  if (!hostname) return false;
  if (isBackfieldHost(hostname)) return false;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return true;
  return hostname.endsWith(".vercel.app");
}

export function fixtureIssues(): ArchiveIssue[] {
  const samples: ArchiveIssue[] = [
    {
      id: "sample-issue-1",
      title: "Sample issue 1",
      preview: "Sample only. Not a real Handoff.",
      url: "https://handoffbybackfield.beehiiv.com/p/sample-issue-1",
      publishedAt: Date.UTC(2026, 9, 7, 17, 0, 0),
    },
    {
      id: "sample-issue-2",
      title: "Sample issue 2",
      preview: "Another sample subtitle for the archive.",
      url: "https://handoffbybackfield.beehiiv.com/p/sample-issue-2",
      publishedAt: Date.UTC(2026, 8, 2, 17, 0, 0),
    },
    {
      id: "sample-issue-3",
      title: "Sample issue 3",
      preview: "A third sample subtitle for the layout.",
      url: "https://handoffbybackfield.beehiiv.com/p/sample-issue-3",
      publishedAt: Date.UTC(2026, 7, 4, 17, 0, 0),
    },
  ];
  return samples.flatMap((issue) => {
    const reason = blockReason({
      title: issue.title,
      subtitle: issue.preview,
      preview: "",
      content: "",
    });
    if (reason) return [];
    const url = withArchiveUtm(issue.url);
    return url ? [{ ...issue, url }] : [];
  });
}

export function parseRss(xml: string): RssItem[] {
  if (!xml || xml.length > MAX_RSS_CHARS || !/<item[\s>]/i.test(xml)) return [];
  const items: RssItem[] = [];
  const chunks = xml.split(/<item\b[^>]*>/i).slice(1);
  for (const chunk of chunks) {
    const block = chunk.split(/<\/item>/i)[0] ?? "";
    const title = decodeEntities(unwrapCdata(readTag(block, "title"))).trim();
    const link = decodeEntities(readLink(block)).trim();
    const description = unwrapCdata(readTag(block, "description"));
    const content = unwrapCdata(readTag(block, "content:encoded")) || unwrapCdata(readTag(block, "encoded"));
    const guid = decodeEntities(unwrapCdata(readTag(block, "guid"))).trim();
    const pubDate = decodeEntities(unwrapCdata(readTag(block, "pubDate"))).trim();
    const parsed = pubDate ? Date.parse(pubDate) : Number.NaN;
    items.push({
      id: guid || link,
      title,
      link,
      description,
      content,
      publishedAt: Number.isFinite(parsed) ? parsed : null,
    });
  }
  return items;
}

export function selectRssItems(
  items: RssItem[],
  nowMs: number,
  logger: DropLogger = defaultLogger,
): ArchiveIssue[] {
  const out: ArchiveIssue[] = [];
  for (const item of items) {
    const title = plainText(item.title);
    if (!item.id || !title || !item.link) continue;
    if (item.publishedAt == null || item.publishedAt > nowMs + PUBLISH_SKEW_MS) continue;
    const reason = blockReason({
      title: item.title,
      subtitle: item.description,
      preview: "",
      content: item.content,
    });
    if (reason) {
      logger({ id: item.id, reason });
      continue;
    }
    const url = withArchiveUtm(item.link);
    if (!url) continue;
    out.push({
      id: item.id,
      title,
      url,
      publishedAt: item.publishedAt,
      preview: shortPreview(item.description),
    });
  }
  return dedupeNewestFirst(out);
}

export function selectApiPosts(
  posts: BeehiivPost[],
  nowMs: number,
  logger: DropLogger = defaultLogger,
): ArchiveIssue[] {
  const nowSec = Math.floor((nowMs + PUBLISH_SKEW_MS) / 1000);
  const out: ArchiveIssue[] = [];
  for (const post of posts) {
    const title = plainText(post.title ?? "");
    if (!post.id || !title) continue;
    if (post.status !== "confirmed") continue;
    if (post.platform !== "web" && post.platform !== "both") continue;
    if (post.audience !== "free") continue;
    if (post.hidden_from_feed !== false) continue;
    if (typeof post.publish_date !== "number" || !Number.isFinite(post.publish_date)) continue;
    if (post.publish_date > nowSec) continue;
    const html = post.content?.free?.web ?? "";
    const reason = blockReason({
      title: post.title ?? "",
      subtitle: post.subtitle ?? "",
      preview: post.preview_text ?? "",
      content: html,
    });
    if (reason) {
      logger({ id: post.id, reason });
      continue;
    }
    const url = withArchiveUtm(post.web_url ?? "");
    if (!url) continue;
    out.push({
      id: post.id,
      title,
      url,
      publishedAt: post.publish_date * 1000,
      preview: shortPreview(post.subtitle ?? "", post.preview_text ?? ""),
    });
  }
  return dedupeNewestFirst(out);
}

export async function loadArchiveIssues(input: {
  env: ArchiveEnv;
  host: string | null;
  now?: number;
  fetchImpl?: ArchiveFetch;
}): Promise<ArchiveIssue[]> {
  const now = input.now ?? Date.now();
  if (fixtureActive(input.env, input.host)) return fixtureIssues();

  const fetchImpl = input.fetchImpl ?? fetch;
  const rssUrl = input.env.BEEHIIV_RSS_URL?.trim() ?? "";
  if (rssUrl) {
    const allowed = allowedRssUrl(rssUrl);
    if (!allowed) return [];
    const xml = await fetchText(fetchImpl, allowed, {
      headers: { Accept: "application/rss+xml, application/xml, text/xml" },
      next: { revalidate: ARCHIVE_REVALIDATE_SECONDS, tags: ["handoff-archive"] },
    });
    if (xml == null) return [];
    return selectRssItems(parseRss(xml), now);
  }

  const key = input.env.BEEHIIV_API_KEY?.trim() ?? "";
  const publicationId = input.env.BEEHIIV_PUBLICATION_ID?.trim() ?? "";
  if (!key || !publicationId || /[\r\n]/.test(key) || !/^pub_[0-9a-f-]{8,}$/i.test(publicationId)) {
    return [];
  }

  const posts = await fetchApiPosts(fetchImpl, key, publicationId);
  if (!posts) return [];
  return selectApiPosts(posts, now);
}

function shortPreview(...candidates: string[]): string {
  for (const candidate of candidates) {
    const plain = plainText(candidate);
    if (!plain) continue;
    if (plain.length <= PREVIEW_LIMIT) return plain;
    const sliced = plain.slice(0, PREVIEW_LIMIT);
    const lastSpace = sliced.lastIndexOf(" ");
    const cut = (lastSpace > 120 ? sliced.slice(0, lastSpace) : sliced).trim();
    return `${cut}...`;
  }
  return "";
}

function firstBlockedLink(raw: string): string | null {
  const found = new Set<string>();
  const attr = /(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;
  for (const match of raw.matchAll(attr)) {
    const value = match[1] ?? match[2] ?? match[3] ?? "";
    if (value) found.add(value);
  }
  const bare = /https?:\/\/[^\s"'<>)]+/gi;
  for (const match of raw.matchAll(bare)) found.add(match[0]);
  for (const value of found) {
    const reason = siteLinkReason(value);
    if (reason) return reason;
  }
  return null;
}

function siteLinkReason(raw: string): string | null {
  const decoded = decodeEntities(raw).trim().replace(/[),.;]+$/g, "");
  if (!decoded) return null;
  let url: URL;
  try {
    url = decoded.startsWith("//") ? new URL(`https:${decoded}`) : new URL(decoded);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  if (!isBackfieldHost(host)) return null;
  let path = url.pathname;
  try {
    path = decodeURIComponent(url.pathname);
  } catch {
    path = url.pathname;
  }
  const haystack = `${path}${url.search}`.toLowerCase();
  if (haystack.includes(".pdf")) return "link:pdf";
  if (/one[-_ ]?pager/i.test(haystack)) return "link:one-pager";
  if (/\/fund1(?:\/|$|\?|#|&)/i.test(haystack)) return "link:fund1";
  return null;
}

function withArchiveUtm(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  url.searchParams.set("utm_source", "site");
  url.searchParams.set("utm_medium", "handoff-archive");
  return url.toString();
}

function dedupeNewestFirst(issues: ArchiveIssue[]): ArchiveIssue[] {
  const sorted = [...issues].sort((a, b) => b.publishedAt - a.publishedAt);
  const seen = new Set<string>();
  const out: ArchiveIssue[] = [];
  for (const issue of sorted) {
    if (seen.has(issue.id)) continue;
    seen.add(issue.id);
    out.push(issue);
  }
  return out;
}

function hostnameOf(host: string | null | undefined): string | null {
  if (!host) return null;
  const first = host.split(",")[0]?.trim().toLowerCase();
  if (!first) return null;
  try {
    return new URL(`http://${first}`).hostname;
  } catch {
    return null;
  }
}

function isBackfieldHost(hostname: string): boolean {
  return hostname === "backfieldventures.com" || hostname.endsWith(".backfieldventures.com");
}

function allowedRssUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (host !== "rss.beehiiv.com" && !host.endsWith(".beehiiv.com")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function fetchText(
  fetchImpl: ArchiveFetch,
  url: string,
  init: RequestInit & { next?: { revalidate?: number; tags?: string[] } },
): Promise<string | null> {
  try {
    const response = await fetchImpl(url, init);
    if (response.status !== 200) return null;
    const text = await response.text();
    if (text.length > MAX_RSS_CHARS) return null;
    return text;
  } catch {
    return null;
  }
}

async function fetchApiPosts(
  fetchImpl: ArchiveFetch,
  key: string,
  publicationId: string,
): Promise<BeehiivPost[] | null> {
  const posts: BeehiivPost[] = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages && page <= MAX_PAGES) {
    const params = new URLSearchParams({
      status: "confirmed",
      audience: "free",
      platform: "all",
      hidden_from_feed: "false",
      order_by: "publish_date",
      direction: "desc",
      limit: String(PAGE_LIMIT),
      page: String(page),
    });
    params.append("expand[]", "free_web_content");
    const url = `https://api.beehiiv.com/v2/publications/${encodeURIComponent(publicationId)}/posts?${params}`;
    let response: Response;
    try {
      response = await fetchImpl(url, {
        headers: {
          Authorization: `Bearer ${key}`,
          Accept: "application/json",
        },
        next: { revalidate: ARCHIVE_REVALIDATE_SECONDS, tags: ["handoff-archive"] },
      });
    } catch {
      return null;
    }
    if (response.status !== 200) return null;
    let body: { data?: unknown; total_pages?: number };
    try {
      body = (await response.json()) as { data?: unknown; total_pages?: number };
    } catch {
      return null;
    }
    if (!Array.isArray(body.data)) return null;
    posts.push(...(body.data as BeehiivPost[]));
    const reported = body.total_pages;
    totalPages = typeof reported === "number" && reported >= 1 ? Math.min(reported, MAX_PAGES) : 1;
    if (body.data.length < PAGE_LIMIT) break;
    page += 1;
  }
  return posts;
}

function readTag(block: string, tag: string): string {
  const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i");
  const match = block.match(pattern);
  return match ? match[1].trim() : "";
}

function readLink(block: string): string {
  const tagged = readTag(block, "link");
  if (tagged.trim()) return unwrapCdata(tagged);
  const attr = block.match(/<link\b[^>]*\bhref\s*=\s*["']([^"']+)["']/i);
  return attr ? attr[1] : "";
}

function unwrapCdata(value: string): string {
  const match = value.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/);
  return match ? match[1] : value;
}

function decodeEntities(value: string): string {
  const named = value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;|&#0*160;|&#x0*a0;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#0*39;/gi, "'");
  return named
    .replace(/&#(\d+);/g, (original, digits: string) => fromCodePoint(original, Number(digits)))
    .replace(/&#x([0-9a-f]+);/gi, (original, hex: string) => fromCodePoint(original, Number.parseInt(hex, 16)));
}

function fromCodePoint(original: string, code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return original;
  try {
    return String.fromCodePoint(code);
  } catch {
    return original;
  }
}
