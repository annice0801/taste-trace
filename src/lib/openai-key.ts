// 使用者自備 OpenAI 金鑰：前後端共用的常數與格式檢查（不可放任何伺服器專用程式）

// 前端呼叫 API 時，把金鑰放在這個標頭
export const OPENAI_KEY_HEADER = "x-openai-key";

// API 回應這個錯誤代碼時，前端提示使用者設定金鑰
export const KEY_ERROR_CODES = {
  missing: "missing_openai_key",
  invalid: "invalid_openai_key",
} as const;

export const OPENAI_KEYS_URL = "https://platform.openai.com/api-keys";

export function isValidKeyFormat(key: string): boolean {
  return /^sk-[A-Za-z0-9_-]{20,300}$/.test(key);
}

// 畫面只顯示前後幾碼，例：sk-proj…a1b2
export function maskKey(key: string): string {
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}
