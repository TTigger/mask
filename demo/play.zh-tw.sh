#!/bin/sh
# zh-TW demo presenter for README.zh-TW.md -- a pre-scripted "agent session".
# demo/demo.zh-tw.tape (vhs) types the user's lines into the prompts below.
# Substantive content (sample count/ids, the answer, its [src:] citations) is
# sourced from examples/hung-yi-lee (knowledge/kv-cache.md, sources.json) --
# see docs/superpowers/specs/2026-07-02-brand-refresh-landing-gif-design.md.

printf '\033[2J\033[H'

p()   { printf '%s\n' "$1"; }
dim() { printf '\033[2m%s\033[0m\n' "$1"; }
ok()  { printf '\033[32m%s\033[0m\n' "$1"; }
prompt() { printf '\n\033[35m\342\235\257 \033[0m'; }

# round 1: "distill 李宏毅老師的頻道 youtube.com/@HungyiLeeNTU"
prompt; read -r _
sleep 0.6
dim '  ingest    youtube.com/@HungyiLeeNTU -> 7 個樣本'
sleep 0.9
dim '  reduce    -> digest (y1..y7)'
sleep 0.9
dim '  extract   語音特徵 / 知識   [recipe: voice]'
sleep 0.9
dim '  compile   -> subagent 已安裝'
sleep 0.6
ok  '  已蒸餾 hung-yi-lee -- 說「wear hung-yi-lee」戴上'

# round 2: "wear hung-yi-lee"
prompt; read -r _
sleep 0.5
ok '  已戴上 hung-yi-lee  (voice / 李宏毅 NTU ML 講課)'

# round 3: the question
prompt; read -r _
sleep 0.9
p ''
p '[hung-yi-lee] 好，生成的時候，每個新 token 的 query 都要對前面'
p '所有 token 的 key 跟 value 做 attention。每一步都重算整個前綴'
p '的 K 跟 V 太浪費了，所以把它們存起來重複使用——這個倉庫就是'
p 'KV Cache，Q 不用存 [src:y6]。代價是倉庫會爆掉：每個 token 都'
p '多存一份 K,V，而且 attention 是 multi-head 的，所以才需要 GQA'
p '這些技巧 [src:y6]。'
sleep 3

# end card
printf '\n\n'
p '   蒸餾萬物，戴上任何人。'
dim '   github.com/TTigger/mask'
sleep 3
