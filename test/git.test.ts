import { expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { simpleGit } from "simple-git";
import { commitAll } from "../src/lib/git.ts";

/** Restore an env var to its prior value (deleting if it was unset). */
function restore(key: string, prev: string | undefined): void {
  if (prev === undefined) delete process.env[key];
  else process.env[key] = prev;
}

test("commitAll succeeds with no global/system git identity (local fallback)", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mask-git-"));
  const g = process.env.GIT_CONFIG_GLOBAL;
  const s = process.env.GIT_CONFIG_SYSTEM;
  process.env.GIT_CONFIG_GLOBAL = "/dev/null"; // no user identity available (a bare CI/container)
  process.env.GIT_CONFIG_SYSTEM = "/dev/null";
  try {
    await writeFile(join(dir, "x.txt"), "hi");
    await commitAll(dir, "mask: test");
    const log = await simpleGit(dir).log();
    expect(log.total).toBe(1);
    expect(log.latest?.message).toBe("mask: test");
  } finally {
    restore("GIT_CONFIG_GLOBAL", g);
    restore("GIT_CONFIG_SYSTEM", s);
  }
});
