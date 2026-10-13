// 伺服器錯誤分類（前後端共用）：後台依分類篩選、統計
export const ERROR_CATEGORIES = {
  ai: "AI 模型",
  unsplash: "Unsplash",
  "image-search": "其他圖庫",
  blob: "Vercel Blob",
  database: "資料庫",
  weather: "天氣",
  auth: "登入",
  unhandled: "未處理例外",
} as const;
export type ErrorCategory = keyof typeof ERROR_CATEGORIES;
