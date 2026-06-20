<p align="center">
  <img src="assets/mask-icon.svg" width="140" alt="mask" />
</p>

<h1 align="center">mask</h1>

<p align="center"><em>Distill anything. Wear anyone.</em><br/>蒸餾萬物，戴上任何人。</p>

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

## 怎麼用（草圖）

```bash
mask add https://youtube.com/@someone   # 擷取 → 你的 agent 萃取 → 寫進本地 persona 庫
mask list                                # 看你有哪些 mask
mask wear someone                         # 戴上 → 編譯成當前 agent 的原生格式
```

戴上之後，就照常跟你的 agent 對話，它便以該 mask 的口吻與背景知識回答。隨時 `mask wear <另一個>` 即可切換。

## 狀態

早期開發中（early WIP）。完整的 `PRD → PHASES → CLAUDE.md` 規格正在制定中。

## License

MIT
