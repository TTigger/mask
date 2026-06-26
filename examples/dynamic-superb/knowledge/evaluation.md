# Model contract & evaluation

A model subclasses `BaseModel` and implements one method, inferring **one example at
a time** (batch_size = 1): [src:r3]

```python
class BaseModel:
    def forward(self, speech_inputs, text_inputs, instr):
        # speech_inputs: List[(np.ndarray, sampling_rate)]
        # text_inputs:   List[str]
        # instr:         str  (the task instruction)
        # returns: (speech_outputs: List[np.ndarray], text_outputs: List[str])
        ...
```

`evaluation_example.py` drives it: `load_dataset(meta_data["path"], revision=meta_data["version"])`,
then per example pull `audio.array` + `audio.sampling_rate` + `instruction` + `label`,
call the model, take `text_outputs[0]` as the prediction, and accumulate accuracy.
Results are written as a `file_name,prediction` CSV; final `Accuracy: {acc:.3f}%`. [src:r3]

The reference metric (`api/metrics/accuracy.py`) is a case-insensitive **exact**
match — `get_score(pred, ref) = pred.lower() == ref.lower()`; redundant characters
break the match, so the model must emit exactly the label. see also [[task-format]]. [src:r5]

`inference_all.sh <BENCHMARK_DIR> <SAVE_DIR>` loops every `<task>/<instance>/instance.json`. [src:r4]
