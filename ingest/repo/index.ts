import { statSync } from "node:fs";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import type { Sample } from "../../src/lib/digest.ts";
import { runCapture } from "../../src/lib/proc.ts";

/**
 * Repo ingest (knowledge-first, for `type: code` masks). Deterministically
 * extracts a repo's conventions signal — README, directory tree, config/lint
 * files, and a capped sample of source files — into normalized samples (r1,
 * r2, …). A git URL is cloned via the injectable cloner (default: shallow git
 * clone); a local path is read in place, so tests run offline against a fixture.
 */

export interface IngestRepoOptions {
  source: string;
  /** Max source files to sample (README/tree/configs are always included). */
  limit?: number;
  /** Max bytes read per file. */
  maxFileBytes?: number;
  /** Resolve a remote source to a local dir; default shallow-clones with git. */
  cloner?: (source: string) => Promise<string>;
}

const DEFAULT_LIMIT = 30;
const DEFAULT_MAX_FILE_BYTES = 12_000;

const IGNORE_DIRS = new Set([
  ".git", "node_modules", "dist", "build", "out", "coverage", "vendor",
  ".next", ".nuxt", "target", "__pycache__", ".venv", ".turbo", ".cache",
]);

const SOURCE_EXT = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".go", ".rs", ".java",
  ".rb", ".php", ".c", ".h", ".cc", ".cpp", ".hpp", ".cs", ".swift", ".kt",
  ".scala", ".sh", ".vue", ".svelte", ".lua", ".ex", ".exs",
]);

/** Conventions live here as much as in code. */
const CONFIG_FILES = [
  "package.json", "tsconfig.json", "biome.json", ".eslintrc", ".eslintrc.json",
  ".eslintrc.js", ".eslintrc.cjs", ".prettierrc", ".editorconfig", "pyproject.toml",
  "ruff.toml", "setup.cfg", "go.mod", "Cargo.toml", "Makefile", ".rubocop.yml",
];

const SKIP_FILES = /(?:package-lock\.json|yarn\.lock|pnpm-lock\.yaml|\.min\.(?:js|css))$/i;

function ext(name: string): string {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i).toLowerCase();
}

/** Recursively list files under `dir` (sorted, ignoring noise dirs). */
async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  const files: string[] = [];
  for (const e of entries) {
    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name)) continue;
      files.push(...(await walk(join(dir, e.name))));
    } else if (e.isFile()) {
      files.push(join(dir, e.name));
    }
  }
  return files;
}

/** A compact, depth-limited directory tree as indented lines. */
function renderTree(relPaths: string[], maxLines = 200): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const p of relPaths.sort()) {
    const parts = p.split(sep);
    for (let i = 0; i < parts.length; i++) {
      const prefix = parts.slice(0, i + 1).join(sep);
      if (seen.has(prefix)) continue;
      seen.add(prefix);
      const isFile = i === parts.length - 1;
      lines.push("  ".repeat(i) + parts[i] + (isFile ? "" : "/"));
      if (lines.length >= maxLines) return lines.join("\n");
    }
  }
  return lines.join("\n");
}

async function readCapped(path: string, maxBytes: number): Promise<string> {
  const buf = await readFile(path, "utf8");
  return buf.length > maxBytes ? buf.slice(0, maxBytes) : buf;
}

async function defaultCloner(source: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "mask-repo-"));
  // `--` ends options so a `-`-leading source can't be parsed as a git flag
  // (e.g. --upload-pack=...); runCapture drains both streams so a verbose
  // clone can't block.
  try {
    await runCapture(["git", "clone", "--depth", "1", "--", source, dir]);
  } catch {
    throw new Error(`git clone failed: ${source}`);
  }
  return dir;
}

/** Is this a local directory we can read in place (vs a URL to clone)? */
function isLocalDir(source: string): boolean {
  try {
    return statSync(source).isDirectory();
  } catch {
    return false;
  }
}

export async function ingestRepo(opts: IngestRepoOptions): Promise<Sample[]> {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const maxFileBytes = opts.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
  const cloner = opts.cloner ?? defaultCloner;

  const dir = isLocalDir(opts.source) ? opts.source : await cloner(opts.source);
  return collectRepoSamples(dir, { source: opts.source, limit, maxFileBytes });
}

/** Deterministic extraction from a checked-out repo dir. */
export async function collectRepoSamples(
  dir: string,
  opts: { source: string; limit: number; maxFileBytes: number },
): Promise<Sample[]> {
  const all = await walk(dir);
  const rel = all.map((p) => relative(dir, p));
  const samples: Sample[] = [];
  // Each file gets a unique, stable url (`<source>#<path>`) so provenance points
  // at the file and re-distillation can diff per file (the repo root is shared).
  const push = (title: string, text: string) => {
    if (text.trim()) {
      samples.push({ id: `r${samples.length + 1}`, src_ref: { url: `${opts.source}#${title}`, title }, text });
    }
  };

  // 1. README (root, case-insensitive)
  const readme = all.find((p) => /^readme(\.md|\.rst|\.txt)?$/i.test(relative(dir, p)));
  if (readme) push(relative(dir, readme), await readCapped(readme, opts.maxFileBytes));

  // 2. directory tree (structure = conventions)
  push("(tree)", renderTree(rel));

  // 3. config / lint files (root-level)
  for (const name of CONFIG_FILES) {
    const hit = all.find((p) => relative(dir, p) === name);
    if (hit) push(name, await readCapped(hit, opts.maxFileBytes));
  }

  // 4. a capped, deterministic sample of source files
  const sources = all.filter((p) => {
    const r = relative(dir, p);
    return SOURCE_EXT.has(ext(p)) && !SKIP_FILES.test(r);
  });
  for (const p of sources.slice(0, opts.limit)) {
    push(relative(dir, p), await readCapped(p, opts.maxFileBytes));
  }

  return samples;
}

/** True for git URLs or existing local directories. Never a `-`-leading flag. */
export function isRepoSource(source: string): boolean {
  if (source.startsWith("-")) return false;
  if (/(?:github\.com|gitlab\.com|bitbucket\.org)[/:]/i.test(source)) return true;
  if (/\.git$/i.test(source)) return true;
  return isLocalDir(source);
}
