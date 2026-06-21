import { expect, test } from "bun:test";
import { ingestPdf, splitPages, isPdfSource, type PdfTextExtractor } from "../ingest/pdf/index.ts";
import { detectSourceKind } from "../src/lib/source.ts";

const LONG = "This is a substantive page of a book about ideas and prose. ".repeat(6);

function fakeExtractor(text: string): PdfTextExtractor {
  return async () => text;
}

test("isPdfSource / detectSourceKind recognize PDFs", () => {
  expect(isPdfSource("/books/voice.pdf")).toBe(true);
  expect(isPdfSource("https://x.com/a.pdf?dl=1")).toBe(true);
  expect(isPdfSource("/notes.txt")).toBe(false);
  expect(detectSourceKind("/books/voice.pdf")).toBe("book");
});

test("splitPages breaks on form feeds and drops blank pages", () => {
  expect(splitPages("one\f\f  two  \fthree")).toEqual(["one", "two", "three"]);
});

test("ingestPdf yields one sample per non-thin page with stable ids and page refs", async () => {
  const text = `${LONG}\f   \f${LONG}`; // page1, a blank page, page3
  const samples = await ingestPdf({ source: "/books/voice.pdf", extractor: fakeExtractor(text) });
  expect(samples.map((s) => s.id)).toEqual(["p1", "p2"]); // blank page dropped, ids stay sequential
  expect(samples[0]!.src_ref.url).toBe("/books/voice.pdf#page=1");
  expect(samples[1]!.src_ref.url).toBe("/books/voice.pdf#page=3"); // ref keeps the real page number
  expect(samples[1]!.src_ref.title).toBe("page 3");
});

test("ingestPdf honors the page limit and skips thin pages", async () => {
  const text = [LONG, LONG, LONG].join("\f");
  expect(await ingestPdf({ source: "/b.pdf", extractor: fakeExtractor(text), limit: 2 })).toHaveLength(2);
  expect(await ingestPdf({ source: "/b.pdf", extractor: fakeExtractor("tiny\falso tiny") })).toHaveLength(0);
});

test("an unreadable PDF yields no samples rather than throwing", async () => {
  const boom: PdfTextExtractor = async () => {
    throw new Error("not a pdf");
  };
  expect(await ingestPdf({ source: "/bad.pdf", extractor: boom })).toEqual([]);
});
