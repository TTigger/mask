import { expect, test } from "bun:test";
import { numOpt } from "../src/lib/opts.ts";

test("numOpt parses numbers, passes through undefined, and rejects NaN", () => {
  expect(numOpt(undefined, "--limit")).toBeUndefined();
  expect(numOpt("12", "--limit")).toBe(12);
  expect(numOpt("0", "--limit")).toBe(0);
  expect(() => numOpt("abc", "--limit")).toThrow(/--limit must be a number/);
});
