# Generative (captioning) evaluation

`interspeech2024/generative_tasks/` measures hallucination in free-form audio captions,
not yes/no answers. see also [[repo-layout]]. [src:r6, r7]

**Inference** (`generative_tasks/inference.py`): each clip is prompted with **5 fixed
captioning prompts** — `"Describe the audio."`, `"What do you hear?"`, `"What can be
inferred from the audio?"`, `"This is a sound of"`, `"Generate audio caption:"` — and the
results are written as a nested JSON `{audio_index: {prompt: {prediction, caption, label,
task}}}`. [src:r7]

**Metrics** (`generative_tasks/evaluation.py`) operate on Python `set()`s of objects (the
predicted object set vs the label object set): [src:r6]
- **CHAIR** (hallucination rate) `= 1 − |pred ∩ label| / |pred|`; returns the sentinel
  `-1` when the prediction set is empty.
- **Cover** (coverage) `= |pred ∩ label| / |label|`.
- **Hal** `= 1 if CHAIR != 0 else 0` (per-sample "did it hallucinate at all"), `-1` when
  CHAIR is the empty-prediction sentinel.

All three are averaged across every `(yt_id, prompt)` entry and printed as a
`CHAIR | Cover | Hal` row. Lower CHAIR / Hal and higher Cover is better. [src:r6]

> Note: as sampled, `generative_tasks/inference.py` re-initializes `results = {}` inside
> the per-clip loop and passes an undefined `audio_path` (it computes `audio_abs_path`) —
> likely quirks, not asserted intended behavior. [src:r7]
