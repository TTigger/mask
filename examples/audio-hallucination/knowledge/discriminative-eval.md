# Discriminative (yes/no) evaluation

The discriminative harness asks the model a yes/no question about a sound
("is there a sound of X?") and scores hallucination as a confusion matrix. see also
[[repo-layout]]. [src:r3, r5]

**Response normalization** — `parse_response(response)` maps free-form model text to a
label by scanning substrings in a fixed priority order: `"Yes"/"yes"` → `yes`; `"No"` →
`no`; `"there is no..."` / `"does not contain"` / `"doesn't contain"` → `no`;
`"contain"/"contains"` → `yes`; `"not"/"unable"/"can't"` → `no`. The **ICASSP** version
ends with `else: "unknown"`; the **Interspeech** version has no final `else`, so an
unmatched response is the empty string `""`. [src:r3, r5]

**ICASSP** (`icassp2025/evaluation.py`): `check_answer` turns (response, ground_truth)
into `TP/TN/FP/FN/unknown`, then: [src:r3]
- `accuracy = (TP + TN) / total`
- `precision = TN / (TN + FN)`, `recall = TN / (TN + FP)`, `f1 = 2·p·r/(p+r)`
- `yes_rate = yes / total`, `instruction_follow_rate = (total − unknown) / total`
- a **paired before/after analysis**: rows are walked in pairs (`index % 2`) and the
  transition is bucketed into `TPTN / FNFP / TPFP / FNTN` — this quantifies how a
  model's answer changes with the stepwise-reasoning (MATCH) prompt. [src:r3]

**Interspeech** (`interspeech2024/evaluation.py`): simpler accuracy, but precision/recall
are computed on the **negative** class — `precision = answer_right_negative / answer_negative`,
`recall = answer_right_negative / total_negative` — so they are not the textbook
positive-class definitions. [src:r5]
