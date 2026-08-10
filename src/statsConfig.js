// 共用統計項目設定 —— 主畫面（App.jsx）與進階模式（AdvancedMode.jsx）都會用到

// 得分類統計
export const SCORE_STATS = [
  { key: "points", label: "得分", dot: "dot-point", btn: "point" },
  { key: "attackPoints", label: "攻擊得分", dot: "dot-attack", btn: "attack" },
  { key: "servePoints", label: "發球得分", dot: "dot-serve-point", btn: "serve-point" },
  { key: "blockPoints", label: "攔網得分", dot: "dot-block", btn: "block" },
];

// 失誤類統計
export const ERROR_STATS = [
  { key: "errors", label: "失誤", dot: "dot-error", btn: "error" },
  { key: "attackErrors", label: "攻擊失誤", dot: "dot-attack-err", btn: "attack-err" },
  { key: "serveErrors", label: "發球失誤", dot: "dot-serve-err", btn: "serve-err" },
  { key: "receptionErrors", label: "接球失誤", dot: "dot-reception", btn: "reception" },
  { key: "settingErrors", label: "舉球失誤", dot: "dot-set", btn: "set" },
  { key: "netErrors", label: "觸網失誤", dot: "dot-net", btn: "net" },
];

export const ALL_STATS = [...SCORE_STATS, ...ERROR_STATS];

export function emptyStats() {
  const stats = {};
  ALL_STATS.forEach((s) => {
    stats[s.key] = 0;
  });
  return stats;
}

export function calcTotal(p) {
  const scoreSum = SCORE_STATS.reduce((sum, s) => sum + (p[s.key] || 0), 0);
  const errorSum = ERROR_STATS.reduce((sum, s) => sum + (p[s.key] || 0), 0);
  return scoreSum - errorSum;
}
