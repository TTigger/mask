import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import type { Sample } from "../../src/lib/digest.ts";

/** Fetch a URL's body as text. Injectable so tests run offline. */
export type Fetcher = (url: string) => Promise<string>;

export interface IngestBlogOptions {
  urls: string[];
  limit?: number;
  fetcher?: Fetcher;
  /** Minimum extracted length to keep a post (drops nav/stub pages). */
  minChars?: number;
}

const DEFAULT_LIMIT = 20;
const DEFAULT_MIN_CHARS = 200;

async function defaultFetch(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": "mask/0.1 (+https://github.com/mask)" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`fetch ${url}: HTTP ${res.status}`);
  return res.text();
}

/** Heuristic: is this an RSS/Atom/RDF feed rather than an article page? */
export function isFeed(text: string): boolean {
  const head = text.slice(0, 1000).toLowerCase();
  return head.includes("<rss") || head.includes("<feed") || head.includes("<rdf:rdf");
}

/** Extract entry/article links from an RSS/Atom/RDF feed, in document order. */
export function parseFeedLinks(xml: string, limit = DEFAULT_LIMIT): string[] {
  const links: string[] = [];

  // RSS / RDF: <item> … <link>URL</link>
  for (const m of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)) {
    const link = m[0].match(/<link[^>]*>([^<]+)<\/link>/i);
    if (link?.[1]) links.push(link[1].trim());
  }
  // Atom: <entry> … <link href="URL" …/> (single- or double-quoted)
  for (const m of xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi)) {
    const link = m[0].match(/<link[^>]*href=(["'])([^"']+)\1[^>]*\/?>/i);
    if (link?.[2]) links.push(link[2].trim());
  }

  return [...new Set(links)].slice(0, limit);
}

/** Readability extraction of an article's title + plain text. */
export function extractArticle(
  html: string,
  url: string,
): { title: string; text: string } | null {
  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();
  if (!article) return null;
  return { title: (article.title ?? "").trim(), text: (article.textContent ?? "").trim() };
}

/**
 * Ingest one or more blog URLs into normalized samples. A feed URL is expanded
 * into its entries; any other URL is treated as a single article. Returns
 * samples with stable sequential ids (b1, b2, …).
 */
export async function ingestBlog(opts: IngestBlogOptions): Promise<Sample[]> {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const minChars = opts.minChars ?? DEFAULT_MIN_CHARS;
  const fetcher = opts.fetcher ?? defaultFetch;

  // Resolve the input URLs into a concrete list of article URLs. A direct
  // article body is cached here so it isn't fetched again below.
  const articleUrls: string[] = [];
  const bodies = new Map<string, string>();
  for (const url of opts.urls) {
    let body: string;
    try {
      body = await fetcher(url);
    } catch {
      continue; // skip unreachable inputs
    }
    if (isFeed(body)) articleUrls.push(...parseFeedLinks(body, limit));
    else {
      articleUrls.push(url);
      bodies.set(url, body);
    }
  }
  const unique = [...new Set(articleUrls)].slice(0, limit);

  const samples: Sample[] = [];
  for (const url of unique) {
    let html = bodies.get(url);
    if (html === undefined) {
      try {
        html = await fetcher(url);
      } catch {
        continue; // skip unreachable posts; coverage is reported by the caller
      }
    }
    const article = extractArticle(html, url);
    if (!article || article.text.length < minChars) continue;
    samples.push({
      id: `b${samples.length + 1}`,
      src_ref: { url, title: article.title || undefined },
      text: article.text,
    });
  }
  return samples;
}
