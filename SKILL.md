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