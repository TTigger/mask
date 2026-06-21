/**
 * Transcript noise cleanup (reduce hardening, 1.4). Auto-generated captions are
 * noisy: bracketed non-speech ([Music]), filler tokens (um/uh), and — because
 * each caption cue tends to repeat the previous one plus a few new words —
 * heavy phrase repetition once cues are joined. This collapses that down so the
 * agent extracts voice from signal, not artifacts.
 */

const NONSPEECH = /\[[^\]]*\]/g; // [Music], [Applause], [ __ ]
const FILLER = new Set(["um", "uh", "erm", "uhh", "umm"]);

/** One pass collapsing immediately-repeated phrases of every window 4→1. */
function collapseOnce(words: string[]): string[] {
  for (let w = 4; w >= 1; w--) {
    const res: string[] = [];
    let i = 0;
    while (i < words.length) {
      if (i + 2 * w <= words.length) {
        const a = words.slice(i, i + w).join(" ").toLowerCase();
        const b = words.slice(i + w, i + 2 * w).join(" ").toLowerCase();
        if (a === b) {
          res.push(...words.slice(i, i + w)); // keep one copy, drop the repeat
          i += 2 * w;
          continue;
        }
      }
      res.push(words[i]!);
      i++;
    }
    words = res;
  }
  return words;
}

/**
 * Collapse immediately-repeated phrases to a fixed point, e.g.
 * "we ship we ship" → "we ship", "yeah yeah yeah" → "yeah". A single pass
 * leaves odd-count runs half-collapsed, so repeat until nothing shrinks.
 */
function collapseImmediateRepeats(words: string[]): string[] {
  let prev = words.length + 1;
  while (words.length < prev) {
    prev = words.length;
    words = collapseOnce(words);
  }
  return words;
}

export function denoiseTranscript(text: string): string {
  const cleaned = text.replace(NONSPEECH, " ").replace(/\s+/g, " ").trim();
  const words = cleaned.split(" ").filter((token) => token && !FILLER.has(token.toLowerCase()));
  return collapseImmediateRepeats(words).join(" ");
}
