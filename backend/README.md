# 排球動作分析後端（Flask + mediapipe）

接收上傳的排球動作影片，用 mediapipe 姿態偵測擷取手腕、腳踝座標，計算移動統計並回傳給前端。

## 本機測試

```bash
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

伺服器預設會在 `http://localhost:5000` 啟動。

測試上傳（用 curl）：

```bash
curl -X POST http://localhost:5000/analyze \
  -F "video=@/path/to/your_video.mp4" \
  -F "skip=1" \
  -F "scale=1.0" \
  -F "model_complexity=0"
```

## API

### `GET /health`
健康檢查，回傳 `{"status": "ok"}`，Render 用來確認服務是否存活。

### `POST /analyze`
上傳影片並取得分析結果。

**Request（multipart/form-data）**

| 欄位 | 必填 | 說明 |
|---|---|---|
| `video` | 是 | 影片檔案（建議 mp4） |
| `skip` | 否，預設 1 | 每隔幾幀分析一次，數字越大越快、取樣越稀疏 |
| `scale` | 否，預設 1.0 | 分析前縮放畫面比例，例如 0.5 = 縮小一半，越小越快 |
| `model_complexity` | 否，預設 0 | mediapipe 模型複雜度 0/1/2，0 最快、2 最準 |

**Response（JSON）**

```json
{
  "video_filename": "spike01.mp4",
  "fps": 30.0,
  "total_frames": 240,
  "sampled_frames": 240,
  "params": { "skip": 1, "scale": 1.0, "model_complexity": 0 },
  "csv": "frame,right_wrist_x,right_wrist_y,...\n0,512.3,...",
  "stats": [
    {
      "limb": "right_wrist",
      "limb_display": "Right Wrist",
      "max_x": 933.2,
      "min_x": 120.5,
      "mean_x": 480.1,
      "std_x": 210.4,
      "peak_count": 6,
      "peak_interval_std": 3.2,
      "chart_png_base64": "iVBORw0KGgoAAAANSU..."
    }
  ]
}
```

- `csv`：完整逐幀座標資料，前端可直接提供下載
- `stats`：四個肢體（左右手腕、左右腳踝）各自的統計數據
- `chart_png_base64`：峰值/谷值圖表，前端可直接用 `<img src="data:image/png;base64,...">` 顯示，不需要另外存檔或架設圖片伺服器

## 部署到 Render（免費方案）

1. 把這個資料夾 push 到 GitHub repo（建議獨立一個 repo，或放在主 repo 底下的子資料夾，例如 `backend/`）
2. 到 [render.com](https://render.com) 註冊/登入，選擇 **New + → Web Service**
3. 連結你的 GitHub repo，Render 會自動偵測到 `render.yaml` 並套用設定
   - 若沒自動偵測，手動設定：
     - Build Command: `pip install -r requirements.txt`
     - Start Command: `gunicorn app:app --timeout 300 --workers 1 --threads 2`
4. 部署完成後會拿到一個網址，例如 `https://volleyball-pose-backend.onrender.com`
5. 前端就用這個網址呼叫 `/analyze` API

### 免費方案注意事項

- **會自動休眠**：15 分鐘沒有請求會進入休眠，下次請求需要等待約 30~60 秒喚醒，第一次上傳影片會比較慢是正常的
- **記憶體限制**：免費方案約 512MB RAM，建議保持 `model_complexity=0`，避免處理過大或過長的影片；如果常常記憶體不足，可以在前端限制上傳檔案大小或影片長度
- **逾時**：目前 gunicorn timeout 設為 300 秒，如果影片很長仍可能逾時，可以視情況調整 `render.yaml` 裡的數字，或建議使用者上傳前先剪輯成較短片段

## 與前端（排球數據網頁）串接

前端只要用 `fetch` 把影片 POST 到這個後端的 `/analyze` endpoint，拿到 JSON 後在頁面上渲染圖表和統計數字即可，範例見前端專案的 `pose-analysis.html`。

因為前端（GitHub Pages）和後端（Render）是不同網域，後端已經用 `flask-cors` 開放跨網域請求，前端不需要額外設定。
