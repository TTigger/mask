# Repo layout & the harness contract

The tree is two self-contained paper directories plus a shared `requirements.txt`: [src:r2]

```
README.md
requirements.txt
icassp2025/
  evaluation.py          # CSV -> metrics (discriminative + paired analysis)
  inference.py           # HF dataset -> CSV
  images/overview.png
interspeech2024/
  evaluation.py          # CSV -> metrics (discriminative)
  inference.py           # HF dataset -> CSV
  generative_tasks/
    evaluation.py        # JSON -> CHAIR/Cover/Hal
    inference.py         # HF dataset -> nested JSON
  images/...
```

There is **no shared library** — each script is standalone and argparse-driven, so a
directory can be copied out on its own. [src:r2]

**The contract** every harness follows: a two-stage split decoupled by a file on disk. [src:r3, r4, r5, r8]

1. `inference.py` defines a stub `def inference(audio_path, prompt_text): pass; return "No"`.
   You replace its body with your model call. It loops `load_dataset(dataset_name)['test']`,
   builds `audio_path = f"{audio_root_dir}/{audio_index}"`, and writes results. [src:r4, r8]
2. `evaluation.py` reads those results back and prints/saves metrics. The two never import
   each other — the CSV/JSON path is the only interface. [src:r3, r5]

Discriminative results are a 4-column CSV `["entry_id", "audio_index", "label", "response"]`,
read positionally as `row[0..3]`. Datasets default to the authors' `kuanhuggingface/*` Hub
repos via `--dataset_name`. see also [[discriminative-eval]] and [[generative-eval]]. [src:r4, r8]
