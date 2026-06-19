from flask import Flask, send_from_directory, request, jsonify, Response
from flask_cors import CORS
import os
import json

app = Flask(__name__, static_folder='.')
CORS(app)

@app.get("/health")
def health():
    return "ok", 200

# --- 静的ファイル ---
@app.get("/")
def home():
    return send_from_directory('.', 'index.html')

@app.get("/<path:path>")
def static_files(path):
    if os.path.isfile(path):
        return send_from_directory('.', path)
    else:
        return "File not found", 404

@app.get("/favicon.ico")
def favicon():
    return "", 204

# --- 結果保存 ---
@app.post("/submit")
def submit():
    data = request.get_json()
    filename = "results.json"

    # 既存データ読み込み
    if os.path.exists(filename):
        with open(filename, "r", encoding="utf-8") as f:
            existing_data = json.load(f)
    else:
        existing_data = []

    # 新しいデータを追加
    existing_data.append(data)

    # 保存
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(existing_data, f, ensure_ascii=False, indent=2)

    return jsonify({"status": "ok"})

# --- 結果取得 ---
@app.get("/results")
def get_results():
    filename = "results.json"
    if os.path.exists(filename):
        with open(filename, "r", encoding="utf-8") as f:
            data = json.load(f)
        return jsonify(data)
    else:
        return jsonify([])
    
@app.route("/download_csv")
def download_csv():
    filename = "results.json"

    if not os.path.exists(filename):
        return "No data", 404

    with open(filename, "r") as f:
        data = json.load(f)

    # CSV を文字列として作成
    import csv
    from io import StringIO

    output = StringIO()
    writer = csv.writer(output)

    # ヘッダー
    writer.writerow([
        "participantId", "condition", "timestamp",
        "question_id", "a", "b", "correctAnswer",
        "selected", "correct", "timeSec",
        "totalCorrect", "totalTimeSec"
    ])

    # 各 participant のデータを展開して書き込む
    for entry in data:
        for q in entry["questions"]:
            writer.writerow([
                entry["participantId"],
                entry["condition"],
                entry["timestamp"],
                q["id"],
                q["a"],
                q["b"],
                q["correctAnswer"],
                q["selected"],
                q["correct"],
                q["timeSec"],
                entry["totalCorrect"],
                entry["totalTimeSec"]
            ])

    # CSV をレスポンスとして返す
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=results.csv"}
    )

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)