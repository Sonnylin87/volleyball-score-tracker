"""
排球動作分析後端 API
-----------------------------------
接收上傳的影片，使用 mediapipe 擷取手腕/腳踝座標，
計算移動統計數據，並回傳可供前端繪圖的 JSON 結果。

部署平台：Render（免費方案）
啟動指令：gunicorn app:app
"""

import os
import io
import base64
import tempfile
import traceback

import cv2
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from scipy.signal import savgol_filter, argrelextrema
import matplotlib
matplotlib.use("Agg")  # 伺服器端無畫面環境，必須用非互動式 backend
import matplotlib.pyplot as plt

# mediapipe 內部會嘗試 import tensorflow 造成一連串版本衝突，
# 我們的功能完全用不到 tensorflow / mediapipe.tasks，所以在 import 前先擋掉，
# 讓 mediapipe 內部的 try/except ModuleNotFoundError 直接 fallback。
import sys
sys.modules["tensorflow"] = None  # noqa: E402
import mediapipe as mp  # noqa: E402

app = Flask(__name__)
# 前端網頁（例如 GitHub Pages）跟後端不同網域，需要開放 CORS
CORS(app)

mp_pose = mp.solutions.pose

MAX_UPLOAD_MB = 200
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_MB * 1024 * 1024

LIMB_LANDMARKS = {
    "right_wrist": mp_pose.PoseLandmark.RIGHT_WRIST,
    "left_wrist": mp_pose.PoseLandmark.LEFT_WRIST,
    "right_ankle": mp_pose.PoseLandmark.RIGHT_ANKLE,
    "left_ankle": mp_pose.PoseLandmark.LEFT_ANKLE,
}

LIMB_DISPLAY_NAMES = {
    "right_wrist": "Right Wrist",
    "left_wrist": "Left Wrist",
    "right_ankle": "Right Ankle",
    "left_ankle": "Left Ankle",
}


def extract_landmarks(video_path, skip=1, scale=1.0, model_complexity=0):
    """逐幀（或跳幀）擷取指定肢體的 x/y 座標"""
    pose = mp_pose.Pose(
        model_complexity=model_complexity,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    data = {f"{limb}_{axis}": [] for limb in LIMB_LANDMARKS for axis in ("x", "y")}
    frame_indices = []

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        pose.close()
        raise RuntimeError("無法開啟影片檔案，請確認格式是否支援（建議 mp4）")

    fps = cap.get(cv2.CAP_PROP_FPS) or 0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0

    frame_idx = 0
    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % skip == 0:
                if scale != 1.0:
                    frame_proc = cv2.resize(frame, (0, 0), fx=scale, fy=scale)
                else:
                    frame_proc = frame

                results = pose.process(cv2.cvtColor(frame_proc, cv2.COLOR_BGR2RGB))

                if results.pose_landmarks:
                    h, w, _ = frame_proc.shape
                    for limb, landmark_id in LIMB_LANDMARKS.items():
                        lm = results.pose_landmarks.landmark[landmark_id]
                        x = lm.x * w / scale
                        y = lm.y * h / scale
                        data[f"{limb}_x"].append(x)
                        data[f"{limb}_y"].append(y)
                    frame_indices.append(frame_idx)

            frame_idx += 1
    finally:
        pose.close()
        cap.release()

    return data, frame_indices, fps, total_frames


def analyze_limb(x_values, limb_key):
    """計算單一肢體 X 方向移動的統計數據，並產生峰值/谷值圖（base64 PNG）"""
    arr = np.array(x_values, dtype=float)

    window = min(11, len(arr) if len(arr) % 2 == 1 else len(arr) - 1)
    if window < 5:
        smoothed = arr
        peaks, troughs = np.array([], dtype=int), np.array([], dtype=int)
    else:
        smoothed = savgol_filter(arr, window_length=window, polyorder=2)
        peaks = argrelextrema(smoothed, np.greater, order=1)[0]
        troughs = argrelextrema(smoothed, np.less, order=1)[0]

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.plot(smoothed, label=f"{LIMB_DISPLAY_NAMES[limb_key]} (Smoothed)", color="tab:blue")
    if len(peaks):
        ax.plot(peaks, smoothed[peaks], "x", label="Peaks", color="red")
    if len(troughs):
        ax.plot(troughs, smoothed[troughs], "o", label="Troughs", color="green")
    ax.set_title(f"{LIMB_DISPLAY_NAMES[limb_key]} X Movement")
    ax.set_xlabel("Sampled Frame Index")
    ax.set_ylabel("X Position (px)")
    ax.legend()
    fig.tight_layout()

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=110)
    plt.close(fig)
    buf.seek(0)
    chart_b64 = base64.b64encode(buf.read()).decode("utf-8")

    interval_std = float(np.std(np.diff(peaks))) if len(peaks) > 1 else None

    stats = {
        "limb": limb_key,
        "limb_display": LIMB_DISPLAY_NAMES[limb_key],
        "max_x": float(np.max(arr)) if len(arr) else None,
        "min_x": float(np.min(arr)) if len(arr) else None,
        "mean_x": float(np.mean(arr)) if len(arr) else None,
        "std_x": float(np.std(arr)) if len(arr) else None,
        "peak_count": int(len(peaks)),
        "peak_interval_std": interval_std,
        "chart_png_base64": chart_b64,
    }
    return stats


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/analyze", methods=["POST"])
def analyze():
    if "video" not in request.files:
        return jsonify({"error": "請以 multipart/form-data 上傳欄位名稱為 video 的影片檔"}), 400

    video_file = request.files["video"]
    if video_file.filename == "":
        return jsonify({"error": "沒有選擇檔案"}), 400

    # 可調參數：跳幀 / 縮放 / 模型複雜度，前端可依需求傳入
    try:
        skip = max(1, int(request.form.get("skip", 1)))
        scale = float(request.form.get("scale", 1.0))
        model_complexity = int(request.form.get("model_complexity", 0))
        if model_complexity not in (0, 1, 2):
            model_complexity = 0
    except ValueError:
        return jsonify({"error": "參數格式錯誤（skip / scale / model_complexity）"}), 400

    suffix = os.path.splitext(video_file.filename)[1] or ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        video_file.save(tmp.name)
        tmp_path = tmp.name

    try:
        data, frame_indices, fps, total_frames = extract_landmarks(
            tmp_path, skip=skip, scale=scale, model_complexity=model_complexity
        )

        df = pd.DataFrame(data)
        df.insert(0, "frame", frame_indices)

        if df.empty:
            return jsonify({"error": "影片中沒有偵測到人物姿態，請確認影片內容"}), 422

        limb_stats = []
        for limb_key in LIMB_LANDMARKS:
            limb_stats.append(analyze_limb(df[f"{limb_key}_x"].values, limb_key))

        response = {
            "video_filename": video_file.filename,
            "fps": fps,
            "total_frames": total_frames,
            "sampled_frames": len(frame_indices),
            "params": {"skip": skip, "scale": scale, "model_complexity": model_complexity},
            "csv": df.to_csv(index=False),
            "stats": limb_stats,
        }
        return jsonify(response)

    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        return jsonify({"error": f"分析過程發生錯誤：{exc}"}), 500

    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
