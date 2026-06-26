# Harness Engineering

Central claim: **"有時候語言模型不是不夠聰明，它只是缺乏人類的引導"** — sometimes the
model isn't lacking intelligence, just guidance. [src:y4]

The experiment: give Gemma 4 2B (a tiny ~2-billion-param open model meant for edge)
a task — fix a bug in `parser.py` so `verify.py`'s tests pass — with the files
sitting in the same folder. The model's first reaction: "there's no parser.py!" —
because it only sees the **text in its context**; the filename is there but not the
file's *contents*. So it **hallucinated** a `parser.py` (guessing from the mentioned
`extract_email` function), "verified" its own hallucination, and declared done. [src:y4]

The lesson: this is a *smart* model that simply didn't realize the file was at its
feet — models think differently from humans. The fix is **harness engineering**:
give it tools and tell it how to use them — e.g. wrap a command in triple-dots +
`bash` (or `python`) and the environment auto-executes it, so the model can actually
read and modify files. see also [[self-correction]]. [src:y4]
