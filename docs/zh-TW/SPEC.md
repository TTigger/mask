# mask — SPEC（技術規格）

本文件承接 `PRD.md`，描述 mask 的技術架構與實作契約。

---

## 1. 架構總覽

核心原則：**借用算力。** 框架本身完全不呼叫任何 LLM；所有需要智能的步驟（理解意圖、範圍收斂、萃取）都丟回使用者自己訂閱的 agent 去跑。框架是「擷取 + 產出檔案 + 編譯成各家原生格式」的純 deterministic 工具集。

分層（由上而下）：

```
來源 anything（blog / YT / 文章 / 網頁 / 程式碼 / GitHub）
   ↓ ingestion（yt-dlp / git clone / fetch+readability / pdf）— 純工具
   ↓ extraction（recipe 在使用者的 agent 裡跑）— 借用算力，唯一需要智能的一層
   ↓ persona store（Markdown + JSON + Git）— 你的本地 mask 庫
   ↓ adapters / compile（canonical → 各家原生格式）— 純工具
   ↓ 目標 agent：claude-code（subagent）或 agents-md（通用 AGENTS.md，Codex / Cursor / Gemini / Windsurf / Zed… 原生讀取）
```

**雙層介面**：對人類是自然語言；對 agent 是 CLI + 工具。repo 的 orchestrator 指令把 agent 變成操作員，agent 在背後呼叫 CLI。

---

## 2. 執行模型

- **in-agent 萃取為主軸。** 使用者「當下打開的那個 agent」在同一個對話裡完成所有智能工作，包含萃取本身（讀檔案、寫檔案）。→ 零 API key + 天生 agent-agnostic。
- **CLI = agent 的 deterministic 工具箱**，零 LLM：`ingest`、`reduce`、`compile`、`registry`/state。
- **`reduce` 是讓 in-agent 萃取可行的橋。** context window 塞不下整個頻道；CLI 先用便宜手段（抽樣、去重、salience、結構化抽取）把原料壓成一份塞得進 context 的精簡 digest，agent 只對 digest 做萃取。
- **v1 萃取一律單來源有界**：一個具體來源 → 一張 mask，不混合、不大批次。大範圍請求走 PRD §7.2 收斂協議後逐一蒸成單張 mask。
- **延後（不進 v1）**：headless map-reduce（`claude -p` / `gemini -p` / `codex exec`）作為 opt-in「規模模式」，藏在同一份 recipe 契約後面。

---

## 3. mask 檔案格式（spec-as-data）

### 3.1 庫與框架分家

- `~/.mask/` 是**你的 mask 庫**，自己的 git repo（框架第一次跟你對話時幫你 `git init`）。
- clone 下來的**框架 repo** 只是工具，可隨時 `git pull` 更新而不動到你的 mask。

### 3.2 庫結構

```
~/.mask/
  config.json                 # 預設 agent、庫設定
  _active                     # sticky 預設 mask（slug）
  _registry.json              # 所有 mask 的名冊
  fireship/                   # 一張 mask（slug）
    mask.md                   # frontmatter(meta) + 內文(口吻側寫) — 心臟
    knowledge/
      index.md                # 主題 → 檔案對照，給 agent grep 導航
      <topic>.md              # 知識塊，每塊帶 [src:…] 出處
    examples.md               # few-shot：這個口吻會怎麼回答
    sources.json              # 出處：來源 URL/ID、抓取日、抽樣資訊、hash
```

### 3.3 `mask.md`

單檔，同時給人改、給機器讀。frontmatter 為 meta、內文為口吻側寫（六段）：

```markdown
---
name: Fireship
slug: fireship
type: voice          # voice ｜ code(未來) ｜ …
source_kind: blog    # blog ｜ youtube ｜ repo ｜ …
created: 2026-06-18
version: 1
tags: [webdev, opinionated, fast-paced]
---

# 身分
你以 Fireship 的口吻回答……（一段定錨）

## 口吻與語氣
具體描述：節奏、句長、用詞、幽默感、強調什麼、口頭禪……

## 核心立場 / 慣性觀點
他會反覆主張的觀點、慣用的思維框架

## 慣用詞彙與語癖
招牌句、行話、口頭禪

## 邊界 / 不會說的話
反模式；不得超出 knowledge 捏造事實

## 回答方式
給戴上它的 agent 的行為指令：先觀點再論證、保持精煉、事實標來源……
```

### 3.4 知識：參照不內嵌

戴上 mask 時，compiler 只把 `mask.md`（身分 + 口吻 + 回答方式）編進 adapter；`knowledge/` 留在原地，讓 agent 用 file read / grep 自己撈。這是不靠 embedding 的 agent-native RAG，也讓 context 保持精瘦。

---

## 4. 出處與引用鏈

`[src:id]` 這條線端到端貫穿：

```
來源 → ingest → reduce(samples 帶穩定 id) → recipe 引用 id → knowledge [src:id] → sources.json 映射 id→原始
```

`mask.md` 的「回答方式」明文要求：風格隨意，但事實性主張要追溯得到某個 knowledge 塊，否則明說是推測。幻覺被框在這裡。

---

## 5. 萃取 recipe

一份隨 repo 出貨的多 pass 程序，agent 拿 reduce 後的 digest 照著做，**每個 pass 都 checkpoint 落地**（可中斷、可續跑、可逐段檢查）：

1. **Pass 1 · 口吻分析** — 讀 digest，抽出可觀察的口吻特徵，**每個特徵附證據樣本**。
2. **Pass 2 · 側寫合成** — 轉成 `mask.md` 六段，描述需可執行（另一個 agent 光讀就能重現口吻）。
3. **Pass 3 · 知識抽取** — 把實質觀點 / 主張 / 框架寫進 `knowledge/*`，每塊標 `[src:id]`，建 `index.md`。
4. **Pass 4 · 範例** — 產 2–4 組「Q → 以此口吻回答」樣本寫進 `examples.md`。
5. **Pass 5 · 忠實度自檢** — 比對 digest，標記過度宣稱 / 缺證據 / 不可追溯的主張。

原則：證據優先、口吻 ≠ 摘要、側寫可執行、覆蓋誠實（薄 digest 要自陳邊界與「口吻未知」範圍）。

**一份共用 voice recipe**，由各來源的 ingest+reduce 正規化成共同 digest 餵入。新增來源 ≈ 只加一組 ingest+reduce，recipe 不動。

---

## 6. 擷取與 reduce

- **ingest（per source）**：blog → fetch + `@mozilla/readability`；youtube → yt-dlp 字幕（Phase 1）；repo → git clone + 結構抽取（Phase 2）。輸出正規化 samples。
- **reduce**：去重、抽樣（大來源取最高觀看 / 最近 N）、salience、結構化抽取 → digest。
- **digest 格式**：帶穩定 id 的樣本集（`{ id, src_ref, text }`），recipe 以 id 引用，貫穿引用鏈。

---

## 7. adapter / 編譯層

**共用編譯核心 → 各家 renderer**：`mask.md` 正規化成中介「persona unit」（身分＋口吻＋回答方式＋知識路徑＋範例路徑），各 adapter 各自渲染。

兩種 config artifact 分開：**orchestrator 指令**（教 agent 怎麼當操作員，安裝一次）vs **編譯出的 mask**（一張張人格，wear 時才裝）。

### 7.1 Claude Code（subagent，多人格並存）

每張 mask 編成 `~/.claude/agents/<slug>.md`（預設全域，跟著你跨專案）：

```markdown
---
name: fireship
description: 以 Fireship 的口吻回答 webdev/前端；快、精煉、有觀點
---
你以 Fireship 的口吻回答。
[身分 / 口吻 / 立場 / 語癖 / 邊界 / 回答方式 — 取自 mask.md]

## 知識
知識庫在 ~/.mask/fireship/knowledge/。回答事實前先 grep/讀取，
主張標 [src:…]；無依據就明說推測、不捏造。口吻對齊 examples.md。
```

所有 mask 常駐可定址；`_active` 為 sticky 預設，由 `CLAUDE.md` orchestrator 區塊路由：

```markdown
<!-- mask:orchestrator -->
沒指名 mask 時 → 委派給 active 預設（讀 ~/.mask/_active）。
「戴上 X / 用 X 回答」→ 更新 _active；「問 X：…」→ 單次委派 X。
<!-- /mask:orchestrator -->
```

### 7.2 AGENTS.md（單一 context，active-swap）

`wear` 改寫 `AGENTS.md`（專案根）裡一段有標記的 managed block，只動自己那段：

```markdown
<!-- mask:active fireship -->
你目前戴著 Fireship。
[身分 / 口吻 / … 取自 mask.md]
知識庫：~/.mask/fireship/knowledge/（讀後標 [src:…]，無依據則明說推測）
<!-- /mask:active -->
```

切換 = 重寫這段成另一張 mask，天生單一 active。

### 7.3 受管 artifact

所有編譯產物都是**框架擁有、有標記**的 artifact，`unwear` / 移除能乾淨清掉，不污染使用者既有設定。安裝位置：Claude Code 預設全域，AGENTS.md 專案根，皆可設定。

---

## 8. CLI 介面（agent 的手）

| 指令 | 作用 |
|---|---|
| `mask init` | 初始化 `~/.mask/` 庫、偵測 agent、裝 orchestrator |
| `mask ingest <src>` | 依來源擷取原料 → 正規化 samples |
| `mask reduce` | 去重/抽樣/salience → digest |
| `mask compile <slug>` | mask.md → persona unit → 當前 agent 原生檔 |
| `mask wear <slug>` | 設為 active（subagent 路由 / swap block） |
| `mask list` | 名冊（名稱/來源/描述/上次/active） |
| `mask status` | 目前戴著誰 |
| `mask unwear` / `mask remove <slug>` | 清掉受管 artifact / 移除 mask |

`mask add <src>` 是給 agent 的高層協作流程（擷取 → 提示 agent 跑 recipe → 寫入庫），多由 orchestrator 驅動。

---

## 9. 技術棧與散布

- **語言**：TypeScript（保持 Node 相容）。
- **執行 / 打包**：Bun。`bun build --compile` 產出自帶 runtime 的跨平台單一執行檔（含 `bun-windows-x64`），啟動個位數毫秒、無外部依賴。
- **散布三管齊下**：下載執行檔（非 JS 使用者）/ `bunx`、`npx`（已有 Node）/ clone 原始碼（貢獻者）。
- **License**：MIT。
- **Phase 0 最小依賴**：`gray-matter`（frontmatter）、`@mozilla/readability` + `jsdom`（blog 擷取）、CLI 框架（commander 之類）、`simple-git`。yt-dlp / git clone 等後續來源再加。

---

## 10. repo 結構（框架，與 `~/.mask/` 分家）

```
mask/
  README.md  package.json  LICENSE  assets/mask-icon.svg
  src/                    # CLI（TS，零 LLM）
    cli.ts
    commands/             # ingest · reduce · compile · wear · list · status …
    lib/                  # library(庫/registry/active/git) · digest(樣本+id)
  ingest/                 # 各來源擷取：blog(P0) · youtube · repo
  recipes/                # 萃取 recipe：voice/RECIPE.md(P0) · code/
  adapters/               # claude-code/(orchestrator+subagent 模板) · agents-md/
  templates/              # mask.md / knowledge 骨架
  docs/                   # PRD.md · SPEC.md · PHASES.md
```

---

## 11. 安全 / 邊界

- **版權 / ToS**：mask 定位為個人本地工具，使用者蒸餾**自己要用**的內容、自用；不做可再散布的 persona 市集。把這層風險留在使用者端、保持框架中立。
- **覆蓋誠實**：mask 自陳依據範圍與「口吻未知」邊界，避免過度自信。
- **幻覺壓制**：創作端（Pass 5 忠實度自檢）+ 回答端（[src:] 引用契約）雙重把關。
