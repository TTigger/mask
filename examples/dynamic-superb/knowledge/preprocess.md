# Preprocessing instances to disk

`api/preprocess/process_instance.py` materializes a HF dataset instance to local
files. see also [[task-format]]. [src:r7]

```
python process_instance.py --json_path <instance.json> --save_dir <out> [--multi_uttrs]
```

It loads the dataset (`load_dataset(info["path"], revision=info["version"], split="test")`),
then for each example writes the clip with `soundfile.write` to
`<save_dir>/<task_name>_<file>`, collecting every non-audio field into a
`defaultdict` of metadata keyed by the saved filename. With `--multi_uttrs` it also
writes the paired clip `audio2` as `<stem>_pair<suffix>`. It asserts saved keys are
unique and that `len(meta_data) == len(dataset)`, then dumps `metadata.json`. [src:r7]

`preprocess.sh <BENCHMARK_DIR> <SAVE_DIR>` reads `single_uttr_tasks.txt` (plain) and
`multi_uttr_tasks.txt` (with `--multi_uttrs`), globbing each task's
`**/instance.json`. [src:r6]
