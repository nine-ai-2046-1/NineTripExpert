# Gemini 行程專家 CLI 工具

## 1. 快速開始
1. 安裝套件：`pip install google-genai python-dotenv`
2. 設定金鑰：建立 `.env` 檔案並填入 `GEMINI_KEY_SKILL=你的_API_KEY`，如已在系統的Environment variable設定則不用.env

## 2. 功能特點
- **自動目錄管理**：程式執行時會自動建立 `contexts/` 資料夾。
- **結構化輸出**：成功時輸出純文字，失敗時輸出 JSON 錯誤訊息，適合腳本串接。

## 3. 使用指令範例
- **延續對話**：`python trip_expert.py "嗰度附近有咩好食？" --context my_trip`
- **管理歷史**：`python trip_expert.py --read-context --context my_trip`