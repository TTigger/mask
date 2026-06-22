# mask — PHASES（分階段交付）

每個 phase 都自成可用的東西。Phase 0 = 能 demo 的 MVP。

---

## Phase 0 — 打通整條 loop（MVP）

**目標**：在 Claude Code 上，用部落格來源，把 `講話 → 蒸餾 → 戴上 → 回答` 端到端跑通，全程零 API key。

**任務拆解**

- **0.1** 專案骨架：Bun + TS 設定、`package.json`、CLI entry（`src/cli.ts`）、commander 接線。
- **0.2** 庫初始化：`mask init` → 建 `~/.mask/`、`git init`、`config.json`、`_registry.json`、`_active`。
- **0.3** library lib：registry 讀寫、active 指標、每次變更自動 git commit。
- **0.4** Claude Code orchestrator：`adapters/claude-code/orchestrator.md` 模板 + 安裝到 `CLAUDE.md` managed block；定義自然語言意圖路由（add / wear / list / status）。
- **0.5** blog ingest：`ingest/blog/` — fetch + `@mozilla/readability` → 正規化 samples（多篇文章）。
- **0.6** reduce：去重 / 抽樣 / salience → digest。
- **0.7** digest 格式定義（`{ id, src_ref, text }`）+ `sources.json` 出處寫入。
- **0.8** voice recipe：`recipes/voice/RECIPE.md`（五個 pass）+ `templates/`（mask.md / knowledge 骨架）。
- **0.9** compile：`mask.md → persona unit → Claude Code subagent` renderer（`adapters/claude-code/`）。
- **0.10** wear / list / status：sticky active；經 orchestrator 由自然語言觸發。
- **0.11** 端到端串接 + dogfood：蒸一個部落格 → wear → 提問 → 驗收口吻 + `[src:]`。
- **0.12** README / 安裝（`bun build --compile` 產 binary + bunx 路徑）+ 基本測試。

**驗收（exit criteria）**

- `mask add <blog> → wear → 提問` 在 Claude Code 端到端成功，無 API key。
- 產出的 mask 是人類讀得懂、改得動的資料夾。
- 切換是一句話，下一回合生效。
- 事實主張帶 `[src:]`、可回溯到 `sources.json`。

---

## Phase 1 — 證明 portability + 旗艦來源

**目標**：第二個 agent + YouTube 來源，達成 PRD「≥2 agent」成功標準。

**任務**

- **1.1** persona unit 抽象收斂（把 0.9 的 Claude Code 專屬部分抽成共用核心）。
- **1.2** AGENTS.md adapter：orchestrator + active-swap managed block + 乾淨安裝/更新/移除。
- **1.3** YouTube ingest：`ingest/youtube/` — yt-dlp 抓字幕、去除雜訊、正規化 samples。
- **1.4** reduce 強化：大頻道抽樣策略、字幕雜訊清理。
- **1.5** 沿用同一份 voice recipe 驗證抗噪萃取；對照 blog 結果調 recipe。

**驗收**：同一張 mask 能編譯到 Claude Code 與 AGENTS.md 兩種 agent；YouTube 蒸出的 mask 口吻可辨識。

---

## Phase 2 — 第二種風味 + 多來源

**目標**：程式碼專家（知識優先），與收斂協議產出多張 mask。

**任務**

- **2.1** `type: code` 的 mask 變體 + `recipes/code/`（慣例/idiom 優先，而非口吻）。
- **2.2** repo ingest：`ingest/repo/` — git clone、檔案樹、lint 規則、README、慣例抽取。
- **2.3** 收斂協議執行多張單來源 mask（一次請求 → 數張 mask）。
- **2.4**（可選）Cursor / Gemini adapter —— *v0.2 已收斂*：併入單一 `agents-md` adapter，因為 Cursor、Gemini 等 30+ 工具都原生讀標準 `AGENTS.md`。

**驗收**：能蒸出可用的「某 repo 程式碼專家」；一個大範圍請求能收斂並逐一產出多張 mask。

---

## Phase 3 — 規模模式 + 收尾

**目標**：超大語料與長尾來源、品質與維運收尾。

**任務**

- **3.1** headless「規模模式」opt-in：`claude -p` / `gemini -p` / `codex exec` 對超大語料分塊 map-reduce，藏在同一份 recipe 契約後。
- **3.2** book / PDF 來源（含版權邊界提示）。
- **3.3** mask 版本化 / 重蒸（source 更新 → diff → 增量更新）。
- **3.4** 明講式綜合 knowledge-blend mask（多來源、口吻中性化、標清楚）。
- **3.5** 覆蓋誠實報告、名冊體驗、statusline 等打磨。

**驗收**：能處理一個無法塞進單次 context 的大來源；既有 mask 可重蒸更新。

---

## 下一步

Phase 0 鎖定後，第一個實作 artifact 是 `CLAUDE.md`（orchestrator）——它把 agent 變成 mask 操作員，是整個「對話優先」體驗的起點。
