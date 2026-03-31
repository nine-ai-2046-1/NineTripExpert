# SKILL.md - Flight Planner Skill

## 1. 技能描述
透過 Booking.com 搜尋各航段最平機票，返回航班時間、航空公司及價格。

## 2. 執行指令
```bash
node flight_planner.js \
  --segments '[{"from":"CGK","to":"TPE","date":"2026-06-10"},{"from":"TPE","to":"AOJ","date":"2026-06-11"}]' \
  --currency HKD \
  [--direct]
```

## 3. 參數說明
| 參數 | 類型 | 說明 | 例子 |
|------|------|------|------|
| `--segments` | JSON Array | 航段列表，每段含 from/to/date | `[{"from":"HKG","to":"NRT","date":"2026-05-01"}]` |
| `--currency` | String | 貨幣（預設 HKD） | `HKD`, `TWD`, `USD` |
| `--direct` | Flag | 只搜尋直飛航班 | `--direct` |

## 4. 輸出格式
成功時輸出 Markdown 表格 + JSON：
```
| 段 | 航班 | 路線 | 出發 → 抵達 | 飛行時間 | 最低價 |
|----|------|------|------------|---------|--------|
| 1 | Eva Airways | TPE → NRT | 09:00 → 13:30 | 3h 30m 直飛 | HKD850 |
{"success":true,"results":[...]}
```

失敗時輸出：
```json
{"error": true, "message": "..."}
```

## 5. 使用時機
- 用戶查詢行程需要飛機作為交通工具
- 用戶詢問某航線機票價格或時間
- 規劃多段式行程需要各段航班資訊

## 6. 環境需求
- Node.js（ES Module）
- `playwright-core`（已安裝於 `/app/node_modules`）
- 執行路徑：`/app` 目錄（確保 playwright-core 可被 require）
