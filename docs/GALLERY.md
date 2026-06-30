# Gallery — masks distilled with mask

Four real masks ship in [`examples/`](../examples), distilled end-to-end with mask's
own recipes. Install any of them in seconds:

```sh
mask try hung-yi-lee     # then: mask wear hung-yi-lee
```

`mask try` copies the curated mask into your `~/.mask` library and compiles it for
your agent. Every claim in these masks is evidence-bound (`[src:id]` → `sources.json`),
and each passes `mask coverage` with **zero** orphan pages, broken `[[links]]`, or
uncited claims.

> These are reference samples, not endorsements — they show what a distilled mask
> looks like. Each declares its own coverage limits.

---

## 🎓 `hung-yi-lee` — 李宏毅 (voice)

A voice mask of NTU's Hung-yi Lee, whose Mandarin lectures explain LLM internals to
students. Also a good stress test of YouTube ingestion: the captions are Mandarin and
the language is auto-detected.

```sh
mask ingest "https://www.youtube.com/@HungyiLeeNTU/videos" -n hung-yi-lee --limit 12
mask reduce ~/.mask/.work/hung-yi-lee
# agent extracts the voice recipe -> ~/.mask/hung-yi-lee/
mask compile hung-yi-lee
```

**Evidence:** `youtube · 7 transcripts · ~191k chars` · voice broad & consistent;
knowledge bounded to those lectures (positional encoding, KV cache, Flash Attention,
self-correction, harness engineering, self-improving AI).

> **Q：聽到一個「讓 Transformer 變快」的新方法，我第一個該問什麼？**
> 你要問的事情永遠是：**代價是什麼？** 可能它改變了 self-attention 的計算，是個近似；
> 可能它是模型綁定的。像 Flash Attention 之所以厲害，就是這兩個代價它都不用付——算出來
> 跟原本一模一樣，又隨插即用。`[src:y7]`

---

## 🧠 `micrograd` — karpathy/micrograd (code)

A code-expert mask on Andrej Karpathy's tiny scalar autograd engine — the smallest,
most self-contained teaching repo, so coverage is near-complete.

```sh
mask ingest https://github.com/karpathy/micrograd -n micrograd
mask reduce ~/.mask/.work/micrograd
# agent extracts the code recipe -> ~/.mask/micrograd/
mask compile micrograd
```

**Evidence:** `repo · 6 files · ~9k chars` · broad (the engine + nn library are
fully in-digest; the demo notebooks are described by the README only, declared out of
coverage).

> **Q: How do I add a `tanh` op to `Value`?**
> Follow the house recipe — build the node, close over a `_backward` that accumulates
> the local derivative (`1 - tanh²`), assign it, return `out`. Same pattern as `relu`:
> parents in `_children`, an `_op` tag, `+=` into `self.grad`. `[src:r3]`

---

## 🖼️ `open-slide` — 1weiho/open-slide (code)

A code-expert mask on Yiwei Ho's "slide framework built for agents" — thematically
close to mask itself (a framework whose intelligence is borrowed from a coding agent).

```sh
mask ingest https://github.com/1weiho/open-slide -n open-slide
mask reduce ~/.mask/.work/open-slide
mask compile open-slide
```

**Evidence:** `repo · 15 files · ~83k chars` · broad (slide authoring + design system +
monorepo/tooling well-evidenced; the `@open-slide/core` runtime internals were not
sampled, declared out of coverage).

> **Q: Can I write slides in Markdown / a slide DSL?**
> No — open-slide deliberately has no DSL. Pages are arbitrary React components
> rendered into a fixed 1920×1080 canvas; you author `.tsx`, exporting `design` +
> `meta` + a default `Page[]`. `[src:r1]`

---

## 🔊 `audio-hallucination` — kuan2jiu99/audio-hallucination (code)

A code-expert mask on Chun-Yi Kuan's official code for two NTU papers (with Hung-yi Lee
— the same lab) on **hallucination in Large Audio-Language Models**: Interspeech 2024
and ICASSP 2025. The repo ships evaluation harnesses, not a model — you fill in an
`inference()` stub and score hallucination metrics.

```sh
mask ingest https://github.com/kuan2jiu99/audio-hallucination -n audio-hallucination
mask reduce ~/.mask/.work/audio-hallucination
# agent extracts the code recipe -> ~/.mask/audio-hallucination/
mask compile audio-hallucination
```

**Evidence:** `repo · 8 files · ~22k chars` · broad (both inference→CSV→evaluation
harnesses and all metrics — TP/TN/FP/FN, CHAIR/Cover/Hal — are fully in-digest; the
per-paper sub-READMEs describing the MATCH method, dataset roster, and run commands were
not sampled, declared out of coverage).

> **Q: My model clearly answers correctly, but accuracy is low — why?**
> Scoring is a **keyword heuristic**, not semantic. `parse_response()` scans substrings
> in a fixed order — `"Yes"`→yes, `"No"`/`"does not contain"`→no, `"contain"`→yes,
> `"not"/"unable"/"can't"`→no — so a hedged "I'm not sure, but it does contain a dog" can
> trip an earlier branch. In the Interspeech harness an unmatched response even falls
> through to `""` (there's no final `else`). `[src:r3, r5]`

---

*Want to build your own? Just tell your agent: "distill this blog / repo / channel and
let me wear it." See the [README](../README.md).*
