# KV Cache

Generation splits into two phases: **Prefill** (a long prompt comes in at once, all
tokens' Q/K/V computed in parallel) and **Decode** (tokens emitted one at a time). [src:y6]

The idea: when generating, a new token's query must attend to all previous tokens'
keys and values. Recomputing K and V for the whole prefix every step is wasteful
(each needs an input × matrix), so we **store K and V and reuse them** — that store
is the KV Cache. **Q is dropped** (only the current token's query is needed). So
token 5 only computes its own Q5/K5/V5 and attends against the cached K1..K4, V1..V4. [src:y6]

The catch — it **bursts the warehouse** (倉庫). Two reasons: (1) every input/output
token adds another K,V, so long sequences blow up memory; (2) attention is
**Multi-Head**, so there are many K/V sets, not one. Worked example: Gemma 2 27B has
46 layers, ~30 heads, 128-dim per head, FP16 — multiply it out per token and the
cost is large. This motivates tricks like **GQA (Grouped-Query Attention)**. see also
[[inference-acceleration]]. [src:y6]
