import assert from "node:assert/strict";
import test from "node:test";
import { postFromRow, sourceForRow } from "./inspo/apify";
import { applyInspoOp, EMPTY_INSPO, mergePosts, sourceFromInput } from "./inspo/book";
import { feedTitle, parseFeed, plainText } from "./inspo/feed";
import { refreshInspo } from "./inspo/run";
import type { InspoBook, InspoPost } from "./inspo/types";

const RSS = `<?xml version="1.0"?><rss><channel><title>Some &amp; Pod</title>
<item><title><![CDATA[Episode <b>one</b>]]></title><link>https://ex.com/1</link><pubDate>Mon, 09 Nov 2026 13:00:00 GMT</pubDate><description>&lt;p&gt;Hello &amp;amp; welcome&lt;/p&gt;</description></item>
<item><title>Two</title><guid>https://ex.com/2</guid><pubDate>bad date</pubDate><content:encoded><![CDATA[<p>Body</p><script>x()</script>]]></content:encoded></item>
</channel></rss>`;

const ATOM = `<feed><title>Blog</title><entry><title>Atom post</title><link rel="self" href="https://ex.com/self"/><link rel="alternate" href="https://ex.com/post"/><published>2026-11-08T10:00:00Z</published><summary>Short</summary></entry></feed>`;

test("parseFeed reads RSS and Atom: titles, links, dates and plain text", () => {
  const rss = parseFeed(RSS);
  assert.equal(rss.length, 2);
  assert.equal(rss[0].title, "Episode one");
  assert.equal(rss[0].link, "https://ex.com/1");
  assert.equal(rss[0].at, "2026-11-09T13:00:00.000Z");
  assert.equal(rss[0].text, "Hello & welcome");
  assert.equal(rss[1].link, "https://ex.com/2");
  assert.equal(rss[1].at, null);
  assert.equal(rss[1].text, "Body");
  assert.equal(feedTitle(RSS), "Some & Pod");
  const atom = parseFeed(ATOM);
  assert.deepEqual(atom.map((i) => [i.title, i.link, i.at]), [["Atom post", "https://ex.com/post", "2026-11-08T10:00:00.000Z"]]);
  assert.equal(plainText("a<br>b &rsquo; c"), "a\nb ’ c");
});

test("sourceFromInput tells feeds, LinkedIn profiles and X handles apart", () => {
  const x = sourceFromInput("", "https://x.com/HarryStebbings");
  assert.ok(x.ok && x.source.kind === "x" && x.source.url === "HarryStebbings" && x.source.name === "@HarryStebbings");
  const at = sourceFromInput("Elizabeth", "@dunkhippo33");
  assert.ok(at.ok && at.source.kind === "x" && at.source.name === "Elizabeth");
  const li = sourceFromInput("", "linkedin.com/in/someone/");
  assert.ok(li.ok && li.source.kind === "linkedin" && li.source.url === "https://linkedin.com/in/someone/" && li.source.name === "someone");
  const feed = sourceFromInput("", "https://www.notboring.co/feed");
  assert.ok(feed.ok && feed.source.kind === "feed" && feed.source.name === "notboring.co");
  assert.equal(sourceFromInput("", "just words").ok, false);
});

test("applyInspoOp adds once, refuses duplicates, and removing someone drops their posts", () => {
  const book: InspoBook = { ...EMPTY_INSPO, sources: [], posts: [] };
  const added = applyInspoOp(book, { op: "add_source", url: "@a16z" });
  assert.ok(added.ok);
  assert.equal(applyInspoOp(added.book, { op: "add_source", url: "https://twitter.com/a16z" }).ok, false);
  const id = added.book.sources[0].id;
  const withPost = { ...added.book, posts: [{ id: "p", source_id: id } as InspoPost], status: { [id]: { at: "", ok: true, note: "" } } };
  const removed = applyInspoOp(withPost, { op: "remove_source", id });
  assert.ok(removed.ok && removed.book.sources.length === 0 && removed.book.posts.length === 0 && !(id in removed.book.status));
});

test("mergePosts dedupes, sorts newest first and drops posts older than 60 days", () => {
  const now = new Date("2026-11-10T00:00:00Z");
  const post = (id: string, at: string) => ({ id, at }) as InspoPost;
  const out = mergePosts([post("a", "2026-11-01T00:00:00Z"), post("old", "2026-08-01T00:00:00Z")], [post("b", "2026-11-05T00:00:00Z"), post("a", "2026-11-01T00:00:00Z")], now);
  assert.deepEqual(out.map((p) => p.id), ["b", "a"]);
});

test("postFromRow reads the common Apify shapes for LinkedIn and X", () => {
  const li = { id: "li", name: "Harry", kind: "linkedin" as const, url: "https://www.linkedin.com/in/harrystebbings/" };
  const post = postFromRow(li, { content: "First line\nmore", linkedinUrl: "https://lnkd/1", postedAt: { date: "2026-11-08T12:00:00Z" }, engagement: { likes: 1200, comments: 85 } });
  assert.ok(post);
  assert.equal(post.title, "First line");
  assert.equal(post.likes, 1200);
  assert.equal(post.comments, 85);
  const x = { id: "x", name: "a16z", kind: "x" as const, url: "a16z" };
  const tweet = postFromRow(x, { full_text: "Hot take", url: "https://x.com/a16z/status/1", createdAt: "Sun Nov 08 10:00:00 +0000 2026", likeCount: "3,400" });
  assert.ok(tweet && tweet.likes === 3400 && tweet.at === "2026-11-08T10:00:00.000Z");
  assert.equal(postFromRow(x, { full_text: "", createdAt: "x" }), null);
  const other = { id: "y", name: "Elizabeth", kind: "x" as const, url: "dunkhippo33" };
  assert.equal(sourceForRow([x, other], { author: { userName: "dunkhippo33" } })?.id, "y");
});

test("refreshInspo: a bad feed is noted and the rest still load; LinkedIn and X wait for a key", async () => {
  const book: InspoBook = {
    ...EMPTY_INSPO,
    sources: [
      { id: "good", name: "Good", kind: "feed", url: "https://good/feed" },
      { id: "bad", name: "Bad", kind: "feed", url: "https://bad/feed" },
      { id: "li", name: "Li", kind: "linkedin", url: "https://linkedin.com/in/li" },
    ],
  };
  const result = await refreshInspo(book, { readFeed: async (url) => (url.includes("good") ? RSS : Promise.reject(new Error("The site answered 404."))), scrape: null, now: new Date("2026-11-10T00:00:00Z") });
  assert.equal(result.added, 2);
  assert.equal(result.failed, 2);
  assert.equal(result.book.status.good.ok, true);
  assert.equal(result.book.status.bad.note, "The site answered 404.");
  assert.match(result.book.status.li.note, /APIFY_TOKEN/);
  // The undated item takes the run's time, so it still sorts.
  assert.equal(result.book.posts[0].at, "2026-11-10T00:00:00.000Z");
});
