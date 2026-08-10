import React, { useState, useEffect, useRef } from "react";
import { SCORE_STATS, ERROR_STATS, ALL_STATS, calcTotal } from "./statsConfig.js";

const ADV_STORAGE_KEY = "volleyball-advanced-mode-data";

// 6 個輪轉站位（index0 = 1號位／左上，依順時鐘排列）
// 上排＝前排（靠近球網）・下排＝後排（發球區）
// index: 0=P1(左上) 1=P2(中上) 2=P3(右上) 3=P4(右下) 4=P5(中下) 5=P6(左下)
const POSITION_LAYOUT = [
  { idx: 0, label: "1", row: "front", col: "left" },
  { idx: 1, label: "2", row: "front", col: "center" },
  { idx: 2, label: "3", row: "front", col: "right" },
  { idx: 3, label: "4", row: "back", col: "right" },
  { idx: 4, label: "5", row: "back", col: "center" },
  { idx: 5, label: "6", row: "back", col: "left" },
];

function loadAdvancedState() {
  const empty = {
    positions: Array(6).fill(null),
    actionLog: [],
    liberoPlayerId: null,
    liberoOriginalPlayerId: null,
    liberoOnCourt: false,
  };
  try {
    const raw = localStorage.getItem(ADV_STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    return {
      positions: Array.isArray(parsed.positions) && parsed.positions.length === 6
        ? parsed.positions
        : Array(6).fill(null),
      actionLog: Array.isArray(parsed.actionLog) ? parsed.actionLog : [],
      liberoPlayerId: parsed.liberoPlayerId || null,
      liberoOriginalPlayerId: parsed.liberoOriginalPlayerId || null,
      liberoOnCourt: Boolean(parsed.liberoOnCourt),
    };
  } catch (err) {
    console.error("讀取進階模式資料失敗", err);
    return empty;
  }
}

const ADV_STYLES = `
.adv-root { color: var(--line-white); }

.adv-top-bar { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
.adv-back-btn { background: rgba(246,243,234,0.08); border: 1.5px solid rgba(246,243,234,0.2); color: var(--line-white); padding: 8px 16px; border-radius: 8px; font-size: 13px; cursor: pointer; font-family: 'Noto Sans TC', sans-serif; }
.adv-back-btn:hover { background: rgba(246,243,234,0.16); }
.adv-title { font-family: 'Oswald', 'Noto Sans TC', sans-serif; font-size: 20px; font-weight: 700; margin: 0; }

.adv-court-section { display: flex; flex-direction: column; align-items: center; margin-bottom: 30px; }
.adv-libero-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; justify-content: center; }
.adv-libero-label { font-size: 12.5px; color: var(--muted); }
.adv-libero-select { background: var(--court-navy-2); border: 1.5px solid rgba(246,243,234,0.18); color: var(--line-white); padding: 6px 10px; border-radius: 6px; font-size: 13px; font-family: inherit; }
.adv-libero-btn { padding: 7px 14px; border-radius: 8px; font-size: 12.5px; cursor: pointer; font-family: 'Noto Sans TC', sans-serif; font-weight: 600; border: 1.5px solid; }
.adv-libero-btn.on { background: rgba(181,138,245,0.16); border-color: rgba(181,138,245,0.5); color: #b58af5; }
.adv-libero-btn.on:hover:not(:disabled) { background: rgba(181,138,245,0.28); }
.adv-libero-btn.on:disabled { opacity: 0.4; cursor: not-allowed; }
.adv-libero-btn.off { background: rgba(147,174,189,0.14); border-color: rgba(147,174,189,0.4); color: var(--muted); }
.adv-libero-btn.off:hover { background: rgba(147,174,189,0.24); }
.adv-libero-hint { font-size: 11.5px; color: #b58af5; margin-bottom: 10px; text-align: center; }
.adv-cell-libero { border-color: rgba(181,138,245,0.6) !important; box-shadow: 0 0 0 1px rgba(181,138,245,0.3); }
.adv-libero-badge { background: rgba(181,138,245,0.25); color: #b58af5; font-size: 9px; padding: 1px 5px; border-radius: 4px; margin-left: 5px; letter-spacing: 0; }
.adv-rotate-btns { display: flex; gap: 12px; margin-bottom: 14px; }
.adv-rotate-btn { background: rgba(58,160,216,0.16); border: 1.5px solid rgba(58,160,216,0.5); color: var(--ball-blue); padding: 8px 18px; border-radius: 8px; font-size: 13.5px; cursor: pointer; font-family: 'Noto Sans TC', sans-serif; font-weight: 600; }
.adv-rotate-btn:hover { background: rgba(58,160,216,0.28); }
.adv-rotate-btn.primary { background: rgba(226,91,69,0.16); border-color: rgba(226,91,69,0.5); color: var(--error-red); }
.adv-rotate-btn.primary:hover { background: rgba(226,91,69,0.28); }

.adv-court { transition: transform 0.1s; }
.adv-court.spin-cw { animation: courtSpinCW 420ms ease; }
.adv-court.spin-ccw { animation: courtSpinCCW 420ms ease; }
@keyframes courtSpinCW {
  0% { transform: rotate(0deg) scale(1); }
  40% { transform: rotate(10deg) scale(1.03); }
  100% { transform: rotate(0deg) scale(1); }
}
@keyframes courtSpinCCW {
  0% { transform: rotate(0deg) scale(1); }
  40% { transform: rotate(-10deg) scale(1.03); }
  100% { transform: rotate(0deg) scale(1); }
}
.adv-cell-inner { animation: cellFadeIn 340ms ease; width: 100%; align-self: stretch; }
@keyframes cellFadeIn {
  0% { opacity: 0; transform: translateY(-6px) scale(0.94); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

.adv-court { width: 100%; max-width: 480px; background: rgba(0,0,0,0.2); border: 2px solid rgba(246,243,234,0.15); border-radius: 14px; padding: 16px; }
.adv-court-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 10px; }
.adv-net-line { text-align: center; font-size: 11px; letter-spacing: 4px; color: var(--muted); border-bottom: 2px dashed rgba(246,243,234,0.3); padding-bottom: 8px; margin-bottom: 10px; }
.adv-court-hint { font-size: 11.5px; color: var(--muted); margin-top: 10px; text-align: center; max-width: 480px; }
.adv-current-lineup { font-size: 12.5px; color: var(--ball-yellow); margin-top: 8px; text-align: center; }
.adv-lineup-label { font-size: 12px; max-width: 160px; overflow-wrap: anywhere; }

.adv-cell { background: linear-gradient(160deg, var(--court-navy-2), var(--court-navy-3)); border: 1.5px solid rgba(246,243,234,0.14); border-radius: 10px; padding: 10px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.adv-cell-num { font-family: 'Oswald', sans-serif; font-size: 11px; color: var(--muted); letter-spacing: 1px; }
.adv-cell-select { width: 100%; background: rgba(0,0,0,0.25); border: 1px solid rgba(246,243,234,0.15); color: var(--line-white); font-size: 11px; border-radius: 5px; padding: 3px 4px; font-family: inherit; }
.adv-cell-name { width: 100%; background: rgba(255,201,74,0.1); border: 1px solid rgba(255,201,74,0.3); color: var(--ball-yellow); border-radius: 6px; padding: 6px 4px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Noto Sans TC', sans-serif; }
.adv-cell-name:disabled { color: var(--muted); background: rgba(246,243,234,0.05); border-color: rgba(246,243,234,0.1); cursor: default; }
.adv-cell-name:not(:disabled):hover { background: rgba(255,201,74,0.2); }

.adv-analytics { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 16px; margin-bottom: 24px; }
.adv-panel { background: linear-gradient(160deg, var(--court-navy-2), var(--court-navy-3)); border: 1.5px solid rgba(246,243,234,0.14); border-radius: 14px; padding: 16px; }
.adv-panel-title { font-size: 12px; letter-spacing: 1.5px; color: var(--muted); text-transform: uppercase; margin-bottom: 10px; }
.adv-panel-subtitle { font-size: 11px; color: var(--muted); margin-top: -6px; margin-bottom: 10px; }
.adv-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.adv-table th { text-align: left; color: var(--muted); font-weight: 500; padding: 4px 6px; border-bottom: 1px solid rgba(246,243,234,0.14); }
.adv-table td { padding: 5px 6px; border-bottom: 1px solid rgba(246,243,234,0.06); font-family: 'Oswald', sans-serif; }
.adv-row-best td:first-child { color: #6bd4a8; font-weight: 700; }
.adv-row-worst td:first-child { color: var(--error-red); font-weight: 700; }
.adv-panel-note { margin-top: 10px; font-size: 12px; color: var(--muted); }
.adv-stat-line { font-size: 13.5px; margin: 6px 0; }
.adv-stat-line.adv-muted { color: var(--muted); }
.adv-good { color: #6bd4a8; }
.adv-bad { color: var(--error-red); }

.adv-footer { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; margin-bottom: 6px; }
.adv-export-btn { background: none; border: 1.5px solid rgba(58,160,216,0.6); color: var(--ball-blue); padding: 9px 20px; border-radius: 8px; font-size: 13px; cursor: pointer; font-family: 'Noto Sans TC', sans-serif; }
.adv-export-btn:hover:not(:disabled) { background: rgba(58,160,216,0.14); }
.adv-resetlog-btn { background: none; border: 1.5px solid rgba(147,174,189,0.4); color: var(--muted); padding: 9px 20px; border-radius: 8px; font-size: 13px; cursor: pointer; font-family: 'Noto Sans TC', sans-serif; }
.adv-resetlog-btn:hover:not(:disabled) { background: rgba(147,174,189,0.12); }
.adv-export-btn:disabled, .adv-resetlog-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.adv-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 50; }
.adv-modal { background: linear-gradient(165deg, var(--court-navy-2), var(--court-navy-3)); border: 1.5px solid rgba(246,243,234,0.18); border-radius: 16px; padding: 20px; width: 100%; max-width: 360px; max-height: 85vh; overflow-y: auto; }
.adv-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.adv-modal-name { font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
.adv-modal-slot { font-family: 'Oswald', sans-serif; font-size: 11px; color: var(--muted); background: rgba(0,0,0,0.25); padding: 2px 6px; border-radius: 5px; }
.adv-modal-close { background: none; border: none; color: var(--muted); font-size: 20px; cursor: pointer; line-height: 1; padding: 2px 6px; }
.adv-modal-close:hover { color: var(--error-red); }
.adv-modal-total { text-align: center; font-family: 'Oswald', sans-serif; font-size: 34px; font-weight: 700; color: var(--ball-yellow); background: rgba(0,0,0,0.2); border-radius: 10px; padding: 8px 0; margin-bottom: 12px; }
.adv-modal-total span { display: block; font-size: 10px; letter-spacing: 2px; color: var(--muted); font-family: 'Noto Sans TC', sans-serif; font-weight: 400; }
.adv-modal-group-title { font-size: 11px; letter-spacing: 1.5px; color: var(--muted); text-transform: uppercase; margin: 12px 0 4px; }
.adv-modal-group-title.score { color: var(--ball-blue); }
.adv-modal-group-title.error { color: var(--error-red); }
.adv-modal-stat { display: flex; align-items: center; justify-content: space-between; padding: 6px 2px; border-top: 1px solid rgba(246,243,234,0.08); }
.adv-modal-stat-label { display: flex; align-items: center; gap: 7px; font-size: 13px; }
.adv-modal-stat-ctrl { display: flex; align-items: center; gap: 8px; }
.adv-modal-count { min-width: 20px; text-align: center; font-family: 'Oswald', sans-serif; font-size: 15px; }
.adv-modal-btn { width: 26px; height: 26px; border-radius: 6px; border: none; cursor: pointer; font-size: 14px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.adv-modal-btn.minus { background: rgba(246,243,234,0.12); color: var(--line-white); }
.adv-modal-btn.plus.point { background: var(--ball-blue); color: #0e2a3f; }
.adv-modal-btn.plus.attack { background: var(--ball-yellow); color: #0e2a3f; }
.adv-modal-btn.plus.serve-point { background: #6bd4a8; color: #0e2a3f; }
.adv-modal-btn.plus.block { background: #b58af5; color: #0e2a3f; }
.adv-modal-btn.plus.error { background: var(--error-red); color: #fff; }
.adv-modal-btn.plus.attack-err { background: #c23f6b; color: #fff; }
.adv-modal-btn.plus.serve-err { background: var(--serve-amber); color: #0e2a3f; }
.adv-modal-btn.plus.reception { background: #e58fd0; color: #0e2a3f; }
.adv-modal-btn.plus.set { background: #f2c85c; color: #0e2a3f; }
.adv-modal-btn.plus.net { background: #d97757; color: #fff; }
`;

export default function AdvancedMode({ players, setPlayers, onBack }) {
  const [state, setState] = useState(loadAdvancedState);
  const { positions, actionLog, liberoPlayerId, liberoOriginalPlayerId, liberoOnCourt } = state;
  const [activeSlot, setActiveSlot] = useState(null); // 目前彈窗顯示哪個站位的記分板
  const [spinDirection, setSpinDirection] = useState(null); // 目前是否正在播放旋轉動畫
  const spinTimeoutRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(ADV_STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.error("儲存進階模式資料失敗", err);
    }
  }, [state]);

  const playerById = (id) => (id == null ? null : players.find((p) => String(p.id) === String(id)) || null);

  // 「輪轉站位」＝場上 6 個人目前的整組排列組合（不是單一站位編號），
  // 用來分析「這一輪整組陣型」的得分率，而不是單一位置或單一球員的表現
  const getRotationInfo = (positionsArr) => {
    const key = positionsArr.map((id) => (id == null ? "_" : String(id))).join(",");
    const label = positionsArr
      .map((id) => {
        const p = playerById(id);
        return p ? p.name : "空";
      })
      .join("/");
    return { key, label };
  };

  const assignPlayer = (slotIndex, playerId) => {
    setState((prev) => {
      const next = [...prev.positions];
      // 同一位球員不能同時站在兩個位置：如果他已經在別的位置，先移除
      for (let i = 0; i < next.length; i++) {
        if (next[i] != null && String(next[i]) === String(playerId)) next[i] = null;
      }
      next[slotIndex] = playerId || null;
      return { ...prev, positions: next };
    });
  };

  // 順轉＝這一球算對方得分（我方需要輪轉換位），會記錄一筆「對方得分」事件，
  // 這樣輪轉區位分析（得分率、連續失分）才會把「輸掉的球」也算進去
  const rotate = (direction) => {
    if (direction === "cw") {
      const serverPlayer = playerById(positions[0]);
      const teamTotalAfter = players.reduce((sum, p) => sum + calcTotal(p), 0);
      const { key: rotationKey, label: rotationLabel } = getRotationInfo(positions);
      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ts: Date.now(),
        playerName: "（對方得分）",
        statKey: "opponentPoint",
        statLabel: "對方得分",
        isScore: false,
        delta: 1,
        positionSlot: 1, // 對方得分視為目前發球輪轉（P1）失分
        rotationKey,
        rotationLabel,
        serverName: serverPlayer ? serverPlayer.name : "",
        teamTotalAfter,
      };
      setState((prev) => ({ ...prev, actionLog: [...prev.actionLog, entry] }));
    }

    setSpinDirection(direction);
    window.clearTimeout(spinTimeoutRef.current);
    spinTimeoutRef.current = window.setTimeout(() => setSpinDirection(null), 420);

    setState((prev) => {
      const cur = prev.positions;
      let next =
        direction === "cw"
          ? [cur[5], cur[0], cur[1], cur[2], cur[3], cur[4]] // 順轉
          : [cur[1], cur[2], cur[3], cur[4], cur[5], cur[0]]; // 逆轉（相反方向，用於修正）

      // 自由球員輪轉到 1 號位（前排、需發球）時，規則上不能留在場上，自動換回原本的球員
      let liberoOriginalPlayerId = prev.liberoOriginalPlayerId;
      let liberoOnCourt = prev.liberoOnCourt;
      if (liberoOnCourt && prev.liberoPlayerId && next[0] != null && String(next[0]) === String(prev.liberoPlayerId)) {
        next = [...next];
        next[0] = liberoOriginalPlayerId;
        liberoOnCourt = false;
        liberoOriginalPlayerId = null;
      }

      return { ...prev, positions: next, liberoOnCourt, liberoOriginalPlayerId };
    });
  };

  const setLiberoPlayerId = (id) => {
    setState((prev) => ({ ...prev, liberoPlayerId: id || null }));
  };

  // 自由球員上場：跟目前站在 4 號位的球員換上場
  const swapInLibero = () => {
    setState((prev) => {
      if (!prev.liberoPlayerId || prev.liberoOnCourt) return prev;
      const originalP4 = prev.positions[3];
      const next = [...prev.positions];
      next[3] = prev.liberoPlayerId;
      return { ...prev, positions: next, liberoOriginalPlayerId: originalP4, liberoOnCourt: true };
    });
  };

  // 手動讓自由球員下場（換回原本的球員），不用等輪轉到 1 號位
  const swapOutLibero = () => {
    setState((prev) => {
      if (!prev.liberoOnCourt) return prev;
      const idx = prev.positions.findIndex((id) => id != null && String(id) === String(prev.liberoPlayerId));
      if (idx === -1) return { ...prev, liberoOnCourt: false, liberoOriginalPlayerId: null };
      const next = [...prev.positions];
      next[idx] = prev.liberoOriginalPlayerId;
      return { ...prev, positions: next, liberoOnCourt: false, liberoOriginalPlayerId: null };
    });
  };

  const recordStat = (slotIndex, statKey, delta) => {
    const playerId = positions[slotIndex];
    if (!playerId) return;
    const updatedPlayers = players.map((p) =>
      String(p.id) === String(playerId) ? { ...p, [statKey]: Math.max(0, (p[statKey] || 0) + delta) } : p
    );
    setPlayers(updatedPlayers);

    const statDef = ALL_STATS.find((s) => s.key === statKey);
    const isScore = SCORE_STATS.some((s) => s.key === statKey);
    const serverId = positions[0];
    const serverPlayer = updatedPlayers.find((p) => String(p.id) === String(serverId));
    const actingPlayer = updatedPlayers.find((p) => String(p.id) === String(playerId));
    const teamTotalAfter = updatedPlayers.reduce((sum, p) => sum + calcTotal(p), 0);
    const { key: rotationKey, label: rotationLabel } = getRotationInfo(positions);

    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ts: Date.now(),
      playerName: actingPlayer ? actingPlayer.name : "",
      statKey,
      statLabel: statDef ? statDef.label : statKey,
      isScore,
      delta,
      positionSlot: slotIndex + 1,
      rotationKey,
      rotationLabel,
      serverName: serverPlayer ? serverPlayer.name : "",
      teamTotalAfter,
    };

    setState((prev) => ({ ...prev, actionLog: [...prev.actionLog, entry] }));
  };

  const resetLog = () => {
    const ok = window.confirm(
      "確定要重設本局數據嗎？這會清除輪轉分析紀錄，並把所有球員的得分／失誤數據歸零（球員名單會保留），這個動作無法復原。"
    );
    if (!ok) return;
    setState((prev) => ({ ...prev, actionLog: [] }));
    setPlayers((prev) => prev.map((p) => ({ ...p, ...Object.fromEntries(ALL_STATS.map((s) => [s.key, 0])) })));
  };

  // ---------- 數據分析 ----------

  // 小工具：計算一組事件（依時間順序）中，最長的連續得分／連續失分次數
  function longestRuns(entries) {
    let longestScore = 0;
    let longestError = 0;
    let run = 0;
    let sign = null;
    entries.forEach((e) => {
      const s = e.isScore ? "score" : "error";
      run = s === sign ? run + 1 : 1;
      sign = s;
      if (s === "score") longestScore = Math.max(longestScore, run);
      else longestError = Math.max(longestError, run);
    });
    return { longestScore, longestError };
  }

  // 輪轉區位勝率 ＋ 各站位最長連續得分／失分
  const rotationStats = Array.from({ length: 6 }, (_, i) => {
    const slot = i + 1;
    const entries = actionLog.filter((e) => e.positionSlot === slot && e.delta > 0);
    const scoreEvents = entries.filter((e) => e.isScore).length;
    const errorEvents = entries.filter((e) => !e.isScore).length;
    const total = scoreEvents + errorEvents;
    const rate = total > 0 ? (scoreEvents / total) * 100 : null;
    const { longestScore, longestError } = longestRuns(entries);
    return { slot, scoreEvents, errorEvents, total, rate, longestScore, longestError };
  });
  const ratedRotations = rotationStats.filter((r) => r.total > 0);
  const bestRotation = ratedRotations.length
    ? ratedRotations.reduce((a, b) => (b.rate > a.rate ? b : a))
    : null;
  const worstRotation = ratedRotations.length
    ? ratedRotations.reduce((a, b) => (b.rate < a.rate ? b : a))
    : null;
  // 「連續失分最多」的站位：找出各站位最長連續失分次數最大的那一個
  const streakiestLossRotation = ratedRotations.length
    ? ratedRotations.reduce((a, b) => (b.longestError > a.longestError ? b : a))
    : null;

  // 輪轉站位（整組陣型）數據 —— 依「場上6人當時的整組排列組合」分組，
  // 而不是單一站位編號，才能看出「這一輪整組陣型」的得分率
  const lineupMap = new Map();
  actionLog
    .filter((e) => e.delta > 0 && e.rotationKey)
    .forEach((e) => {
      if (!lineupMap.has(e.rotationKey)) {
        lineupMap.set(e.rotationKey, { key: e.rotationKey, label: e.rotationLabel, entries: [] });
      }
      lineupMap.get(e.rotationKey).entries.push(e);
    });
  const lineupStats = Array.from(lineupMap.values())
    .map((g) => {
      const scoreEvents = g.entries.filter((e) => e.isScore).length;
      const errorEvents = g.entries.filter((e) => !e.isScore).length;
      const total = scoreEvents + errorEvents;
      const rate = total > 0 ? (scoreEvents / total) * 100 : null;
      const { longestScore, longestError } = longestRuns(g.entries);
      return { key: g.key, label: g.label, scoreEvents, errorEvents, total, rate, longestScore, longestError };
    })
    .sort((a, b) => b.total - a.total);
  const bestLineup = lineupStats.length
    ? lineupStats.reduce((a, b) => (b.rate > a.rate ? b : a))
    : null;
  const worstLineup = lineupStats.length
    ? lineupStats.reduce((a, b) => (b.rate < a.rate ? b : a))
    : null;
  const streakiestLossLineup = lineupStats.length
    ? lineupStats.reduce((a, b) => (b.longestError > a.longestError ? b : a))
    : null;
  const currentLineup = getRotationInfo(positions);

  // 連續得分／失分（全隊，順風逆風波段）
  const positiveEvents = actionLog.filter((e) => e.delta > 0);
  let longestScoreRun = 0;
  let longestErrorRun = 0;
  let curRun = 0;
  let curSign = null;
  positiveEvents.forEach((e) => {
    const sign = e.isScore ? "score" : "error";
    if (sign === curSign) {
      curRun += 1;
    } else {
      curSign = sign;
      curRun = 1;
    }
    if (sign === "score") longestScoreRun = Math.max(longestScoreRun, curRun);
    else longestErrorRun = Math.max(longestErrorRun, curRun);
  });
  const currentStreak = { sign: curSign, length: curRun };

  // 局末關鍵分（隊伍總分達到 20 分之後）
  const clutchStartIdx = positiveEvents.findIndex((e) => e.teamTotalAfter >= 20);
  let clutchStats = null;
  if (clutchStartIdx !== -1) {
    const before = positiveEvents.slice(0, clutchStartIdx);
    const after = positiveEvents.slice(clutchStartIdx);
    const rateOf = (list) => {
      const s = list.filter((e) => e.isScore).length;
      const total = list.length;
      return total > 0 ? (s / total) * 100 : null;
    };
    clutchStats = {
      beforeRate: rateOf(before),
      afterRate: rateOf(after),
      beforeCount: before.length,
      afterCount: after.length,
    };
  }

  const exportAdvancedData = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const lines = [];
    lines.push(`排球進階輪轉分析 - ${dateStr} ${timeStr}`);
    lines.push("");

    lines.push("【輪轉站位（整組陣型）數據】（依場上6人當時的整組排列分組——這才是真正的「這一輪站位」）");
    lines.push(["輪轉陣型（P1/P2/P3/P4/P5/P6）", "得分事件", "失分事件", "總事件", "得分率(%)", "最長連續失分"].join(","));
    lineupStats.forEach((r) => {
      lines.push(
        [
          `"${r.label}"`,
          r.scoreEvents,
          r.errorEvents,
          r.total,
          r.rate !== null ? r.rate.toFixed(1) : "-",
          r.longestError,
        ].join(",")
      );
    });
    if (bestLineup) lines.push(`得分率最高的輪轉陣型,"${bestLineup.label}",${bestLineup.rate.toFixed(1)}%`);
    if (worstLineup) lines.push(`最弱的輪轉陣型,"${worstLineup.label}",${worstLineup.rate.toFixed(1)}%`);
    if (streakiestLossLineup && streakiestLossLineup.longestError > 0) {
      lines.push(`連續失分最多的輪轉陣型,"${streakiestLossLineup.label}",連續失分${streakiestLossLineup.longestError}次`);
    }
    lines.push("");

    lines.push("【輪轉區位數據（依編號 1~6，不分是誰站）】");
    lines.push(["站位", "得分事件", "失分事件", "總事件", "得分率(%)", "最長連續失分"].join(","));
    rotationStats.forEach((r) => {
      lines.push(
        [
          `P${r.slot}`,
          r.scoreEvents,
          r.errorEvents,
          r.total,
          r.rate !== null ? r.rate.toFixed(1) : "-",
          r.longestError,
        ].join(",")
      );
    });
    if (bestRotation) lines.push(`最佳站位,P${bestRotation.slot},${bestRotation.rate.toFixed(1)}%`);
    if (worstRotation) lines.push(`最弱站位,P${worstRotation.slot},${worstRotation.rate.toFixed(1)}%`);
    if (streakiestLossRotation && streakiestLossRotation.longestError > 0) {
      lines.push(`連續失分最多站位,P${streakiestLossRotation.slot},連續失分${streakiestLossRotation.longestError}次`);
    }
    lines.push("");

    lines.push("【順風逆風波段】");
    lines.push(`最長連續得分,${longestScoreRun}`);
    lines.push(`最長連續失分,${longestErrorRun}`);
    lines.push(`目前連續,${currentStreak.sign === "score" ? "得分" : currentStreak.sign === "error" ? "失分" : "-"},${currentStreak.length}`);
    lines.push("");

    lines.push("【局末關鍵分（總分達20分後）】");
    if (clutchStats) {
      lines.push(`20分前得分率(%),${clutchStats.beforeRate !== null ? clutchStats.beforeRate.toFixed(1) : "-"}`);
      lines.push(`20分後得分率(%),${clutchStats.afterRate !== null ? clutchStats.afterRate.toFixed(1) : "-"}`);
    } else {
      lines.push("尚未達到 20 分，無資料");
    }
    lines.push("");

    lines.push("【完整紀錄】");
    lines.push(["時間", "站位", "球員", "項目", "加減", "隊伍總分", "當時輪轉陣型"].join(","));
    actionLog.forEach((e) => {
      const t = new Date(e.ts);
      const timeLabel = `${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`;
      lines.push(
        [
          timeLabel,
          `P${e.positionSlot}`,
          e.playerName,
          e.statLabel,
          e.delta > 0 ? `+${e.delta}` : e.delta,
          e.teamTotalAfter,
          `"${e.rotationLabel || ""}"`,
        ].join(",")
      );
    });

    const csvContent = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `排球進階分析_${dateStr}_${now.getHours()}${now.getMinutes()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activePlayer = activeSlot !== null ? playerById(positions[activeSlot]) : null;
  const hasAnyScoreData = actionLog.length > 0 || players.some((p) => ALL_STATS.some((s) => (p[s.key] || 0) > 0));

  return (
    <div className="adv-root">
      <style>{ADV_STYLES}</style>
      <div className="adv-top-bar">
        <button className="adv-back-btn" onClick={onBack}>
          ← 返回一般模式
        </button>
        <h2 className="adv-title">進階功能：輪轉站位分析</h2>
      </div>

      <div className="adv-court-section">
        <div className="adv-libero-bar">
          <span className="adv-libero-label">自由球員</span>
          <select
            className="adv-libero-select"
            value={liberoPlayerId || ""}
            onChange={(e) => setLiberoPlayerId(e.target.value || null)}
            disabled={liberoOnCourt}
          >
            <option value="">選擇球員</option>
            {players
              .filter((p) => !positions.some((id) => id != null && String(id) === String(p.id)))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
          {liberoOnCourt ? (
            <button className="adv-libero-btn off" onClick={swapOutLibero}>
              自由球員下場
            </button>
          ) : (
            <button className="adv-libero-btn on" onClick={swapInLibero} disabled={!liberoPlayerId}>
              自由球員上場（換下 4 號位）
            </button>
          )}
        </div>
        {liberoOnCourt && (
          <div className="adv-libero-hint">
            自由球員在場上，輪轉到 1 號位時會自動換回原本的球員
          </div>
        )}

        <div className="adv-rotate-btns">
          <button className="adv-rotate-btn primary" onClick={() => rotate("cw")}>
            ↻ 順轉（對方得分）
          </button>
          <button className="adv-rotate-btn" onClick={() => rotate("ccw")}>
            逆轉 ↺
          </button>
        </div>

        <div className={`adv-court${spinDirection ? ` spin-${spinDirection}` : ""}`}>
          <div className="adv-net-line">球網</div>
          <div className="adv-court-row">
            {POSITION_LAYOUT.filter((p) => p.row === "front")
              .sort((a, b) => (a.col === "left" ? 0 : a.col === "center" ? 1 : 2) - (b.col === "left" ? 0 : b.col === "center" ? 1 : 2))
              .map((p) => (
                <PositionCell
                  key={p.idx}
                  layout={p}
                  player={playerById(positions[p.idx])}
                  players={players}
                  positions={positions}
                  isLibero={liberoOnCourt && positions[p.idx] != null && String(positions[p.idx]) === String(liberoPlayerId)}
                  onAssign={(pid) => assignPlayer(p.idx, pid)}
                  onOpen={() => positions[p.idx] && setActiveSlot(p.idx)}
                />
              ))}
          </div>
          <div className="adv-court-row">
            {POSITION_LAYOUT.filter((p) => p.row === "back")
              .sort((a, b) => (a.col === "left" ? 0 : a.col === "center" ? 1 : 2) - (b.col === "left" ? 0 : b.col === "center" ? 1 : 2))
              .map((p) => (
                <PositionCell
                  key={p.idx}
                  layout={p}
                  player={playerById(positions[p.idx])}
                  players={players}
                  positions={positions}
                  isLibero={liberoOnCourt && positions[p.idx] != null && String(positions[p.idx]) === String(liberoPlayerId)}
                  onAssign={(pid) => assignPlayer(p.idx, pid)}
                  onOpen={() => positions[p.idx] && setActiveSlot(p.idx)}
                />
              ))}
          </div>
        </div>
        <div className="adv-court-hint">上排＝前排（靠近球網）・下排＝後排（發球區）・1號位在左上，順時鐘排列・點球員名字可記分</div>
        <div className="adv-current-lineup">目前輪轉陣型：{currentLineup.label}</div>
      </div>

      <div className="adv-analytics">
        <div className="adv-panel">
          <div className="adv-panel-title">輪轉站位（整組陣型）數據</div>
          <div className="adv-panel-subtitle">依「場上6人當時的整組排列」分組——這才是真正的「這一輪站位」</div>
          {lineupStats.length === 0 ? (
            <div className="adv-stat-line adv-muted">尚無資料，開始記分或按順轉後會自動累積</div>
          ) : (
            <>
              <table className="adv-table">
                <thead>
                  <tr>
                    <th>輪轉陣型</th>
                    <th>得分</th>
                    <th>失分</th>
                    <th>得分率</th>
                  </tr>
                </thead>
                <tbody>
                  {lineupStats.map((r) => (
                    <tr
                      key={r.key}
                      className={
                        bestLineup && r.key === bestLineup.key
                          ? "adv-row-best"
                          : worstLineup && r.key === worstLineup.key
                          ? "adv-row-worst"
                          : ""
                      }
                    >
                      <td className="adv-lineup-label">{r.label}</td>
                      <td>{r.scoreEvents}</td>
                      <td>{r.errorEvents}</td>
                      <td>{r.rate !== null ? `${r.rate.toFixed(0)}%` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {bestLineup && worstLineup && bestLineup.key !== worstLineup.key && (
                <div className="adv-panel-note">
                  得分率最高的輪轉陣型：<b>{bestLineup.label}</b>（{bestLineup.rate.toFixed(0)}%）・
                  最弱的輪轉陣型：<b>{worstLineup.label}</b>（{worstLineup.rate.toFixed(0)}%）
                </div>
              )}
              {streakiestLossLineup && streakiestLossLineup.longestError > 0 && (
                <div className="adv-panel-note">
                  連續失分最多的輪轉陣型是 <b>{streakiestLossLineup.label}</b>，曾連續失分 {streakiestLossLineup.longestError} 次
                </div>
              )}
            </>
          )}
        </div>

        <div className="adv-panel">
          <div className="adv-panel-title">輪轉區位數據（依編號 1~6）</div>
          <div className="adv-panel-subtitle">依「站位編號」加總，不論是誰站在那裡</div>
          <table className="adv-table">
            <thead>
              <tr>
                <th>站位</th>
                <th>得分</th>
                <th>失分</th>
                <th>得分率</th>
                <th>最長連續失分</th>
              </tr>
            </thead>
            <tbody>
              {rotationStats.map((r) => (
                <tr
                  key={r.slot}
                  className={
                    bestRotation && r.slot === bestRotation.slot
                      ? "adv-row-best"
                      : worstRotation && r.slot === worstRotation.slot
                      ? "adv-row-worst"
                      : ""
                  }
                >
                  <td>P{r.slot}</td>
                  <td>{r.scoreEvents}</td>
                  <td>{r.errorEvents}</td>
                  <td>{r.rate !== null ? `${r.rate.toFixed(0)}%` : "—"}</td>
                  <td>
                    {r.longestError > 0 ? (
                      <span className={streakiestLossRotation && r.slot === streakiestLossRotation.slot ? "adv-bad" : ""}>
                        {r.longestError}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {bestRotation && worstRotation && bestRotation.slot !== worstRotation.slot && (
            <div className="adv-panel-note">
              最佳站位 <b>P{bestRotation.slot}</b>（得分率 {bestRotation.rate.toFixed(0)}%）・
              最弱站位 <b>P{worstRotation.slot}</b>（得分率 {worstRotation.rate.toFixed(0)}%）
            </div>
          )}
          {streakiestLossRotation && streakiestLossRotation.longestError > 0 && (
            <div className="adv-panel-note">
              連續失分最多的站位是 <b>P{streakiestLossRotation.slot}</b>，曾連續失分 {streakiestLossRotation.longestError} 次 —— 這通常是隊伍輪轉上最需要加強的位置
            </div>
          )}
        </div>

        <div className="adv-panel">
          <div className="adv-panel-title">順風逆風波段</div>
          <div className="adv-stat-line">
            最長連續得分：<b className="adv-good">{longestScoreRun}</b> 分
          </div>
          <div className="adv-stat-line">
            最長連續失分：<b className="adv-bad">{longestErrorRun}</b> 分
          </div>
          <div className="adv-stat-line">
            目前連續：
            {currentStreak.sign ? (
              <b className={currentStreak.sign === "score" ? "adv-good" : "adv-bad"}>
                {currentStreak.length} 次{currentStreak.sign === "score" ? "得分" : "失分"}
              </b>
            ) : (
              "—"
            )}
          </div>
        </div>

        <div className="adv-panel">
          <div className="adv-panel-title">局末關鍵分（總分達 20 分後）</div>
          {clutchStats ? (
            <>
              <div className="adv-stat-line">20 分前得分率：{clutchStats.beforeRate !== null ? `${clutchStats.beforeRate.toFixed(0)}%` : "—"}</div>
              <div className="adv-stat-line">20 分後得分率：{clutchStats.afterRate !== null ? `${clutchStats.afterRate.toFixed(0)}%` : "—"}</div>
            </>
          ) : (
            <div className="adv-stat-line adv-muted">尚未達到 20 分</div>
          )}
        </div>
      </div>

      <div className="adv-footer">
        <button className="adv-export-btn" onClick={exportAdvancedData} disabled={actionLog.length === 0}>
          ⬇ 匯出進階分析
        </button>
        <button className="adv-resetlog-btn" onClick={resetLog} disabled={!hasAnyScoreData}>
          重設本局數據（含球員得分）
        </button>
      </div>

      {activePlayer && (
        <div className="adv-modal-backdrop" onClick={() => setActiveSlot(null)}>
          <div className="adv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adv-modal-header">
              <div className="adv-modal-name">
                {activePlayer.name}
                <span className="adv-modal-slot">P{activeSlot + 1}</span>
              </div>
              <button className="adv-modal-close" onClick={() => setActiveSlot(null)}>
                ×
              </button>
            </div>
            <div className="adv-modal-total">{calcTotal(activePlayer)} <span>總分</span></div>

            <div className="adv-modal-group-title score">得分</div>
            {SCORE_STATS.map((s) => (
              <StatRow key={s.key} stat={s} value={activePlayer[s.key] || 0} onChange={(d) => recordStat(activeSlot, s.key, d)} />
            ))}
            <div className="adv-modal-group-title error">失誤</div>
            {ERROR_STATS.map((s) => (
              <StatRow key={s.key} stat={s} value={activePlayer[s.key] || 0} onChange={(d) => recordStat(activeSlot, s.key, d)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PositionCell({ layout, player, players, positions, isLibero, onAssign, onOpen }) {
  const assignedElsewhere = new Set(
    positions.filter((id, i) => id != null && i !== layout.idx).map(String)
  );
  return (
    <div className={`adv-cell${isLibero ? " adv-cell-libero" : ""}`}>
      <div className="adv-cell-num">
        P{layout.label}
        {isLibero && <span className="adv-libero-badge">自由</span>}
      </div>
      <select
        className="adv-cell-select"
        value={player ? String(player.id) : ""}
        onChange={(e) => onAssign(e.target.value || null)}
      >
        <option value="">（空）</option>
        {players.map((p) => (
          <option key={p.id} value={String(p.id)} disabled={assignedElsewhere.has(String(p.id))}>
            {p.name}
          </option>
        ))}
      </select>
      <div className="adv-cell-inner" key={player ? String(player.id) : "empty"}>
        <button className="adv-cell-name" onClick={onOpen} disabled={!player}>
          {player ? player.name : "尚未指定"}
        </button>
      </div>
    </div>
  );
}

function StatRow({ stat, value, onChange }) {
  return (
    <div className="adv-modal-stat">
      <div className="adv-modal-stat-label">
        <span className={`adv-dot ${stat.dot}`} />
        {stat.label}
      </div>
      <div className="adv-modal-stat-ctrl">
        <button className="adv-modal-btn minus" onClick={() => onChange(-1)}>
          −
        </button>
        <span className="adv-modal-count">{value}</span>
        <button className={`adv-modal-btn plus ${stat.btn}`} onClick={() => onChange(1)}>
          ＋
        </button>
      </div>
    </div>
  );
}
