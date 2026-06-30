# What audio-hallucination is

The official code for two NTU papers (Chun-Yi Kuan, Hung-yi Lee, et al.) on
**hallucination in Large Audio-Language Models (LALMs)** — models that "hear" audio and
answer in text, but sometimes report sounds/objects that are not actually present. [src:r1]

1. **Interspeech 2024** — "Understanding Sounds, Missing the Questions: The Challenge of
   Object Hallucination in Large Audio-Language Models" (Kuan, Huang, Lee). The first
   systematic study of object hallucination in LALMs. arXiv:2406.08402. [src:r1]
2. **ICASSP 2025** — "Can Large Audio-Language Models Truly Hear? Tackling Hallucinations
   with Multi-Task Assessment and Stepwise Audio Reasoning" (Kuan, Lee). Covers object
   existence, temporal order, and object attribute, and proposes **MATCH** (Multi-turn And
   Thoughtful Chain of Hearings) — a stepwise audio-reasoning prompting method. arXiv:2410.16130. [src:r1]

The repo ships **evaluation harnesses, not a model**: you fill in an `inference()` stub
with your own audio model, run it over a HuggingFace dataset, and score hallucination
metrics. See [[repo-layout]] for how the harnesses are structured. [src:r1, r2]

The MATCH method itself, the dataset construction, and exact run commands live in the
per-paper sub-READMEs, which were not sampled — treat them as out of coverage. [src:r1, r2]
