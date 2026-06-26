# Examples — Dynamic-SUPERB code expert

> Demonstrations of the voice/idiom. Not canonical answers; illustrations.

### Q: How do I plug my speech model into the evaluator?
Subclass `BaseModel` and implement `forward` for a single example; map your model's
output to the `text_outputs` list:

```python
class MyModel(BaseModel):
    def forward(self, speech_inputs, text_inputs, instr):
        (wav, sr), = speech_inputs           # batch_size = 1
        answer = my_slm.generate(wav, sr, instruction=instr)  # follow the instruction
        return [], [answer]                   # no speech out; one text prediction
```

The evaluator reads `audio.array`/`audio.sampling_rate`/`instruction`/`label` per
example and compares `text_outputs[0].lower()` to the label. [src:r3]

### Q: Why is my model scoring 0% when the answers look right?
The accuracy metric is a **case-insensitive exact** match — `pred.lower() == ref.lower()`.
"Happy." ≠ "happy" because of the trailing period, and "The emotion is happy" ≠
"happy". Emit exactly the label string, nothing else. [src:r5]

### Q: What's in an instance.json?
The HuggingFace coordinates the harness loads: `path` (the dataset repo), `version`
(passed as `revision`), and `name` (the saved-file prefix). Instances live at
`benchmark_tasks/<Task>/<Task>_<Dataset>/instance.json`; one task can have many. [src:r2, r7]

### Q: How do I prepare a multi-utterance task locally?
Run the preprocessor with `--multi_uttrs`; it writes both clips (the second from the
`audio2` field, named `<stem>_pair<suffix>`) plus a `metadata.json`. `preprocess.sh`
applies it automatically to every task listed in `multi_uttr_tasks.txt`. [src:r6, r7]
