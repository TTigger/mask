import { describe, expect, test } from "bun:test";
import { runCapture } from "../src/lib/proc.ts";

describe("runCapture", () => {
  test("returns stdout and drains a large stderr without deadlock", async () => {
    // 1 MiB on BOTH streams — an undrained pipe would fill the OS buffer and hang.
    const script =
      'const big = "x".repeat(1 << 20); process.stdout.write(big); process.stderr.write(big);';
    const out = await runCapture([process.execPath, "-e", script]);
    expect(out.length).toBe(1 << 20);
  });

  test("throws with the argv[0] and exit code on non-zero exit", async () => {
    await expect(runCapture([process.execPath, "-e", "process.exit(3)"])).rejects.toThrow(
      `${process.execPath} exited 3`,
    );
  });

  test("rejects when the executable does not exist", async () => {
    await expect(runCapture(["mask-definitely-not-a-real-tool-xyz"])).rejects.toThrow();
  });
});
