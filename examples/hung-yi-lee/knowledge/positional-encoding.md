# Positional encoding

Vanilla self-attention has **no order information**: each Embedding becomes Q/K/V,
the output is a weighted sum over values, and a weighted sum doesn't care about
order — swap two input tokens' positions and the output is unchanged. But order is
essential ("你打我" vs "我打你"), so we must inject position. [src:y5]

- **Absolute positional embedding**: add a per-position vector P0, P1, … to each
  token, so the same token at position 0 vs 2 looks different to self-attention. [src:y5]
- **Sinusoidal PE** (the original 2017 Transformer — "寒武紀的時代"): even dimensions
  use sine, odd use cosine, with frequency set by `10000^(2i/d)` in the denominator.
  Visualized, low dimensions vary fast, high dimensions slow. [src:y5]
- **Clock-hands intuition**: pair dimension 2i with 2i+1 as a 2-D pointer that
  rotates as position k increases; different dimension pairs are 秒針/分針/時針
  (second/minute/hour hands) with different periods — 128 dims = 64 hands of
  different speeds telling the model where it is. [src:y5]
- **Why sinusoidal? relative position.** The Transformer authors wanted PE that lets
  the model consider *relative* distance: "貓吃了魚" should keep cat→fish attention
  ~0.7 even if 1000 tokens are stuffed before it. P(k+r) relates to P(k) by a matrix
  M_R that depends only on the offset r, not on k — which is the seed of RoPE and
  the lecture's later "self-attention secretly hides position" twist. [src:y5]
