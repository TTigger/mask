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

// --- subtitle-language selection (pure; unit-tested offline) ---

export interface SubtitleTracks {
  /** Human-authored subtitle track codes (yt-dlp `subtitles`). */
  manual: string[];
  /** Auto-caption track codes (yt-dlp `automatic_captions`), incl. translations. */
  auto: string[];
  /** The video's original language (yt-dlp `language`), if known. */
  original?: string | null;
}

/**
 * Infer the source language of a video's auto-captions. YouTube exposes machine
 * translations keyed `<target>-<source>` (e.g. `en-zh-TW`) alongside the
 * original track keyed by the bare source (`zh-TW`). The source therefore shows
 * up as the shared "after the first hyphen" suffix across translations *and* as
 * a standalone track — that standalone key is the original.
 */
function inferOriginalAuto(auto: string[]): string | null {
  if (!auto.length) return null;
  const counts = new Map<string, number>();
  for (const code of auto) {
    const i = code.indexOf("-");
    if (i > 0) {
      const source = code.slice(i + 1);
      counts.set(source, (counts.get(source) ?? 0) + 1);
    }
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [source, n] of counts) {
    if (auto.includes(source) && n > bestN) {
      best = source;
      bestN = n;
    }
  }
  // A lone auto track (e.g. an English-only video listing just `en`) is itself the original.
  if (!best && auto.length === 1) return auto[0]!;
  return best;
}

/**
 * Choose which subtitle track to download, preferring (in order): an explicit
 * `prefer` override, the video's original language (manual track first), any
 * human-authored track, then the original auto-caption track. Machine-translated
 * auto tracks (keyed `<target>-<source>`, e.g. `en-zh-TW`) are avoided so a
 * Chinese lecture is not distilled from its English auto-translation. Returns
 * null when no track can be confidently chosen (the caller skips the video).
 */
export function pickSubtitleLang(tracks: SubtitleTracks, prefer?: string | null): string | null {
  // 1. explicit override — passed through verbatim so comma lists / `zh.*`
  //    wildcards still reach yt-dlp's --sub-langs.
  if (prefer && prefer.trim()) return prefer.trim();

  const manual = tracks.manual ?? [];
  const auto = tracks.auto ?? [];
  const original = tracks.original?.trim() || null;

  // 2. original language — human-authored track first, then the auto one.
  if (original && manual.includes(original)) return original;
  if (original && auto.includes(original)) return original;

  // 3. any human-authored track (manual subs are never machine translations).
  if (manual.length) return manual[0]!;

  // 4. the original auto-caption track (never a translation).
  return inferOriginalAuto(auto);
}

// --- default provider (yt-dlp), exercised live; tests inject a fake ---

import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCapture } from "../../src/lib/proc.ts";

async function runYtDlp(args: string[]): Promise<string> {
  return runCapture(["yt-dlp", ...args]);
}

/** Probe a single video's available subtitle tracks + original language. */
async function listSubtitleTracks(url: string): Promise<SubtitleTracks> {
  try {
    const info = JSON.parse(await runYtDlp(["-J", "--skip-download", "--no-warnings", url]));
    return {
      manual: Object.keys(info.subtitles ?? {}),
      auto: Object.keys(info.automatic_captions ?? {}),
      original: typeof info.language === "string" ? info.language : null,
    };
  } catch {
    return { manual: [], auto: [], original: null };
  }
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
    // Auto-detect the caption language: probe the video's tracks and pick the
    // original (not a machine translation). MASK_YT_SUBLANGS overrides it with
    // an explicit yt-dlp --sub-langs expression when the user wants a specific
    // language (e.g. an English auto-translation).
    const prefer = process.env.MASK_YT_SUBLANGS ?? null;
    const lang = pickSubtitleLang(await listSubtitleTracks(video.url), prefer);
    if (!lang) return null;

    const dir = await mkdtemp(join(tmpdir(), "mask-yt-"));
    try {
      await runYtDlp([
        "--skip-download",
        "--write-subs",
        "--write-auto-subs",
        "--sub-langs",
        lang,
        "--sub-format",
        "vtt",
        "--no-warnings",
        "-o",
        join(dir, "%(id)s.%(ext)s"),
        video.url,
      ]);
      // Deterministic pick: the chosen lang's file (strip a trailing `.*`
      // wildcard from an override), else the first available .vtt.
      const files = (await readdir(dir)).filter((f) => f.endsWith(".vtt")).sort();
      if (!files.length) return null;
      const primary = lang.split(",")[0]!.replace(/\.\*$/, "");
      const pick = files.find((f) => f.endsWith(`.${primary}.vtt`)) ?? files[0]!;
      return await readFile(join(dir, pick), "utf8");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  },
};
