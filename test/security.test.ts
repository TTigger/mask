import { expect, test } from "bun:test";
import { isValidSlug, assertSlug } from "../src/lib/paths.ts";
import { isRepoSource } from "../ingest/repo/index.ts";
import { isPdfSource } from "../ingest/pdf/index.ts";
import { detectSourceKind } from "../src/lib/source.ts";

test("slug validation rejects path traversal and odd characters", () => {
  expect(isValidSlug("fireship")).toBe(true);
  expect(isValidSlug("dan-abramov")).toBe(true);
  expect(isValidSlug("../../etc")).toBe(false);
  expect(isValidSlug("a/b")).toBe(false);
  expect(isValidSlug("..")).toBe(false);
  expect(isValidSlug("UPPER")).toBe(false);
  expect(isValidSlug("")).toBe(false);
  expect(() => assertSlug("../../../tmp")).toThrow(/invalid mask name/);
  expect(() => assertSlug("ok-slug")).not.toThrow();
});

test("a `-`-leading source is never routed to the git/pdftotext subprocesses", () => {
  expect(isRepoSource("--upload-pack=touch /tmp/x.git")).toBe(false);
  expect(isPdfSource("--foo.pdf")).toBe(false);
  // and it doesn't get classified as repo/book by the dispatcher either
  expect(detectSourceKind("--upload-pack=x.git")).toBe("blog"); // falls through, fetch will reject
  expect(detectSourceKind("--foo.pdf")).toBe("blog");
});
