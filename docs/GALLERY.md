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

## 🔊 `dynamic-superb` — kuan2jiu99 / Dynamic-SUPERB (code)

A code-expert mask on the Dynamic-SUPERB speech benchmark (NTU SPML — the same lab
Hung-yi Lee leads). Instruction-tuned, zero-shot universal speech models.

```sh
mask ingest https://github.com/kuan2jiu99/dynamic-superb -n dynamic-superb
mask reduce ~/.mask/.work/dynamic-superb
mask compile dynamic-superb
```

**Evidence:** `repo · 7 files · ~16k chars` · moderate (the evaluation/preprocess API
+ task layout are well-evidenced; the 33 task definitions and docs were not sampled,
declared out of coverage).

> **Q: Why is my model scoring 0% when the answers look right?**
> The accuracy metric is a case-insensitive **exact** match — `pred.lower() == ref.lower()`.
> "Happy." ≠ "happy" (trailing period), "The emotion is happy" ≠ "happy". Emit exactly
> the label. `[src:r5]`

---

*Want to build your own? Just tell your agent: "distill this blog / repo / channel and
let me wear it." See the [README](../README.md).*
