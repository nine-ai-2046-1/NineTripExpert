# SKILL.md - Trip Expert Skill for AI Agents (OpenClaw / Kiro-CLI)

## 1. 技能描述 (Description)
此技能允許 AI Agent 透過調用本地 Python 腳本 `trip_expert.py`，利用 Google Gemini 2.5 Flash 搭配 Google Maps 工具進行即時的日本旅遊行程規劃、地點搜尋及交通導航。

## 2. 整合規範 (Integration Specs)

### 執行指令 (CLI Command)
python trip_expert.py "{{query}}" --context "{{context_name}}" --env-key "{{env_var_name}}"

## 3. 參數範例 (Example Parameters)

參數,類型,說明,範例
query,位置參數 (String),用戶的提問內容或追問。,"""KIX去日本橋點行？"""
--context,選項 (String),對話識別碼，用於維持多輪對話背景。不需加 .json。,"""user_session_001"""
--env-key,選項 (String),存放 API Key 的環境變數名稱（預設：GEMINI_KEY_SKILL）。,"""PROD_API_KEY"""
--read-context,旗標 (Flag),僅讀取並回傳目前的對話歷史 JSON 數據。,--read-context
--write-context,選項 (JSON String),用於手動覆蓋/總結對話歷史。,"'[{""role"":""user"",""parts"":[{""text"":""Summary...""}]}]'"


3. 輸出處理 (Output Handling)
Agent 應根據輸出內容的格式進行判斷：

純文字 (Plain Text): 表示執行成功。內容即為 AI 的回覆，應直接呈現給用戶。

JSON 格式: 表示發生錯誤。

範例：{"error": true, "message": "Environment variable not found"}

Agent 應解析 message 並回報系統錯誤。

4. 使用時機 (Trigger Conditions)
當用戶詢問關於日本的交通方式、地鐵轉乘、景點推薦、營業時間。

當用戶要求安排一日遊或多日旅遊計畫。

當用戶對先前的旅遊建議進行追問時。

5. 環境設定 (Setup Requirements)
依賴庫: pip install google-genai python-dotenv

權限: 確保腳本對 contexts/ 目錄有讀寫權限。

API Key: 需在 .env 或環境變數中設定有效的 Gemini API Key。

6. Context 管理策略
新建對話: Agent 應分配一個隨機的 context_name 給新對話。

持久化: 歷史紀錄自動儲存於 contexts/{{context_name}}.json。

Token 優化: 若對話過長，Agent 可利用 --read-context 取得歷史，進行 Summarize 後，透過 --write-context 寫回精簡版本。


---

## 7. 子技能：Flight Planner（航班搜尋）

### 描述
當行程規劃涉及飛機交通時，使用 `flight_planner/flight_planner.js` 從 Booking.com 搜尋各航段最平機票。

### 使用場景
- 用戶查詢行程中需要乘搭飛機的航段
- 用戶詢問某航線的機票價格或班次時間
- 規劃多段式行程（如：香港→東京→大阪→香港）

### Agent 行為規則
1. 當 trip_expert 回覆涉及飛機交通時，**主動詢問用戶**：「需要我幫你查一下航班資訊嗎？」
2. 用戶確認後，提取行程中的航段資訊（出發地 IATA code、目的地 IATA code、日期）
3. 調用 flight_planner 取得航班數據
4. 將航班資訊整合到行程回覆中

### 執行指令
```bash
node /path/to/flight_planner/flight_planner.js \
  --segments '[{"from":"HKG","to":"NRT","date":"2026-05-01"},{"from":"NRT","to":"HKG","date":"2026-05-07"}]' \
  --currency HKD \
  [--direct]
```

### 參數說明
| 參數 | 類型 | 說明 | 預設 |
|------|------|------|------|
| `--segments` | JSON Array | 航段列表，每段含 from/to/date（IATA code） | 必填 |
| `--currency` | String | 貨幣代碼 | `HKD` |
| `--direct` | Flag | 只搜尋直飛航班 | 否 |

### 輸出格式
成功時輸出 Markdown 表格 + JSON：
```
| 段 | 航班 | 路線 | 出發 → 抵達 | 飛行時間 | 最低價 |
|----|------|------|------------|---------|--------|
| 1 | Cathay Pacific | HKG → NRT | 09:30 → 14:45 | 4h 15m 直飛 | HKD1,200 |
{"success":true,"results":[...]}
```

失敗時：`{"error": true, "message": "..."}`

### 注意事項
- 需要 `playwright-core`（Node.js）
- 價格為 Booking.com 即時數據，僅供參考
