<p align="center"><img src="assets/social-preview.png" alt="mask — 蒸餾萬物，戴上任何人。" width="840"></p>
<p align="center">
  <a href="https://ttigger.github.io/mask"><b>網站</b></a>
  &nbsp;·&nbsp; <a href="https://github.com/TTigger/mask">GitHub</a>
  &nbsp;·&nbsp; <a href="README.md">English</a>
</p>
<p align="center">
  <a href="https://github.com/TTigger/mask/actions/workflows/ci.yml"><img src="https://github.com/TTigger/mask/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-111111?style=flat-square" alt="MIT 授權"></a>
  <img src="https://img.shields.io/badge/version-0.2.0-7C6BD6?style=flat-square" alt="版本 0.2.0">
  <img src="https://img.shields.io/badge/agents-AGENTS.md%20standard-111111?style=flat-square" alt="AGENTS.md 標準">
  <img src="https://img.shields.io/badge/API%20key-none-28c840?style=flat-square" alt="零 API key">
</p>

---

mask 是一個 agent-native、開源的框架，讓你把任何來源——YouTube 頻道、書、文章、網頁、程式碼、GitHub 專案——蒸餾成一個可切換的 persona；戴上它，你慣用的 AI agent（Claude Code、Cursor、Codex、Gemini…）就會用那個對象的口吻與視角回答你。

## 為什麼叫 mask

這個名字是三層雙關：

1. **persona 的拉丁文本義就是「面具」**——古典戲劇裡演員戴上的那張臉。換面具，就是換身分；這正是 mask 在做的事。
2. **能劇、戲曲面具背後是一整套匠人傳統**，戴上它的人能瞬間化身角色。那份「一秒入魂」的高手底蘊，是這個專案想要的氣質。
3. **在 CS 裡，mask 是「套在底層之上的遮罩」**。mask 做的，就是把一層 persona 蓋在你底層的 agent 之上——你的 Claude Code 還是那個 Claude Code，但戴上 mask 後，它用另一個人的口吻與背景知識回答你。

mask 偶爾帶有「假面、隱藏」的聯想，但我們刻意保留這層曖昧：mask 同時是**揭露**（讓你化身某人）與**遮蔽**（包覆底層 agent）。專案圖示也呼應這點——一張側面的假面，後面拖著重疊的陰影分身：你蒸餾了某個對象，然後戴上他的影子。

## 核心理念

- **萬物皆可蒸餾**：YT、書、文章、網頁、程式碼、GitHub 專案，任何你喜歡的來源都能蒸成一張 mask。
- **口吻優先（v1）**：先抓「他怎麼說話、怎麼想」，知識為輔，且每個論點都標來源、可回溯，把幻覺壓在可控範圍。
- **本地、屬於你**：每張 mask 就是一疊 Markdown + Git，存在你自己機器上，隨你手動微調。
- **agent-native、零 API key**：框架本身不呼叫任何 LLM；萃取與回答都借用你自己訂閱的 agent 的算力。
- **多人格並存**：像切換 skill 一樣，需要哪個場景就戴上哪張 mask。

## 怎麼用（零學習）

clone repo 之後，你全程用自然語言在你的 agent 裡操作 —— 不需要學 CLI：

```
「幫我蒸餾這個部落格」      # 擷取 → 你的 agent 萃取 → 存進本地 mask 庫
「我有哪些 mask」          # 列出名冊
「wear fireship」          # 切換；之後幾輪都用那個聲音回答
「ask gilfoyle: ...」      # 只問一次，不改變預設
```

## 安裝與使用

需要 [Bun](https://bun.sh)。框架以 clone 的 repo 散佈（工具本身）；你的 mask 另外存在 `~/.mask/`（它自己的 Git repo）。

```sh
git clone https://github.com/TTigger/mask && cd mask
./install.sh        # 裝相依 + 在 PATH 放一個 `mask` launcher
```

`install.sh` 放的 launcher 直接從這份 checkout 跑 CLI，所以 `git pull` 就更新、不用重 build。接著在任何專案裡：

```sh
mask init                              # Claude Code（預設）：orchestrator → ~/.claude/CLAUDE.md
cd 你的專案 && mask init --agent agents-md --out .   # 或在你的專案放一份通用的 AGENTS.md
```

> **接著開一個新的 agent session**，讓它讀到剛裝好的 orchestrator —— 然後就能說：*「幫我蒸餾這個部落格、讓我戴上它」*。`init` 只需跑一次（冪等；隨時可重跑來更新）。在你 init 之前，agent 並不認得 mask 工作流。

（不想用安裝腳本？`bun run dev <command>` 直接從 clone 跑 CLI。）

兩個 adapter 覆蓋所有 agent：

- **`claude-code`** —— 人格以 subagent 共存於 `~/.claude/agents/`；`wear` 切換一個黏性的全域預設。適合在多個 mask 之間切換。
- **`agents-md`** —— 寫一份專案層級的 **`AGENTS.md`**，這是 [跨工具標準](https://agentsmd.io)，**Codex、Gemini CLI、Cursor、Windsurf、Zed、Continue、Goose** 等 30+ 工具都原生讀取。單一啟用：`wear` 把人格換進 `mask:active` 區塊。`--out <dir>` 指定專案（不指定就裝在當前目錄）。

安裝到 `init` 之前都一樣，差別只在目標：

| | **Claude Code** | **其他全部**（Codex · Gemini · Cursor · Windsurf · Zed · …）|
|---|---|---|
| init | `mask init` | `cd 你的專案 && mask init --agent agents-md --out .` |
| 裝去哪 | `~/.claude/CLAUDE.md`（**全域**）| `你的專案/AGENTS.md`（**專案層級**）|
| 範圍 | 到處都戴著 | 每個專案各一份 AGENTS.md |
| 人格 | 多個 subagent 共存；`wear` 切換黏性預設 | 單一啟用；`wear` 換 `mask:active` 區塊 |
| 誰讀這份檔 | 只有 Claude Code | 一份 AGENTS.md → 30+ 工具原生讀 |

你的 mask（`~/.mask/`）與所有指令都**與 agent 無關** —— 蒸餾一次，今天在 Claude 戴、明天在 Cursor 戴；只有「戴上去的機制」會適應 agent。想讓 Claude Code 也用同一份通用檔，在 `CLAUDE.md` 加一行 `@AGENTS.md`（import），或把 `CLAUDE.md` symlink 到 `AGENTS.md`。

各來源需要的外部工具（只在用到該來源時需要）：repo 要 `git`、YouTube 要 `yt-dlp`、PDF 要 `pdftotext`（poppler）。部落格不需要。

### 指令一覽

CLI 是決定性的、**不呼叫任何 LLM** —— 智慧工作由你的 agent 跟著 recipe 完成。平常用自然語言驅動（見上），但這些指令也都直接存在：

| | |
|---|---|
| `mask init` | 建立 mask 庫 + 安裝 orchestrator |
| `mask ingest <src…>` | 擷取來源（部落格 / YouTube / repo / PDF）成樣本；`--blend` 把多個合併成一個聲音中性的 mask |
| `mask reduce <dir>` | 去重 / 抽樣 / 截斷 → 適合 context 大小的 digest |
| `mask redistill <slug> <src…>` | 重新擷取來源，只 staging 有變動的部分（版本遞增）|
| `mask scale <dir>` | opt-in：用你自己的 headless agent CLI 對超大語料 map-reduce |
| `mask compile <slug>` | mask.md → 當前 agent 的原生人格檔 |
| `mask wear <slug>` · `list` · `status` | 切換 / 名冊 / 現在戴誰 |
| `mask coverage <slug>` | 這個 mask 站在多少證據上（從它的出處）|
| `mask statusline` | agent statusline 用的精簡 active-mask 徽章 |
| `mask unwear` · `remove <slug>` | 清理 managed 產物 / 刪除一個 mask |

### 環境變數

- `MASK_HOME` —— mask 庫位置（預設 `~/.mask`）。
- `MASK_CLAUDE_MD` —— Claude Code 的 orchestrator 檔（預設 `~/.claude/CLAUDE.md`）。
- `MASK_AGENTS_MD` —— AGENTS.md 安裝目標（預設 `./AGENTS.md`；`init --out <dir>` 會設定它）。
- `MASK_FRAMEWORK` —— 跑**獨立編譯二進位**時設定，讓 agent 仍找得到磁碟上的 recipe/templates；指向 clone 的 repo。（用 `bun run`/launcher 時不需要，會自動解析。）

## License

MIT
