import React, { useState, useRef, useEffect } from "react";

const STORAGE_KEY = "volleyball-score-tracker-data";

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Noto+Sans+TC:wght@400;500;600;700;900&display=swap');

.vb-root {
  --court-navy: #0e2a3f;
  --court-navy-2: #143a56;
  --court-navy-3: #1c4b6e;
  --line-white: #f6f3ea;
  --ball-yellow: #ffc94a;
  --ball-blue: #3aa0d8;
  --error-red: #e25b45;
  --serve-amber: #f08a3c;
  --muted: #93aebd;
  font-family: 'Noto Sans TC', 'Inter', sans-serif;
  background:
    radial-gradient(circle at 15% 10%, rgba(58,160,216,0.12), transparent 45%),
    radial-gradient(circle at 85% 90%, rgba(255,201,74,0.10), transparent 45%),
    var(--court-navy);
  color: var(--line-white);
  min-height: 100%;
  padding: 28px 18px 60px;
  box-sizing: border-box;
}

.vb-wrap { max-width: 1100px; margin: 0 auto; }

.vb-header { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-bottom: 22px; border-bottom: 2px dashed rgba(246,243,234,0.18); padding-bottom: 18px; }

.vb-title-row { display: flex; align-items: center; gap: 12px; }

.vb-ball { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; background: conic-gradient(var(--ball-yellow) 0deg 90deg, var(--ball-blue) 90deg 180deg, var(--line-white) 180deg 270deg, var(--ball-yellow) 270deg 360deg); border: 2px solid rgba(246,243,234,0.5); box-shadow: 0 0 0 2px var(--court-navy), 0 4px 12px rgba(0,0,0,0.35); }

.vb-title { font-family: 'Oswald', 'Noto Sans TC', sans-serif; font-weight: 700; font-size: 28px; letter-spacing: 0.5px; margin: 0; }

.vb-subtitle { color: var(--muted); font-size: 13px; margin-top: 2px; }

.vb-team-total { text-align: right; }
.vb-team-total .n { font-family: 'Oswald', sans-serif; font-size: 34px; font-weight: 700; color: var(--ball-yellow); line-height: 1; }
.vb-team-total .l { font-size: 11px; color: var(--muted); letter-spacing: 1.5px; }

.vb-add-row { display: flex; gap: 10px; margin-bottom: 26px; flex-wrap: wrap; }

.vb-input { flex: 1; min-width: 200px; background: var(--court-navy-2); border: 1.5px solid rgba(246,243,234,0.18); color: var(--line-white); padding: 11px 14px; border-radius: 8px; font-size: 14px; font-family: inherit; outline: none; transition: border-color 0.15s; }
.vb-input:focus { border-color: var(--ball-blue); }
.vb-input::placeholder { color: var(--muted); }

.vb-add-btn { background: var(--ball-yellow); color: var(--court-navy); border: none; padding: 11px 22px; border-radius: 8px; font-weight: 700; font-size: 14px; cursor: pointer; font-family: 'Noto Sans TC', sans-serif; transition: transform 0.1s, filter 0.15s; }
.vb-add-btn:hover { filter: brightness(1.08); }
.vb-add-btn:active { transform: scale(0.97); }

.vb-empty { text-align: center; padding: 60px 20px; color: var(--muted); border: 1.5px dashed rgba(246,243,234,0.18); border-radius: 14px; }

.vb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 18px; margin-bottom: 26px; }

.vb-card { background: linear-gradient(160deg, var(--court-navy-2), var(--court-navy-3)); border: 1.5px solid rgba(246,243,234,0.14); border-radius: 16px; padding: 18px; position: relative; box-shadow: 0 8px 20px rgba(0,0,0,0.25); }

.vb-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }

.vb-name { font-weight: 700; font-size: 17px; word-break: break-word; padding-right: 8px; }

.vb-del { background: none; border: none; color: var(--muted); font-size: 18px; cursor: pointer; line-height: 1; padding: 2px 6px; border-radius: 6px; transition: color 0.15s, background 0.15s; }
.vb-del:hover { color: var(--error-red); background: rgba(226,91,69,0.12); }

.vb-score-panel { display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.22); border-radius: 12px; padding: 10px 0 6px; margin: 10px 0 16px; }
.vb-score-num { font-family: 'Oswald', sans-serif; font-size: 46px; font-weight: 700; line-height: 1; color: var(--ball-yellow); font-variant-numeric: tabular-nums; }
.vb-score-label { font-size: 10.5px; letter-spacing: 2px; color: var(--muted); margin-top: 2px; }

.vb-stat-group { margin-bottom: 6px; }
.vb-stat-group-title { font-size: 11px; letter-spacing: 1.5px; color: var(--muted); margin: 14px 0 4px; text-transform: uppercase; }
.vb-stat-group-title:first-child { margin-top: 0; }
.vb-stat-group-title.score-title { color: var(--ball-blue); }
.vb-stat-group-title.error-title { color: var(--error-red); }

.vb-stat { display: flex; align-items: center; justify-content: space-between; padding: 6px 2px; border-top: 1px solid rgba(246,243,234,0.08); }
.vb-stat-group .vb-stat:first-of-type { border-top: none; }

.vb-stat-label { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--line-white); }
.vb-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.dot-point { background: var(--ball-blue); }
.dot-attack { background: var(--ball-yellow); }
.dot-serve-point { background: #6bd4a8; }
.dot-block { background: #b58af5; }
.dot-error { background: var(--error-red); }
.dot-attack-err { background: #c23f6b; }
.dot-serve-err { background: var(--serve-amber); }
.dot-reception { background: #e58fd0; }
.dot-set { background: #f2c85c; }
.dot-net { background: #d97757; }

.vb-stat-ctrl { display: flex; align-items: center; gap: 8px; }
.vb-count { min-width: 20px; text-align: center; font-family: 'Oswald', sans-serif; font-size: 15px; font-variant-numeric: tabular-nums; }

.vb-btn { width: 24px; height: 24px; border-radius: 6px; border: none; cursor: pointer; font-size: 14px; font-weight: 700; display: flex; align-items: center; justify-content: center; line-height: 1; transition: filter 0.15s, transform 0.1s; }
.vb-btn:active { transform: scale(0.9); }
.vb-btn-minus { background: rgba(246,243,234,0.12); color: var(--line-white); }
.vb-btn-minus:hover { background: rgba(246,243,234,0.22); }
.vb-btn-plus.point { background: var(--ball-blue); color: #0e2a3f; }
.vb-btn-plus.attack { background: var(--ball-yellow); color: #0e2a3f; }
.vb-btn-plus.serve-point { background: #6bd4a8; color: #0e2a3f; }
.vb-btn-plus.block { background: #b58af5; color: #0e2a3f; }
.vb-btn-plus.error { background: var(--error-red); color: #fff; }
.vb-btn-plus.attack-err { background: #c23f6b; color: #fff; }
.vb-btn-plus.serve-err { background: var(--serve-amber); color: #0e2a3f; }
.vb-btn-plus.reception { background: #e58fd0; color: #0e2a3f; }
.vb-btn-plus.set { background: #f2c85c; color: #0e2a3f; }
.vb-btn-plus.net { background: #d97757; color: #fff; }
.vb-btn-plus:hover { filter: brightness(1.1); }

.vb-footer { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
.vb-reset { background: none; border: 1.5px solid rgba(226,91,69,0.5); color: var(--error-red); padding: 9px 20px; border-radius: 8px; font-size: 13px; cursor: pointer; font-family: 'Noto Sans TC', sans-serif; transition: background 0.15s; }
.vb-reset:hover { background: rgba(226,91,69,0.12); }
.vb-export { background: none; border: 1.5px solid rgba(58,160,216,0.6); color: var(--ball-blue); padding: 9px 20px; border-radius: 8px; font-size: 13px; cursor: pointer; font-family: 'Noto Sans TC', sans-serif; transition: background 0.15s; }
.vb-export:hover { background: rgba(58,160,216,0.14); }
.vb-clear { background: none; border: 1.5px solid rgba(147,174,189,0.4); color: var(--muted); padding: 9px 20px; border-radius: 8px; font-size: 13px; cursor: pointer; font-family: 'Noto Sans TC', sans-serif; transition: background 0.15s; }
.vb-clear:hover { background: rgba(147,174,189,0.12); }
`;

// 得分類統計
const SCORE_STATS = [
  { key: "points", label: "得分", dot: "dot-point", btn: "point" },
  { key: "attackPoints", label: "攻擊得分", dot: "dot-attack", btn: "attack" },
  { key: "servePoints", label: "發球得分", dot: "dot-serve-point", btn: "serve-point" },
  { key: "blockPoints", label: "攔網得分", dot: "dot-block", btn: "block" },
];

// 失誤類統計
const ERROR_STATS = [
  { key: "errors", label: "失誤", dot: "dot-error", btn: "error" },
  { key: "attackErrors", label: "攻擊失誤", dot: "dot-attack-err", btn: "attack-err" },
  { key: "serveErrors", label: "發球失誤", dot: "dot-serve-err", btn: "serve-err" },
  { key: "receptionErrors", label: "接球失誤", dot: "dot-reception", btn: "reception" },
  { key: "settingErrors", label: "舉球失誤", dot: "dot-set", btn: "set" },
  { key: "netErrors", label: "觸網失誤", dot: "dot-net", btn: "net" },
];

const ALL_STATS = [...SCORE_STATS, ...ERROR_STATS];

function emptyStats() {
  const stats = {};
  ALL_STATS.forEach((s) => {
    stats[s.key] = 0;
  });
  return stats;
}

function calcTotal(p) {
  const scoreSum = SCORE_STATS.reduce((sum, s) => sum + (p[s.key] || 0), 0);
  const errorSum = ERROR_STATS.reduce((sum, s) => sum + (p[s.key] || 0), 0);
  return scoreSum - errorSum;
}

function loadInitialPlayers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 補上舊資料可能缺少的新欄位，避免升級後出現 undefined
    return parsed.map((p) => ({ ...emptyStats(), ...p }));
  } catch (err) {
    console.error("讀取本機儲存的資料失敗", err);
    return [];
  }
}

export default function VolleyballScoreTracker() {
  const [players, setPlayers] = useState(loadInitialPlayers);
  const [nameInput, setNameInput] = useState("");
  const idCounter = useRef(
    players.reduce((max, p) => Math.max(max, p.id), 0)
  );

  // 每次 players 資料變動時，自動存到瀏覽器的 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
    } catch (err) {
      console.error("儲存資料到本機失敗", err);
    }
  }, [players]);

  const addPlayer = () => {
    const name = nameInput.trim();
    if (!name) return;
    idCounter.current += 1;
    setPlayers((prev) => [
      ...prev,
      {
        id: idCounter.current,
        name,
        ...emptyStats(),
      },
    ]);
    setNameInput("");
  };

  const removePlayer = (id, name) => {
    const ok = window.confirm(`確定要刪除球員「${name}」嗎？他的所有紀錄將一併刪除，這個動作無法復原。`);
    if (!ok) return;
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  const changeStat = (id, key, delta) => {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, [key]: Math.max(0, p[key] + delta) } : p
      )
    );
  };

  const resetAll = () => {
    setPlayers((prev) => prev.map((p) => ({ ...p, ...emptyStats() })));
  };

  const clearAllData = () => {
    if (players.length === 0) return;
    const ok = window.confirm(
      "確定要清除所有球員與紀錄嗎？這個動作無法復原。"
    );
    if (!ok) return;
    setPlayers([]);
  };

  const teamTotal = players.reduce((sum, p) => sum + calcTotal(p), 0);

  const exportScores = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const header = ["球員", ...ALL_STATS.map((s) => s.label), "總分"];
    const rows = players.map((p) => [
      p.name,
      ...ALL_STATS.map((s) => p[s.key] || 0),
      calcTotal(p),
    ]);
    const totalRow = [
      "全隊總分",
      ...ALL_STATS.map((s) => players.reduce((sum, p) => sum + (p[s.key] || 0), 0)),
      teamTotal,
    ];

    const csvLines = [
      `排球隊得分紀錄 - ${dateStr} ${timeStr}`,
      "",
      header.join(","),
      ...rows.map((r) => r.join(",")),
      totalRow.join(","),
    ];
    // \uFEFF (BOM) 讓 Excel 開啟中文不會亂碼
    const csvContent = "\uFEFF" + csvLines.join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `排球得分紀錄_${dateStr}_${now.getHours()}${now.getMinutes()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="vb-root">
      <style>{STYLES}</style>
      <div className="vb-wrap">
        <div className="vb-header">
          <div className="vb-title-row">
            <div className="vb-ball" />
            <div>
              <h1 className="vb-title">排球隊得分紀錄板</h1>
              <div className="vb-subtitle">記錄每位球員的得分與失誤數據・資料會自動儲存在此裝置</div>
            </div>
          </div>
          <div className="vb-team-total">
            <div className="n">{teamTotal}</div>
            <div className="l">全隊總分</div>
          </div>
        </div>

        <div className="vb-add-row">
          <input
            className="vb-input"
            type="text"
            placeholder="輸入球員姓名，例如：小明"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addPlayer();
            }}
          />
          <button className="vb-add-btn" onClick={addPlayer}>
            ＋ 新增球員
          </button>
        </div>

        {players.length === 0 ? (
          <div className="vb-empty">還沒有球員，請先在上方輸入姓名並新增球員</div>
        ) : (
          <div className="vb-grid">
            {players.map((p) => (
              <div className="vb-card" key={p.id}>
                <div className="vb-card-top">
                  <div className="vb-name">{p.name}</div>
                  <button
                    className="vb-del"
                    onClick={() => removePlayer(p.id, p.name)}
                    title="刪除球員"
                  >
                    ×
                  </button>
                </div>

                <div className="vb-score-panel">
                  <div className="vb-score-num">{calcTotal(p)}</div>
                  <div className="vb-score-label">總分</div>
                </div>

                <div className="vb-stat-group">
                  <div className="vb-stat-group-title score-title">得分</div>
                  {SCORE_STATS.map((s) => (
                    <div className="vb-stat" key={s.key}>
                      <div className="vb-stat-label">
                        <span className={`vb-dot ${s.dot}`} />
                        {s.label}
                      </div>
                      <div className="vb-stat-ctrl">
                        <button
                          className="vb-btn vb-btn-minus"
                          onClick={() => changeStat(p.id, s.key, -1)}
                        >
                          −
                        </button>
                        <span className="vb-count">{p[s.key] || 0}</span>
                        <button
                          className={`vb-btn vb-btn-plus ${s.btn}`}
                          onClick={() => changeStat(p.id, s.key, 1)}
                        >
                          ＋
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="vb-stat-group">
                  <div className="vb-stat-group-title error-title">失誤</div>
                  {ERROR_STATS.map((s) => (
                    <div className="vb-stat" key={s.key}>
                      <div className="vb-stat-label">
                        <span className={`vb-dot ${s.dot}`} />
                        {s.label}
                      </div>
                      <div className="vb-stat-ctrl">
                        <button
                          className="vb-btn vb-btn-minus"
                          onClick={() => changeStat(p.id, s.key, -1)}
                        >
                          −
                        </button>
                        <span className="vb-count">{p[s.key] || 0}</span>
                        <button
                          className={`vb-btn vb-btn-plus ${s.btn}`}
                          onClick={() => changeStat(p.id, s.key, 1)}
                        >
                          ＋
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {players.length > 0 && (
          <div className="vb-footer">
            <button className="vb-export" onClick={exportScores}>
              ⬇ 匯出這次成績
            </button>
            <button className="vb-reset" onClick={resetAll}>
              重設全部分數（保留球員）
            </button>
            <button className="vb-clear" onClick={clearAllData}>
              清除所有資料
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
