# mask — PRD（產品需求文件）

> Distill anything. Wear anyone. — 蒸餾萬物，戴上任何人。

## 一句話

mask 是一個 agent-native、開源的框架，讓你把任何來源（部落格、文章、YouTube 頻道、程式碼、GitHub 專案）蒸餾成一張可切換的 persona；戴上它，你慣用的 AI agent（Claude Code、Codex、Cursor、Gemini…）就會用那個對象的口吻與視角回答你。全程本地、零 API key。

---

## 1. 問題與願景

我們每天都會遇到「想把某個對象的腦袋隨身帶著」的時刻——一個創作者的觀點、一本書的思維、一個 codebase 的慣例。但這些知識今天都鎖在來源裡。

mask 讓任何人把任何來源蒸餾成一張可切換的 persona，跑在自己既有的 AI agent 裡：**口吻優先、完全本地、零 API key**。使用者 clone/fork 這個專案後，只要打開 agent CLI，用自然語言就能驅動整套功能，不需要理解內部如何運作。

---

## 2. 第一原則

1. **對話優先 / 零學習成本。** clone repo 即得一個「會操作 mask 的 agent」。使用者全程用自然語言驅動，永遠不需要學指令或理解內部。CLI 是 agent 的執行層，不是使用者的學習負擔。
2. **口吻優先（v1）。** 先抓「他怎麼說話、怎麼想」，知識為輔，且每個事實主張都標來源、可回溯。
3. **本地、屬於你。** 每張 mask 就是一疊 Markdown + Git，存在你自己機器上，隨你手動微調。蒸餾成果永遠可攜、可備份、屬於你。
4. **零 API key。** 框架本身不呼叫任何 LLM；萃取與回答都借用使用者自己訂閱的 agent 的算力。
5. **agent-agnostic。** 任何「能跑 shell + 能讀寫檔案」的 agent 都能用，不綁特定廠商。

---

## 3. 目標（v1）

- 把一組定義好的來源類型，蒸餾成可攜帶、純本地的「mask」（persona 包）。
- 讓使用者在既有 agent 裡切換 active mask（`wear`），像切換 skill 一樣。
- 零 API key：所有 LLM 運算都借用使用者自己訂閱的 agent。
- persona 是純檔案（Markdown + Git），可手改、全本地。
- 至少在兩個 agent 上跑通（證明 adapter 抽象成立）。

## 4. 非目標（v1）

- 不做 hosting、不做 persona 市集 / registry。開源的是**方法與框架**，每個人蒸餾自己要用的東西、自用。
- 不碰模型訓練 / fine-tune / embedding 基礎設施（維持 file + agent-native）。
- 不追求知識的完美還原——口吻優先，知識標來源、有邊界。
- 不做 GUI（v1 只有 CLI + 檔案 + 自然語言）。

---

## 5. 使用者

- **主要**：已經在用 agent CLI（Claude Code / Codex / Cursor / Gemini）的開發者與 power user，想隨需取用喜歡來源的口吻與視角。
- **次要**：想蒸餾「自己」來分享這套方法的創作者（分享的是方法，不是 hosted persona）。

## 6. 核心使用情境

1. 蒸餾一個部落格 / 作者文集 → 戴上 → 用該作者的口吻問它問題。
2. 蒸餾一個 YouTube 頻道 → 戴上 → 用該創作者的口吻回答（Phase 1）。
3. 蒸餾一個 GitHub repo → 戴上「這個 repo 的程式碼專家」→ 用它的慣例回答（Phase 2）。
4. 同時養多張 mask，依任務切換（程式碼專家 → 文章專家）。
5. 直接手改某張 mask 的 markdown 來微調口吻。

---

## 7. 關鍵產品行為

### 7.1 雙層介面（自然語言操作）

- **對人類 = 純自然語言。** repo 自帶 orchestrator 指令（寫在 `CLAUDE.md` / `AGENTS.md`），把使用者的 agent 變成「mask 操作員」。使用者用講的：「幫我 mask 這個頻道」「戴上程式碼專家」「我有哪些 mask」。
- **對 agent = CLI 與工具。** `mask add / ingest / reduce / compile / wear / list` 等指令是 **agent 的手**，由 agent 在背後呼叫，使用者不需要知道。

### 7.2 範圍收斂協議（處理模糊 / 大範圍指令）

任何蒸餾，在真正動手前，都必須先被收斂成「一份具體、有限的來源清單」。流程：

1. 使用者自然語言請求進來。
2. agent 判斷：能否解析成具體、有限的來源？
3. **不行（太廣 / 模糊）** → mask 提候選來源 + 釐清（要單一口吻？哪幾個頻道？綜合還是分開？）→ 使用者縮小 → 重判。
4. **可以** → 顯示計畫 + 估量（大來源建議抽樣）→ 使用者確認 → 蒸餾 → 寫入本地。

預設：**口吻優先 → 一個來源一張 mask（一個聲音）**；綜合多來源的 knowledge-blend mask 只在使用者明講時才做，並標清楚口吻會中性化。大來源預設抽樣，並在「顯示計畫」那步讓使用者加碼或縮減。

### 7.3 多身分切換（零學習成本）

1. **用講的切換。** 「戴上 X」「用 X 回答」「現在誰在線」「我有哪些 mask」——自然語言就是切換介面。
2. **active mask 永遠看得見且 sticky。** active mask 注入 agent context、回答時自報身分；戴上一次後維持到你換，中間正常聊天不必每句重講。
3. **一目了然的名冊。** 「我有哪些 mask」回一張清單：名稱、來源、一句話描述、上次使用、誰是 active。
4. **多人格並存、對使用者只有一套詞彙。** 底層依 agent 能力分兩種機制（subagent 並存型 vs 單一 active swap 型），但使用者講的話一模一樣。

---

## 8. 成功標準（v1）

- `mask add → wear → 提問` 能在「至少 1 種來源 × 至少 1 個 agent」端到端跑通，全程無 API key。
- 蒸餾出的 mask 是一個人類讀得懂、改得動的資料夾。
- 切換 mask 是一句話，下一個 agent 回合就生效。
- 同一張 mask 能編譯到 ≥2 個 agent 的原生格式。

## 9. 未來（超出 v1）

- 更多來源：GitHub repo / 程式碼專家、book/PDF。*(已實作)*
- 透過標準 `AGENTS.md` adapter 廣泛支援各 agent（Cursor、Gemini、Codex、Windsurf、Zed…）。*(已實作；一個 adapter 通吃，而非每個工具各一)*
- headless「規模模式」（`claude -p` 等）處理超大語料。*(已實作)*
- mask 版本化 / 重蒸、明講式的綜合 knowledge-blend mask。
