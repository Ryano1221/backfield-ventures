import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  ARCHIVE_HEADING,
  ARCHIVE_LINE,
  ARCHIVE_REVALIDATE_SECONDS,
  ARCHIVE_SUBHEADING,
  blockReason,
  fixtureActive,
  fixtureIssues,
  formatArchiveDate,
  loadArchiveIssues,
  parseRss,
  selectApiPosts,
  selectRssItems,
  type ArchiveEnv,
  type BeehiivPost,
} from "./handoff-archive.ts";

const NOW = Date.UTC(2026, 9, 28, 17, 0, 0);
const PUBLISHED = Math.floor(Date.UTC(2026, 9, 1, 17, 0, 0) / 1000);
const KEY = "test-key-not-a-secret";
const PUB = "pub_27af40f7-baec-4b64-a031-4d0a829fa734";
const RSS = "https://rss.beehiiv.com/feeds/example.xml";

function post(overrides: BeehiivPost = {}): BeehiivPost {
  return {
    id: "post_ok",
    title: "The Handoff, Issue 1: Bandit, norda and Ghia",
    subtitle: "A monthly note on early brands.",
    preview_text: "Standout sports and consumer brands.",
    status: "confirmed",
    platform: "both",
    audience: "free",
    hidden_from_feed: false,
    publish_date: PUBLISHED,
    web_url: "https://handoffbybackfield.beehiiv.com/p/issue-1",
    content: {
      free: {
        web: "<p>For investors who want the work. Not an investment offer.</p>",
      },
    },
    ...overrides,
  };
}

function guard(content: string, title = "A clean title", subtitle = "A clean subtitle") {
  return blockReason({ title, subtitle, preview: "", content });
}

describe("content guard", () => {
  it("drops the listed words as whole words, in any case", () => {
    assert.equal(guard("our fund"), "word:fund");
    assert.equal(guard("FUNDS"), "word:funds");
    assert.equal(guard("they raise a round"), "word:raise");
    assert.equal(guard("they are Raising"), "word:raising");
    assert.equal(guard("they raised"), "word:raised");
    assert.equal(guard("See Fund I notes"), "word:fund-i");
    assert.equal(guard("fund\u00a0i"), "word:fund-i");
    assert.equal(guard("<!-- fund --> hidden"), "word:fund");
    assert.equal(guard("<p>We will <b>raise</b> soon</p>"), "word:raise");
    assert.equal(guard("&#102;und"), "word:fund");
  });

  it("keeps words that only look related", () => {
    assert.equal(guard("profound research"), null);
    assert.equal(guard("fundraising notes"), null);
    assert.equal(guard("prefunded and funding"), null);
    assert.equal(guard("the brand raises awareness"), null);
    assert.equal(guard("For investors who want the work. Not an investment offer."), null);
  });

  it("drops pdf, one-pager, and /fund1 links on backfieldventures.com only", () => {
    assert.equal(
      guard('<a href="https://www.backfieldventures.com/files/Deck.PDF">read</a>'),
      "link:pdf",
    );
    assert.equal(
      guard('<a href="https://backfieldventures.com/brand/one-pager">read</a>'),
      "link:one-pager",
    );
    assert.equal(
      guard(`<a href="https://backfieldventures.com/one%20pager">read</a>`),
      "link:one-pager",
    );
    assert.equal(
      guard('<img src="https://cdn.backfieldventures.com/fund1/cover.png" alt="">'),
      "link:fund1",
    );
    assert.equal(guard('<a href="https://backfieldventures.com/fund1">read</a>'), "link:fund1");
    assert.equal(guard("https://news.backfieldventures.com/fund1/overview"), "link:fund1");
    assert.equal(guard('<a href="https://example.com/one-pager.pdf">read</a>'), null);
    assert.equal(guard('<a href="https://backfieldventures.com/about">read</a>'), null);
    assert.equal(guard('<a href="https://backfieldventures.com/fund10">read</a>'), null);
    assert.equal(guard('<a href="https://notbackfieldventures.com/fund1.pdf">read</a>'), null);
  });

  it("logs only an id and a reason code", () => {
    const calls: unknown[][] = [];
    const original = console.warn;
    console.warn = (...args: unknown[]) => {
      calls.push(args);
    };
    try {
      selectApiPosts([post({ id: "post_secret", title: "The secret fund story" })], NOW);
    } finally {
      console.warn = original;
    }
    assert.deepEqual(calls, [["handoff-archive: dropped", { id: "post_secret", reason: "word:fund" }]]);
    assert.equal(JSON.stringify(calls).includes("secret fund"), false);
  });
});

describe("api post filter", () => {
  it("keeps a sent, web-visible, free, visible post", () => {
    const kept = selectApiPosts([post(), post({ id: "web_only", platform: "web" })], NOW);
    assert.deepEqual(
      kept.map((issue) => issue.id),
      ["post_ok", "web_only"],
    );
    assert.equal(kept[0]?.preview, "A monthly note on early brands.");
    assert.equal(kept[0]?.title, "The Handoff, Issue 1: Bandit, norda and Ghia");
    assert.match(kept[0]?.url ?? "", /utm_source=site/);
    assert.match(kept[0]?.url ?? "", /utm_medium=handoff-archive/);
  });

  it("drops drafts, email-only, premium, hidden, future, and untitled posts", () => {
    const future = Math.floor(NOW / 1000) + 60 * 60;
    const soon = Math.floor(NOW / 1000) + 60;
    const issues = selectApiPosts(
      [
        post({ id: "draft", status: "draft" }),
        post({ id: "archived", status: "archived" }),
        post({ id: "email", platform: "email" }),
        post({ id: "premium", audience: "premium" }),
        post({ id: "both_audience", audience: "both" }),
        post({ id: "hidden", hidden_from_feed: true }),
        post({ id: "missing_hidden", hidden_from_feed: undefined }),
        post({ id: "future", publish_date: future }),
        post({ id: "soon", publish_date: soon }),
        post({ id: "no_url", web_url: "" }),
        post({ id: "bad_url", web_url: "javascript:alert(1)" }),
        post({ id: "blank_title", title: "   " }),
        post({ id: "body_link", content: { free: { web: '<a href="https://backfieldventures.com/fund1">x</a>' } } }),
        post({ id: "preview_word", preview_text: "They raised a round" }),
      ],
      NOW,
      () => {},
    );
    assert.deepEqual(
      issues.map((issue) => issue.id),
      ["soon"],
    );
  });

  it("sorts newest first and prefers the subtitle over preview text", () => {
    const issues = selectApiPosts(
      [
        post({ id: "older", publish_date: PUBLISHED - 86_400, subtitle: "" }),
        post({ id: "newer", publish_date: PUBLISHED }),
      ],
      NOW,
    );
    assert.deepEqual(
      issues.map((issue) => issue.id),
      ["newer", "older"],
    );
    assert.equal(issues[1]?.preview, "Standout sports and consumer brands.");
  });
});

describe("rss", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
      <channel>
        <title>The Handoff</title>
        <item>
          <title><![CDATA[Older note]]></title>
          <link>https://handoffbybackfield.beehiiv.com/p/older</link>
          <description><![CDATA[Older subtitle]]></description>
          <pubDate>Wed, 01 Sep 2026 17:00:00 GMT</pubDate>
          <guid isPermaLink="false">post_older</guid>
          <content:encoded><![CDATA[<p>Hello brands.</p>]]></content:encoded>
        </item>
        <item>
          <title><![CDATA[Newer note]]></title>
          <link>https://handoffbybackfield.beehiiv.com/p/newer</link>
          <description><![CDATA[Newer subtitle]]></description>
          <pubDate>Wed, 07 Oct 2026 17:00:00 GMT</pubDate>
          <guid>post_newer</guid>
          <content:encoded><![CDATA[<p>Still clean.</p>]]></content:encoded>
        </item>
        <item>
          <title>Future note</title>
          <link>https://handoffbybackfield.beehiiv.com/p/future</link>
          <description>Not out yet</description>
          <pubDate>Wed, 01 Dec 2026 17:00:00 GMT</pubDate>
          <guid>post_future</guid>
        </item>
        <item>
          <title>Blocked note</title>
          <link>https://handoffbybackfield.beehiiv.com/p/blocked</link>
          <description>Looks fine</description>
          <pubDate>Wed, 02 Sep 2026 17:00:00 GMT</pubDate>
          <guid>post_blocked</guid>
          <content:encoded><![CDATA[<a href="https://backfieldventures.com/brand/one-pager.pdf">deck</a>]]></content:encoded>
        </item>
      </channel>
    </rss>`;

  it("parses items and keeps published posts that pass the guard, newest first", () => {
    const dropped: { id: string; reason: string }[] = [];
    const issues = selectRssItems(parseRss(xml), NOW, (entry) => dropped.push(entry));
    assert.deepEqual(
      issues.map((issue) => [issue.id, issue.title, issue.preview]),
      [
        ["post_newer", "Newer note", "Newer subtitle"],
        ["post_older", "Older note", "Older subtitle"],
      ],
    );
    assert.deepEqual(dropped, [{ id: "post_blocked", reason: "link:pdf" }]);
    assert.equal(formatArchiveDate(issues[0]!.publishedAt), "October 7, 2026");
  });
});

describe("fixture gate", () => {
  const preview: ArchiveEnv = { VERCEL_ENV: "preview", HANDOFF_ARCHIVE_FIXTURE: "1" };

  it("is on only for a preview deployment flag plus a non-production host", () => {
    assert.equal(fixtureActive(preview, "backfield-ventures-git-branch.vercel.app"), true);
    assert.equal(fixtureActive(preview, "localhost:3000"), true);
    assert.equal(fixtureActive(preview, "www.backfieldventures.com"), false);
    assert.equal(fixtureActive(preview, "handoff.backfieldventures.com"), false);
    assert.equal(fixtureActive(preview, null), false);
    assert.equal(fixtureActive({ ...preview, HANDOFF_ARCHIVE_FIXTURE: "true" }, "localhost"), false);
    assert.equal(fixtureActive({ ...preview, VERCEL_ENV: "production" }, "app.vercel.app"), false);
    assert.equal(fixtureActive({ ...preview, VERCEL_ENV: "development" }, "localhost"), false);
  });

  it("renders three fake sample issues, newest first", () => {
    const issues = fixtureIssues();
    assert.deepEqual(
      issues.map((issue) => issue.title),
      ["Sample issue 1", "Sample issue 2", "Sample issue 3"],
    );
    assert.deepEqual(
      issues.map((issue) => formatArchiveDate(issue.publishedAt)),
      ["October 7, 2026", "September 2, 2026", "August 4, 2026"],
    );
    for (const issue of issues) {
      assert.equal(
        blockReason({ title: issue.title, subtitle: issue.preview, preview: "", content: "" }),
        null,
      );
      assert.match(issue.url, /^https:\/\/handoffbybackfield\.beehiiv\.com\/p\/sample-issue-[123]/);
    }
  });
});

describe("loadArchiveIssues", () => {
  it("returns nothing when env is missing or the fetch fails", async () => {
    const calls: string[] = [];
    const fetchImpl = async (url: string) => {
      calls.push(url);
      throw new Error("down");
    };
    assert.deepEqual(await loadArchiveIssues({ env: {}, host: null, now: NOW, fetchImpl }), []);
    assert.deepEqual(
      await loadArchiveIssues({
        env: { BEEHIIV_RSS_URL: RSS },
        host: null,
        now: NOW,
        fetchImpl,
      }),
      [],
    );
    assert.deepEqual(
      await loadArchiveIssues({
        env: { BEEHIIV_API_KEY: KEY, BEEHIIV_PUBLICATION_ID: PUB },
        host: "backfieldventures.com",
        now: NOW,
        fetchImpl,
      }),
      [],
    );
    assert.equal(calls.length, 2);
  });

  it("uses the rss url and does not call the api when both are set", async () => {
    const urls: string[] = [];
    const issues = await loadArchiveIssues({
      env: { BEEHIIV_RSS_URL: RSS, BEEHIIV_API_KEY: KEY, BEEHIIV_PUBLICATION_ID: PUB },
      host: null,
      now: NOW,
      fetchImpl: async (url, init) => {
        urls.push(url);
        assert.equal((init?.next as { revalidate?: number } | undefined)?.revalidate, 3600);
        return new Response(
          `<rss><channel><item><title>From the feed</title><link>https://handoffbybackfield.beehiiv.com/p/feed</link><description>Feed subtitle</description><pubDate>Wed, 07 Oct 2026 17:00:00 GMT</pubDate><guid>post_feed</guid></item></channel></rss>`,
          { status: 200 },
        );
      },
    });
    assert.deepEqual(urls, [RSS]);
    assert.equal(issues[0]?.title, "From the feed");
    assert.equal(ARCHIVE_REVALIDATE_SECONDS, 3600);
  });

  it("treats an unusable rss url as empty instead of falling through to the api", async () => {
    let called = false;
    const issues = await loadArchiveIssues({
      env: {
        BEEHIIV_RSS_URL: "http://rss.beehiiv.com/feeds/example.xml",
        BEEHIIV_API_KEY: KEY,
        BEEHIIV_PUBLICATION_ID: PUB,
      },
      host: null,
      now: NOW,
      fetchImpl: async () => {
        called = true;
        return new Response("", { status: 500 });
      },
    });
    assert.equal(called, false);
    assert.deepEqual(issues, []);
  });

  it("calls the posts api without putting the key in the url", async () => {
    const seen: { url: string; authorization: string }[] = [];
    const issues = await loadArchiveIssues({
      env: { BEEHIIV_API_KEY: KEY, BEEHIIV_PUBLICATION_ID: PUB },
      host: null,
      now: NOW,
      fetchImpl: async (url, init) => {
        const headers = new Headers(init?.headers);
        seen.push({ url, authorization: headers.get("authorization") ?? "" });
        if (url.includes("page=2")) {
          return Response.json({
            data: [post({ id: "post_page_2", publish_date: PUBLISHED + 10 })],
            total_pages: 2,
          });
        }
        return Response.json({
          data: Array.from({ length: 100 }, (_, index) =>
            post({
              id: index === 0 ? "post_page_1" : `filler_${index}`,
              publish_date: PUBLISHED - index,
            }),
          ),
          total_pages: 2,
        });
      },
    });
    assert.equal(seen.length, 2);
    assert.equal(seen[0]?.authorization, `Bearer ${KEY}`);
    assert.equal(seen[0]?.url.includes(KEY), false);
    assert.match(seen[0]?.url ?? "", new RegExp(`publications/${PUB}/posts`));
    assert.match(seen[0]?.url ?? "", /status=confirmed/);
    assert.match(seen[0]?.url ?? "", /audience=free/);
    assert.match(seen[0]?.url ?? "", /platform=all/);
    assert.match(seen[0]?.url ?? "", /hidden_from_feed=false/);
    assert.match(seen[0]?.url ?? "", /expand(?:%5B%5D|\[\])=free_web_content/);
    assert.equal(issues[0]?.id, "post_page_2");
  });

  it("treats a 202 render and a non-200 as an empty archive", async () => {
    for (const status of [202, 401, 500]) {
      const issues = await loadArchiveIssues({
        env: { BEEHIIV_API_KEY: KEY, BEEHIIV_PUBLICATION_ID: PUB },
        host: null,
        now: NOW,
        fetchImpl: async () => new Response("nope", { status }),
      });
      assert.deepEqual(issues, []);
    }
  });

  it("shows samples only on an allowed preview host, and never instead of a failed production fetch", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return new Response("nope", { status: 500 });
    };
    const samples = await loadArchiveIssues({
      env: { VERCEL_ENV: "preview", HANDOFF_ARCHIVE_FIXTURE: "1", BEEHIIV_RSS_URL: RSS },
      host: "preview.vercel.app",
      now: NOW,
      fetchImpl,
    });
    assert.deepEqual(
      samples.map((issue) => issue.title),
      ["Sample issue 1", "Sample issue 2", "Sample issue 3"],
    );
    assert.equal(calls, 0);

    const production = await loadArchiveIssues({
      env: { VERCEL_ENV: "production", HANDOFF_ARCHIVE_FIXTURE: "1", BEEHIIV_RSS_URL: RSS },
      host: "backfield-ventures.vercel.app",
      now: NOW,
      fetchImpl,
    });
    assert.deepEqual(production, []);
    assert.equal(calls, 1);

    const aliased = await loadArchiveIssues({
      env: { VERCEL_ENV: "preview", HANDOFF_ARCHIVE_FIXTURE: "1" },
      host: "backfieldventures.com",
      now: NOW,
      fetchImpl,
    });
    assert.deepEqual(aliased, []);
  });
});

describe("copy", () => {
  it("locks the archive lines and the handoff disclaimer", () => {
    assert.equal(ARCHIVE_HEADING, "Past issues");
    assert.equal(ARCHIVE_SUBHEADING, "Read earlier issues");
    assert.equal(ARCHIVE_LINE, "Every Handoff I've sent, newest first.");
    for (const line of [ARCHIVE_HEADING, ARCHIVE_SUBHEADING, ARCHIVE_LINE]) {
      assert.equal(line.includes("\u2014"), false);
      assert.equal(line.includes("\u2013"), false);
    }

    const page = readFileSync("src/app/handoff/page.tsx", "utf8");
    assert.match(page, /Brands I think are impressive\. Not an investment offer\./);
    assert.equal(page.includes("Brands we think are impressive."), false);

    const component = readFileSync("src/components/handoff/HandoffArchive.tsx", "utf8");
    assert.match(component, /\{ARCHIVE_HEADING\}/);
    assert.match(component, /\{ARCHIVE_SUBHEADING\}/);
    assert.match(component, /\{ARCHIVE_LINE\}/);
    assert.equal(component.includes("Read the back issues"), false);
    assert.equal(component.includes("\u2014") || component.includes("\u2013"), false);

    const css = readFileSync("src/app/handoff/handoff.module.css", "utf8");
    const archiveCss = css.slice(css.indexOf(".archive {"));
    const colors = archiveCss.match(/#[0-9a-fA-F]{3,8}/g) ?? [];
    assert.deepEqual(
      [...new Set(colors.map((color) => color.toLowerCase()))].sort(),
      ["#f0ede8", "#fff"],
    );
    assert.equal(archiveCss.includes("#c8b89a"), false);
  });
});
