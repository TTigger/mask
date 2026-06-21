import type { Sample } from "../../src/lib/digest.ts";

/**
 * YouTube ingest. A channel/handle/playlist expands into videos; a watch URL is
 * a single video. Transcripts come from the injectable provider (default:
 * yt-dlp), are parsed out of WebVTT and lightly denoised, and normalized into
 * samples with stable ids (y1, y2, …). Heavier transcript cleanup and
 * large-channel sampling live in reduce (1.4).
 */

export interface YoutubeVideo {
  id: string;
  title: string;
  url: string;
}

/** Injectable so tests run offline; the default shells out to yt-dlp. */
export interface YoutubeProvider {
  /** List a channel/playlist's videos (most-recent first), up to `limit`. */
  listVideos(source: string, limit: number): Promise<YoutubeVideo[]>;
  /** Return a video's raw WebVTT transcript, or null if none is available. */
  fetchTranscript(video: YoutubeVideo): Promise<string | null>;
}

export interface IngestYoutubeOptions {
  source: string;
  limit?: number;
  provider?: YoutubeProvider;
  /** Minimum transcript length to keep a video (drops empty/near-empty subs). */
  minChars?: number;
}

const DEFAULT_LIMIT = 20;
const DEFAULT_MIN_CHARS = 400;

const WATCH_RE = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/;

/** Is this a single-video watch URL (vs a channel/handle/playlist)? */
export function isVideoUrl(url: string): boolean {
  return WATCH_RE.test(url);
}

export function videoIdFromUrl(url: string): string | null {
  return url.match(WATCH_RE)?.[1] ?? null;
}

/** Decode the handful of XML/HTML entities WebVTT cue text uses. */
function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&"); // last, so a decoded entity can't reintroduce another
}

/** Strip only WebVTT inline tags: `<00:00:00.000>` cues and `<c …>`/`</c>` styling. */
function stripVttTags(line: string): string {
  return line
    .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, "")
    .replace(/<\/?c[^>]*>/g, "");
}

/**
 * Parse plain text out of a WebVTT transcript: drop the header, cue timing
 * lines, and cue indices; strip inline timestamp/style tags (leaving literal
 * `<`/`>` in speech alone); decode entities; collapse whitespace; and drop
 * consecutive duplicate lines (YouTube's rolling captions repeat the previous
 * line). Returns one despaced string.
 */
export function parseVtt(vtt: string): string {
  const out: string[] = [];
  for (const raw of vtt.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line === "WEBVTT") continue;
    if (/^(Kind|Language|NOTE|STYLE|REGION)\b/i.test(line)) continue;
    if (line.includes("-->")) continue; // cue timing (with optional cue settings)
    if (/^\d+$/.test(line)) continue; // cue index

    const text = decodeEntities(stripVttTags(line)).replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (out.length && out[out.length - 1] === text) continue; // consecutive dup
    out.push(text);
  }
  return out.join(" ").replace(/\s+/g, " ").trim();
}

/** Resolve the input source into a concrete video list via the provider. */
async function resolveVideos(
  source: string,
  limit: number,
  provider: YoutubeProvider,
): Promise<YoutubeVideo[]> {
  if (isVideoUrl(source)) {
    const id = videoIdFromUrl(source)!;
    return [{ id, title: "", url: source }];
  }
  return (await provider.listVideos(source, limit)).slice(0, limit);
}

export async function ingestYoutube(opts: IngestYoutubeOptions): Promise<Sample[]> {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const minChars = opts.minChars ?? DEFAULT_MIN_CHARS;
  const provider = opts.provider ?? defaultProvider;

  const videos = await resolveVideos(opts.source, limit, provider);

  const samples: Sample[] = [];
  for (const video of videos) {
    let vtt: string | null;
    try {
      vtt = await provider.fetchTranscript(video);
    } catch {
      continue; // skip videos whose transcript can't be fetched
    }
    if (!vtt) continue;
    const text = parseVtt(vtt);
    if (text.length < minChars) continue;
    samples.push({
      id: `y${samples.length + 1}`,
      src_ref: { url: video.url, title: video.title || undefined },
      text,
    });
  }
  return samples;
}

// --- default provider (yt-dlp), exercised live; tests inject a fake ---

import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCapture } from "../../src/lib/proc.ts";

async function runYtDlp(args: string[]): Promise<string> {
  return runCapture(["yt-dlp", ...args]);
}

export const defaultProvider: YoutubeProvider = {
  async listVideos(source, limit) {
    const out = await runYtDlp([
      "--flat-playlist",
      "--no-warnings",
      "--playlist-end",
      String(limit),
      "--print",
      "%(id)s\t%(title)s",
      source,
    ]);
    return out
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const [id, ...rest] = line.split("\t");
        return { id: id!, title: rest.join("\t"), url: `https://www.youtube.com/watch?v=${id}` };
      });
  },

  async fetchTranscript(video) {
    const dir = await mkdtemp(join(tmpdir(), "mask-yt-"));
    try {
      await runYtDlp([
        "--skip-download",
        "--write-subs",
        "--write-auto-subs",
        "--sub-langs",
        "en.*",
        "--sub-format",
        "vtt",
        "--no-warnings",
        "-o",
        join(dir, "%(id)s.%(ext)s"),
        video.url,
      ]);
      // Deterministic pick: prefer a plain `.en.vtt` over regional/auto variants.
      const files = (await readdir(dir)).filter((f) => f.endsWith(".vtt")).sort();
      if (!files.length) return null;
      const pick = files.find((f) => /\.en\.vtt$/.test(f)) ?? files[0]!;
      return await readFile(join(dir, pick), "utf8");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  },
};
