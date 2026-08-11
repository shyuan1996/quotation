# 雲端報價單系統

React、Vite、Firebase Authentication、Cloud Firestore 與 Firebase Storage 的報價單系統。

## 本機啟動

需求：Node.js 18 或更新版本。

```bash
npm install
copy .env.example .env.local
npm run dev
```

請在 `.env.local` 填入 Firebase Web App 設定。Firebase Console 需要啟用：

- Authentication 的 Email/Password 登入
- Cloud Firestore
- Firebase Storage

`.env.local` 不應上傳 GitHub；`.env.example` 可以提交。

## 建置與檢查

```bash
npm run typecheck
npm run build
npm run preview
```

## Firebase Rules

規則檔案為 `firestore.rules` 與 `storage.rules`。使用 Firebase CLI 部署前，請確認 `.firebaserc` 的 project ID 正確：

```bash
firebase deploy --only firestore:rules,storage
```

報價資料會依登入使用者儲存在 `users/{uid}/quotations/{quotationId}`，圖片會儲存在 Firebase Storage 的相同使用者路徑下。

## 舊資料注意事項

舊版本使用頂層 `quotations` collection，且以檔名作為文件 ID。新版不會自動讀取舊資料；正式套用 Rules 前，請先備份並完成一次資料遷移。

## GitHub 上傳

請上傳 `github-upload` 資料夾裡的內容，不要上傳 `.env.local`、`node_modules` 或 `migrated_prompt_history`。
