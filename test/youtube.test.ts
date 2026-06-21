import { expect, test } from "bun:test";
import {
  ingestYoutube,
  parseVtt,
  isVideoUrl,
  videoIdFromUrl,
  type YoutubeProvider,
  type YoutubeVideo,
} from "../ingest/youtube/index.ts";

const PLAIN_VTT = `WEBVTT
Kind: captions
Language: en

00:00:00.000 --> 00:00:02.000
hello and welcome

00:00:02.000 --> 00:00:04.000
to the channel today
`;

// Auto-sub style: inline timestamp/style tags + rolling-caption duplication.
const AUTO_VTT = `WEBVTT

00:00:00.000 --> 00:00:02.000
so today

00:00:02.000 --> 00:00:04.000
so today
<00:00:02.500><c> we</c><00:00:03.000><c> ship</c>
`;

function longVtt(words: string): string {
  return `WEBVTT\n\n00:00:00.000 --> 00:09:00.000\n${words.repeat(40)}\n`;
}

function fakeProvider(map: Record<string, string>, list: YoutubeVideo[]): YoutubeProvider {
  return {
    async listVideos(_source, limit) {
      return list.slice(0, limit);
    },
    async fetchTranscript(video) {
      if (!(video.id in map)) throw new Error(`no transcript ${video.id}`);
      return map[video.id]!;
    },
  };
}

test("isVideoUrl / videoIdFromUrl recognize watch + short URLs, reject channels", () => {
  expect(isVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
  expect(isVideoUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
  expect(isVideoUrl("https://www.youtube.com/@fireship")).toBe(false);
  expect(videoIdFromUrl("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
});

test("parseVtt strips headers/timing/tags and drops consecutive duplicates", () => {
  expect(parseVtt(PLAIN_VTT)).toBe("hello and welcome to the channel today");
  const auto = parseVtt(AUTO_VTT);
  expect(auto).toContain("so today we ship");
  expect(auto).not.toContain("-->");
  expect(auto).not.toContain("<c>");
  expect(auto).not.toContain("so today so today"); // consecutive dup removed
});

test("parseVtt preserves literal angle brackets in speech and decodes entities", () => {
  const vtt = `WEBVTT

00:00:00.000 --> 00:00:02.000
if a &lt; b &gt; c then R&amp;D

00:00:02.000 --> 00:00:04.000
<00:00:02.500><c>tag</c> 5 > 3
`;
  const got = parseVtt(vtt);
  expect(got).toContain("if a < b > c then R&D"); // entities decoded, not stripped
  expect(got).toContain("tag 5 > 3"); // only the <c>/timestamp tags removed; "5 > 3" intact
  expect(got).not.toContain("<c>");
  expect(got).not.toContain("&amp;");
});

test("ingestYoutube expands a channel into stable-id samples, skipping thin/unreachable", async () => {
  const videos: YoutubeVideo[] = [
    { id: "v1", title: "Episode One", url: "https://www.youtube.com/watch?v=v1" },
    { id: "v2", title: "Episode Two", url: "https://www.youtube.com/watch?v=v2" },
    { id: "v3", title: "Short", url: "https://www.youtube.com/watch?v=v3" },
    { id: "v4", title: "Broken", url: "https://www.youtube.com/watch?v=v4" },
  ];
  const provider = fakeProvider(
    {
      v1: longVtt("alpha beta gamma delta "),
      v2: longVtt("one two three four "),
      v3: PLAIN_VTT, // too short -> dropped
      // v4 has no transcript -> throws -> skipped
    },
    videos,
  );

  const samples = await ingestYoutube({ source: "https://www.youtube.com/@chan", provider, minChars: 400 });
  expect(samples.map((s) => s.id)).toEqual(["y1", "y2"]);
  expect(samples[0]!.src_ref.url).toBe("https://www.youtube.com/watch?v=v1");
  expect(samples[0]!.src_ref.title).toBe("Episode One");
});

test("a single watch URL is ingested as one video without listing the channel", async () => {
  const provider = fakeProvider({ abc12345678: longVtt("hello world ") }, []);
  const samples = await ingestYoutube({
    source: "https://youtu.be/abc12345678",
    provider,
    minChars: 100,
  });
  expect(samples).toHaveLength(1);
  expect(samples[0]!.id).toBe("y1");
  expect(samples[0]!.src_ref.url).toBe("https://youtu.be/abc12345678");
});
