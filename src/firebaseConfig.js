// ============================================================
// 「分享房間」功能設定（選用，不設定完全不影響本機記錄功能）
// ============================================================
//
// 如果你想要讓多人「即時共用同一份紀錄」，需要一組免費的 Firebase 設定：
//
// 1. 前往 https://console.firebase.google.com 用 Google 帳號登入
// 2. 點「新增專案」，輸入名稱（例如 volleyball-score），一路下一步建立
// 3. 左側選單找「Build」→「Firestore Database」，點「建立資料庫」
//    - 位置選離你近的（例如 asia-east1）
//    - 安全性規則先選「測試模式」（30 天內任何人可讀寫，之後可再收緊）
// 4. 回到專案總覽頁，點網頁圖示（</>）新增一個網頁應用程式，取個名字
// 5. 建立完成後會顯示一段 firebaseConfig 設定，把裡面的值複製貼到下面
//
// 貼好之後儲存、重新部署，網頁上就會自動出現「建立/加入房間」的功能。
// 如果不需要這個功能，這個檔案完全不用動，程式會自動偵測並隱藏相關按鈕。

export const firebaseConfig = {
  apiKey: "AIzaSyBcGszo3_Vtyek-Kfd-TTiPTSL-xKB9KAo",
  authDomain: "volleyball-score-e4d36.firebaseapp.com",
  projectId: "volleyball-score-e4d36",
  storageBucket: "volleyball-score-e4d36.firebasestorage.app",
  messagingSenderId: "134394496280",
  appId: "1:134394496280:web:4545e638e37a21bb504a6d",
};
