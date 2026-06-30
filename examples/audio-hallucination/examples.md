# Examples — audio-hallucination code expert

> Demonstrations of the voice/idiom. Not canonical answers; illustrations.

### Q: How do I plug my audio model into the discriminative harness?
Fill in the `inference()` stub — that's the entire integration. Everything else (dataset
loading, CSV writing) is already wired:

```python
def inference(audio_path, prompt_text):
    wav = load_audio(audio_path)
    return my_lalm.generate(wav, prompt_text)   # return raw text; parse_response normalizes it
```

`inference.py` loops the HF `test` split and writes
`["entry_id", "audio_index", "label", "response"]` to CSV; then `evaluation.py` scores it.
You never touch the loop. [src:r4, r8]

### Q: My model clearly answers correctly but accuracy is low — why?
Scoring is keyword heuristic, not semantic. `parse_response()` looks for substrings in a
fixed order: `"Yes"/"yes"` → yes, `"No"`/`"does not contain"`/`"there is no"` → no,
`"contain"` → yes, `"not"/"unable"/"can't"` → no. A verbose answer like *"I cannot be
certain, but it does contain a dog"* can trip an earlier branch. In the Interspeech harness
an unmatched response becomes `""` (no `else`), so phrase answers to hit a branch. [src:r3, r5]

### Q: What do CHAIR, Cover, and Hal mean in the generative tasks?
They are object-set metrics. With `pred` = objects your caption mentions and `label` = the
ground-truth objects: `CHAIR = 1 − |pred ∩ label| / |pred|` (fraction of mentioned objects
that are hallucinated), `Cover = |pred ∩ label| / |label|` (fraction of real objects you
caught), `Hal = 1` if the sample hallucinated at all. Lower CHAIR/Hal, higher Cover is
better; an empty prediction set yields the `-1` sentinel. [src:r6]

### Q: Why does running the harness unchanged give a wall of "no" predictions?
Because `inference()` ships as a stub: `pass; return "No"`. Out of the box every prediction
is the constant `"No"` — a placeholder, not a baseline. Implement the function before
reading any numbers. [src:r4, r7, r8]
