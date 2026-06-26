# Self-improving AI

The dream is old: in **1965**, statistician **I. J. Good** described an "ultra-
intelligent machine" — an AI able to create an even better AI — as **humanity's last
invention** (after that, a technology explosion needs no humans). The topic resurged
when (per the lecture) an Anthropic cofounder wrote that he reluctantly puts ~60%
odds that by end of **2028**, AI R&D no longer needs humans — "crossing the Rubicon"
(an irreversible step, from Caesar crossing the river to start a civil war). [src:y2]

Key honesty point: **"AI 自我成長並沒有明確的定義"** — there's no crisp definition.
Read the flood of "self-improving" papers and you find it's really **a process of
humans gradually letting go**: most still have humans in the loop, just *less* than
before, and call that self-improvement. [src:y2]

Framed via the 3-step ML recipe (what function / which candidate functions / pick
the best by gradient descent), the "我 (I)" in steps 1–2 used to mean a human; the
question is how much of that "I" can become the AI itself. A first handle: stop
having humans label data — let a stronger AI generate the "correct answers" a weaker
AI learns from (since supervised learning's ground truth is otherwise human-made). [src:y2]
