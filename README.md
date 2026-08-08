# 排球隊得分紀錄板

用來記錄排球隊員得分、攻擊得分、失誤與發球失誤的網頁工具。

## 功能
- 自訂新增 / 刪除球員
- 按鈕記錄：得分、攻擊得分、失誤、發球失誤
- 自動計算每位球員與全隊總分
- 一鍵匯出 CSV 成績表

## 本機開發
\`\`\`bash
npm install
npm run dev
\`\`\`

## 部署
推送到 GitHub 的 main 分支後，GitHub Actions 會自動建置並部署到 GitHub Pages。
記得到 repo 的 Settings > Pages，將 Source 設定為 "GitHub Actions"。
