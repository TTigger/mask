# Self-correction & reasoning

The question: can a model, **without human intervention**, notice its own answer is
wrong and fix it? (As opposed to fixing it after a human points out the error.)
There are three directions to achieve self-correction: [src:y3]

1. **Change the inference/decoding process** — detect error signals from the model's
   own representations / probability distributions during generation, then correct
   the output automatically. Evidence: a 2023 paper trained a **binary classifier**
   on representations from correct vs incorrect answers and found it generalizes —
   so "right/wrong" signal is extractable from the representation. A 2024 paper
   ("True Facts") averaged correct vs incorrect representations, took the difference
   vector, and **added it to a would-be-wrong representation** to steer the model
   toward the correct answer. [src:y3]
2. **Change the harness / workflow** around the model. see also [[harness-engineering]]. [src:y3]
3. **Change the model's parameters directly** — i.e. the **reasoning** techniques now
   common in online models, which in 2025 were still relatively new. [src:y3]
