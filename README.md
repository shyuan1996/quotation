# 雲端報價單系統

React + Vite + Firebase Authentication + Cloud Firestore 的報價單系統。

## 功能

- Email／Password 登入
- 報價單依登入使用者儲存在 `users/{uid}/quotations/{quotationId}`
- Logo 與印章以 Base64 直接儲存在 Firestore
- 報價單列印與 PDF 預覽

本專案不依賴 Firebase Storage，因此使用 Firebase Spark 免費方案也可以儲存報價單。請留意 Firestore 單筆文件有大小限制，圖片不宜過大。

## 本機執行

需要 Node.js 18 以上：

```bash
npm install
copy .env.example .env.local
npm run dev
```

在 `.env.local` 填入 Firebase Web App 設定。`.env.local` 不可上傳到 GitHub，請只上傳 `.env.example`。

## 檢查與建置

```bash
npm run typecheck
npm run build
npm run preview
```

## Firebase 設定

請在 Firebase Console 啟用：

- Authentication：Email/Password
- Cloud Firestore

Firestore 規則檔案為 `firestore.rules`。部署規則前，請確認 `.firebaserc` 的 project ID 正確：

```bash
firebase deploy --only firestore:rules
```

## 舊資料遷移

舊版本使用頂層 `quotations` collection，新版本使用 `users/{uid}/quotations`。遷移完成後，舊資料會保留作為備份，但新版不會再讀取舊路徑。

## GitHub 上傳

請將 `github-upload` 資料夾內的檔案全選後上傳。不要上傳 `.env.local`、`node_modules`、`dist` 或 `migrated_prompt_history`。
