# Task & instance layout

Tasks are data, not code. The tree is: [src:r2]

```
dynamic_superb/benchmark_tasks/
  <Task>/                          # CamelCase, e.g. EmotionRecognition
    README.md
    <Task>_<Dataset>/              # an evaluation instance, e.g. EmotionRecognition_MultimodalEmotionlinesDataset
      instance.json
      README.md
```

A single task can hold many dataset instances — e.g. the five `ESC50-*`
EnvironmentalSoundClassification instances, or the many `NoiseDetection_*` and
`ReverberationDetection_*` variants. [src:r2]

`instance.json` carries the HuggingFace dataset coordinates the harness needs:
`path` (HF repo), `version` (passed as `revision`), and `name` (used as the saved
file prefix). see also [[evaluation]] and [[preprocess]]. [src:r3, r7]

Tasks are partitioned into single- vs multi-utterance by `single_uttr_tasks.txt`
and `multi_uttr_tasks.txt`; multi-utterance instances carry a second clip `audio2`. [src:r6, r7]
