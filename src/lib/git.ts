import { existsSync } from "node:fs";
import { join } from "node:path";
import { simpleGit, type SimpleGit } from "simple-git";

/** Get a git handle for the library, initializing the repo on first contact. */
export async function ensureRepo(root: string): Promise<SimpleGit> {
  const git = simpleGit(root);
  if (!existsSync(join(root, ".git"))) {
    await git.init();
  }
  await ensureIdentity(git);
  return git;
}

/**
 * Make sure commits have an author. Respects the user's global git identity if
 * set; only when none resolves (a bare machine / CI container) do we set a local
 * fallback, so the library's auto-commits never fail for lack of config.
 */
async function ensureIdentity(git: SimpleGit): Promise<void> {
  const email = (await git.raw(["config", "--get", "user.email"]).catch(() => "")).trim();
  if (email) return;
  await git.addConfig("user.email", "mask@localhost", false, "local");
  await git.addConfig("user.name", "mask", false, "local");
}

/**
 * Stage everything and commit — the library auto-commits on every mutation
 * (SPEC: "auto git commit on change"), keeping the mask history inspectable.
 */
export async function commitAll(root: string, message: string): Promise<void> {
  const git = await ensureRepo(root);
  await git.add(".").commit(message);
}
