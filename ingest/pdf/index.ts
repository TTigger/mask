import type { Sample } from "../../src/lib/digest.ts";

/**
 * PDF / book ingest. Text comes from the injectable extractor (default: shell
 * out to `pdftotext`, like the youtube/repo modules shell out to yt-dlp/git),
 * split into page samples on the form-feed page breaks pdftotext emits, and
 * normalized into samples with stable ids (p1, p2, …). Large books reduce via
 * breadth sampling; a book too big for one context goes through `mask scale`.
 */

/** Extract a PDF's full text (with `\f` page breaks). Injectable for offline tests. */
export type PdfTextExtractor = (path: string) => Promise<string>;

export interface IngestPdfOptions {
  source: string;
  limit?: number;
  extractor?: PdfTextExtractor;
  /** Minimum extracted length to keep a page (drops blank/cover pages). */
  minChars?: number;
}

const DEFAULT_LIMIT = 200;
const DEFAULT_MIN_CHARS = 200;

/** Split extracted text into pages on form-feed; trims and drops empty pages. */
export function splitPages(text: string): string[] {
  return text
    .split("\f")
    .map((p) => p.replace(/[ \t]+\n/g, "\n").trim())
    .filter(Boolean);
}

export async function ingestPdf(opts: IngestPdfOptions): Promise<Sample[]> {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const minChars = opts.minChars ?? DEFAULT_MIN_CHARS;
  const extractor = opts.extractor ?? defaultExtractor;

  let raw: string;
  try {
    raw = await extractor(opts.source);
  } catch {
    return []; // unreadable PDF → no samples (caller reports the empty result)
  }

  // Split on form-feed without dropping blanks, so the index is the real page
  // number; thin/blank pages are skipped in the loop but don't shift numbering.
  const samples: Sample[] = [];
  const rawPages = raw.split("\f");
  for (let i = 0; i < rawPages.length && samples.length < limit; i++) {
    const text = rawPages[i]!.replace(/[ \t]+\n/g, "\n").trim();
    if (text.length < minChars) continue;
    const page = i + 1;
    samples.push({
      id: `p${samples.length + 1}`,
      src_ref: { url: `${opts.source}#page=${page}`, title: `page ${page}` },
      text,
    });
  }
  return samples;
}

/** Whether a source looks like a PDF (by extension, before any fetch/stat). */
export function isPdfSource(source: string): boolean {
  return /\.pdf(?:[?#]|$)/i.test(source);
}

// --- default extractor (pdftotext), exercised live; tests inject a fake ---

async function defaultExtractor(path: string): Promise<string> {
  const proc = Bun.spawn(["pdftotext", "-q", path, "-"], { stdout: "pipe", stderr: "pipe" });
  const [stdout, , code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) throw new Error(`pdftotext exited ${code} for ${path}`);
  return stdout;
}
