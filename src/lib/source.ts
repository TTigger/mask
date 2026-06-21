import { ingestBlog } from "../../ingest/blog/index.ts";
import { ingestYoutube } from "../../ingest/youtube/index.ts";
import { ingestRepo, isRepoSource } from "../../ingest/repo/index.ts";
import type { Sample } from "./digest.ts";

export type SourceKind = "youtube" | "repo" | "blog";

/** Pick the ingester from the source: repo vs. YouTube vs. blog (default). */
export function detectSourceKind(src: string): SourceKind {
  if (/(?:^|\/\/)(?:www\.)?(?:youtube\.com|youtu\.be)\b/i.test(src)) return "youtube";
  if (/^@[\w.-]+$/.test(src)) return "youtube"; // bare @handle
  if (isRepoSource(src)) return "repo";
  return "blog";
}

/** Dispatch one ingest to the right module. Shared by `ingest` and `redistill`. */
export async function ingestSource(
  srcs: string[],
  limit?: number,
): Promise<{ kind: SourceKind; samples: Sample[] }> {
  const kind = detectSourceKind(srcs[0]!);
  let samples: Sample[];
  if (kind === "youtube") samples = await ingestYoutube({ source: srcs[0]!, limit });
  else if (kind === "repo") samples = await ingestRepo({ source: srcs[0]!, limit });
  else samples = await ingestBlog({ urls: srcs, limit });
  return { kind, samples };
}
