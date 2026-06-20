import { expect, test } from "bun:test";
import { ingestBlog, isFeed, parseFeedLinks, extractArticle, type Fetcher } from "../ingest/blog/index.ts";

const FEED = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <title>Test Blog</title>
  <item><title>Post One</title><link>https://blog.test/one</link></item>
  <item><title>Post Two</title><link>https://blog.test/two</link></item>
</channel></rss>`;

const ATOM = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry><title>A</title><link href="https://blog.test/a" rel="alternate"/></entry>
  <entry><title>B</title><link href="https://blog.test/b"/></entry>
</feed>`;

function article(title: string, body: string): string {
  return `<!doctype html><html><head><title>${title}</title></head>
    <body><article><h1>${title}</h1><p>${body}</p></article></body></html>`;
}

const LONG = "This is a substantive paragraph about web development and opinionated takes. ".repeat(6);

function fakeFetcher(map: Record<string, string>): Fetcher {
  return async (url: string) => {
    if (!(url in map)) throw new Error(`404 ${url}`);
    return map[url]!;
  };
}

test("isFeed detects RSS and Atom", () => {
  expect(isFeed(FEED)).toBe(true);
  expect(isFeed(ATOM)).toBe(true);
  expect(isFeed(article("x", LONG))).toBe(false);
});

test("parseFeedLinks pulls RSS item links and Atom entry hrefs", () => {
  expect(parseFeedLinks(FEED)).toEqual(["https://blog.test/one", "https://blog.test/two"]);
  expect(parseFeedLinks(ATOM)).toEqual(["https://blog.test/a", "https://blog.test/b"]);
  expect(parseFeedLinks(FEED, 1)).toHaveLength(1);
});

test("extractArticle returns title + plain text", () => {
  const got = extractArticle(article("Hello World", LONG), "https://blog.test/one");
  expect(got).not.toBeNull();
  expect(got!.text).toContain("web development");
  expect(got!.text).not.toContain("<p>");
});

test("ingestBlog expands a feed and produces stable-id samples", async () => {
  const fetcher = fakeFetcher({
    "https://blog.test/feed": FEED,
    "https://blog.test/one": article("Post One", LONG),
    "https://blog.test/two": article("Post Two", LONG),
  });

  const samples = await ingestBlog({ urls: ["https://blog.test/feed"], fetcher });
  expect(samples.map((s) => s.id)).toEqual(["b1", "b2"]);
  expect(samples[0]!.src_ref.url).toBe("https://blog.test/one");
  expect(samples[0]!.text).toContain("web development");
});

test("ingestBlog treats a non-feed URL as a single article and skips thin/unreachable", async () => {
  const fetcher = fakeFetcher({
    "https://blog.test/one": article("Post One", LONG),
    "https://blog.test/thin": article("Thin", "too short"),
  });

  const ok = await ingestBlog({ urls: ["https://blog.test/one"], fetcher });
  expect(ok).toHaveLength(1);

  const thin = await ingestBlog({ urls: ["https://blog.test/thin"], fetcher });
  expect(thin).toHaveLength(0);

  const missing = await ingestBlog({ urls: ["https://blog.test/gone"], fetcher });
  expect(missing).toHaveLength(0);
});
