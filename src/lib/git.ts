import { existsSync } from "node:fs";
import { join } from "node:path";
import { simpleGit, type SimpleGit } from "simple-git";

/** Get a git handle for the library, initializing the repo on first contact. */
export async function ensureRepo(root: string): Promise<SimpleGit> {
  const git = simpleGit(root);
  if (!existsSync(join(root, ".git"))) {
    await git.init();
  }
  return git;
}

/**
 * Stage everything and commit — the library auto-commits on every mutation
 * (SPEC: "auto git commit on change"), keeping the mask history inspectable.
 */
export async function commitAll(root: string, message: string): Promise<void> {
  const git = await ensureRepo(root);
  await git.add(".").commit(message);
}
