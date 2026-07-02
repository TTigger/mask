#!/bin/sh
# demo presenter for the README GIF -- a pre-scripted "agent session".
# demo/demo.tape (vhs) types the user's lines into the prompts below; this
# script plays the agent's side. Substantive content (pipeline shape, sample
# ids, the answer, its [src:] citations) is sourced from examples/micrograd --
# see docs/superpowers/specs/2026-07-02-demo-gif-and-install-ps1-design.md.

# clear + home first, so the (hidden) launch line never shows in the recording
printf '\033[2J\033[H'

p()   { printf '%s\n' "$1"; }
dim() { printf '\033[2m%s\033[0m\n' "$1"; }
ok()  { printf '\033[32m%s\033[0m\n' "$1"; }
prompt() { printf '\n\033[35m\342\235\257 \033[0m'; }

# round 1: "distill karpathy/micrograd for me"
prompt; read -r _
sleep 0.6
dim '  ingest    github.com/karpathy/micrograd -> 6 samples'
sleep 0.9
dim '  reduce    -> digest (r1..r6)'
sleep 0.9
dim '  extract   conventions / architecture / APIs   [recipe: code]'
sleep 0.9
dim '  compile   -> subagent installed'
sleep 0.6
ok  '  distilled micrograd -- say "wear micrograd"'

# round 2: "wear micrograd"
prompt; read -r _
sleep 0.5
ok '  wearing micrograd  (code expert / karpathy/micrograd)'

# round 3: the question
prompt; read -r _
sleep 0.9
p ''
p '[micrograd] backward() builds a topological order with a post-order'
p 'DFS over _prev, seeds self.grad = 1, then runs each _backward() in'
p 'reversed(topo) [src:r3]. Gradients accumulate with += -- that is what'
p 'keeps a Value reused in several subexpressions correct [src:r3].'
sleep 3

# end card
printf '\n\n'
p '   Distill anything. Wear anyone.'
dim '   github.com/TTigger/mask'
sleep 3
