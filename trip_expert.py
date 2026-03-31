import os
import json
import sys
import argparse
from google import genai
from google.genai import types
from dotenv import load_dotenv

# 預先載入 .env 檔案
load_dotenv()

# 設定常數
CONTEXT_DIR = "contexts"
DEFAULT_CONTEXT = "default_chat"
DEFAULT_ENV_VAR = "GEMINI_KEY_SKILL"
MODEL_NAME = "gemini-2.5-flash"

def ensure_context_dir():
    """確保 contexts/ 目錄存在，解決 Agent 執行路徑不同的問題"""
    if not os.path.exists(CONTEXT_DIR):
        os.makedirs(CONTEXT_DIR, exist_ok=True)

def get_file_path(context_name):
    """自動補足路徑與副檔名"""
    return os.path.join(CONTEXT_DIR, f"{context_name}.json")

def read_context_file(context_name):
    """讀取歷史紀錄"""
    path = get_file_path(context_name)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def write_context_file(context_name, history):
    """儲存歷史紀錄"""
    ensure_context_dir() # 確保寫入前目錄已建立
    path = get_file_path(context_name)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(history, f, ensure_ascii=False, indent=2)

def main():
    parser = argparse.ArgumentParser(description="Gemini 行程專家 CLI 工具")
    parser.add_argument("query", nargs="?", help="問題內容")
    parser.add_argument("--context", default=DEFAULT_CONTEXT, help="Context 名稱")
    parser.add_argument("--env-key", default=DEFAULT_ENV_VAR, help="API Key 環境變數名稱")
    parser.add_argument("--read-context", action="store_true", help="讀取對話紀錄")
    parser.add_argument("--write-context", help="覆蓋對話紀錄 (JSON 字串)")

    args = parser.parse_args()

    try:
        # 功能：僅讀取歷史
        if args.read_context:
            history = read_context_file(args.context)
            # 確保輸出只有純 JSON
            print(json.dumps(history, ensure_ascii=False))
            return

        # 功能：手動寫入歷史 (用於總結)
        if args.write_context:
            write_context_file(args.context, json.loads(args.write_context))
            print(f"Successfully updated context: {args.context}")
            return

        # 正常對話邏輯
        if not args.query:
            raise ValueError("Missing query or valid command parameters.")

        api_key = os.getenv(args.env_key)
        if not api_key:
            raise ValueError(f"Environment variable '{args.env_key}' not found.")

        client = genai.Client(api_key=api_key)
        history = read_context_file(args.context)

        # 初始化系統指令
        if not history:
            system_instruction = """
                你是一名『行程專家』，擅長利用 Google Maps 計畫詳盡的旅遊行程。你的目標是根據用戶的要求，精確地找出店舖、景點及地點，並編排出最佳的交通與時間方案。

                在建議路徑時，你必須遵守以下規則：
                1. 每次規劃路線前，必須先用 Google Maps 工具實際查詢交通路線，不可依賴記憶。
                2. 嚴格核實轉乘站：每個轉乘站必須確認該站確實有兩條線路交匯。例如：淀屋橋站只有御堂筋線與京阪電鐵，沒有谷町線；谷町線與千日前線的轉乘站是谷町九丁目站。
                3. 若 Google Maps 查詢結果與記憶有衝突，以 Google Maps 結果為準。
                4. 給出路線前，逐站列出每個站的線路，確認無誤才輸出答案。

                目的與目標：
                * 根據用戶指定的出發地、目的地及時間，規劃出邏輯通順且高效的行程。
                * 利用 Google Maps 提供實時或具體的交通資訊與地點連結。
                * 提供深度的地點資訊（如評分、特色、開放時間），幫助用戶做決定。

                行為與規則：
                1) 行程編排細節：
                a) 必須包含：出發地、目的地、預計上車時間、交通工具班次、行經方向。
                b) 交通過程：標註所需總時間、具體上車點、中途轉車點、落車點。
                c) 後續導引：提供落車後步行至目標地點的路線指引。
                d) 財務與票務：列出預估價錢，並說明該行程是否適用特定的交通票券（Pass）。

                2) 地點深度資訊：
                a) 為每個推薦的景點或店舖提供 Google Maps 連結。
                b) 註明該地點的開放時間、休息日及 Google 評分。
                c) 點出該地點的獨特特色或用戶需要注意的時限限制。

                3) 交互風格：
                a) 保持專業、精確且有條理的口吻。
                b) 若用戶提供資訊不足，主動詢問偏好的交通方式（如：大眾運輸或自駕）或預算限制。
                c) 確保行程建議中包含 @Google Maps 的參考資訊。

                整體語氣：
                * 廣東話無體字。
                * 專業且具備指導性。
                * 友善且樂於助人，像是一位資深的旅遊規劃師。
                * 資訊呈現清晰，易於閱讀。
            """
            history.append({"role": "user", "parts": [{"text": system_instruction}]})
            history.append({"role": "model", "parts": [{"text": "你好！我係行程專家，準備好幫你規劃行程。"}]})

        history.append({"role": "user", "parts": [{"text": args.query}]})

        config = types.GenerateContentConfig(
            tools=[types.Tool(google_maps=types.GoogleMaps())],
            thinking_config=types.ThinkingConfig(include_thoughts=True)
        )

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=history,
            config=config
        )

        ai_text = response.text
        history.append({"role": "model", "parts": [{"text": ai_text}]})
        write_context_file(args.context, history)
        
        # 成功回覆：純文字內容
        print(ai_text)

    except Exception as e:
        # 失敗回覆：純淨的 JSON 錯誤訊息，方便 Agent 解析
        print(json.dumps({"error": True, "message": str(e)}, ensure_ascii=False))

if __name__ == "__main__":
    main()