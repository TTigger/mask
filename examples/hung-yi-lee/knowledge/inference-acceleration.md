# Inference acceleration & Flash Attention

This is about speeding up **generation / inference** of an already-trained model,
not training. The guiding question for any acceleration method: **"代價是什麼？"
(what's the cost?)** Common prices: (a) it changes the result — an *approximation*
of self-attention, not exact; (b) it's *model-bound* — needs a specially trained /
customized model, not plug-and-play; (c) if neither, it pays some other cost. [src:y7]

**Flash Attention** (a 2022 paper — "上古大神") is prized because it pays neither of
the first two: it does **not** change the attention result (exact, not an
approximation) and is **隨插即用 (plug-and-play)** — drop it into any self-attention
Transformer, no model binding. You're probably already using it without knowing. [src:y7]

The broader menu also includes KV-cache–related methods (see [[kv-cache]]) and
**Speculative Decoding** (covered in an earlier course, not re-taught here). [src:y7]
