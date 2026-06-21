/**
 * Framework-owned, marked artifacts (SPEC §7.3): every block mask writes into a
 * user's config file is delimited by `<!-- mask:NAME -->` … `<!-- /mask:NAME -->`
 * so it can be upserted in place and removed cleanly without touching the rest.
 *
 * Reused by: orchestrator install (0.4), AGENTS.md active-swap (1.2), unwear.
 * Callers pass a full block that already carries its own markers; this module
 * only locates, replaces, or strips that marked region.
 */

/** Match an existing block, tolerating an inline suffix on the opening marker
 *  (e.g. `<!-- mask:active fireship -->`). `name` is regex-escaped. */
function blockRegex(name: string): RegExp {
  const safe = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `<!--\\s*mask:${safe}\\b[^>]*-->[\\s\\S]*?<!--\\s*/mask:${safe}\\s*-->`,
  );
}

/** Insert `block` under `name`, replacing an existing block if present. */
export function upsertBlock(content: string, name: string, block: string): string {
  const trimmed = block.trim();
  const re = blockRegex(name);
  // Function replacer: a block body with `$&`/`$1`/`$<x>` must be inserted literally.
  if (re.test(content)) return content.replace(re, () => trimmed);
  if (content.trim() === "") return trimmed + "\n";
  return content.replace(/\s*$/, "") + "\n\n" + trimmed + "\n";
}

/** Strip the `name` block, collapsing the gap it leaves behind. */
export function removeBlock(content: string, name: string): string {
  const re = blockRegex(name);
  if (!re.test(content)) return content;
  const body = content.replace(re, "").replace(/\n{3,}/g, "\n\n").replace(/\s*$/, "");
  return body === "" ? "" : body + "\n";
}

/** Whether a `name` block currently exists in `content`. */
export function hasBlock(content: string, name: string): boolean {
  return blockRegex(name).test(content);
}

/** Return the full `name` block (markers included), or null if absent. */
export function extractBlock(content: string, name: string): string | null {
  return content.match(blockRegex(name))?.[0] ?? null;
}
