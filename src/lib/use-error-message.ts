"use client";

import { useTranslations } from "next-intl";

// 把錯誤轉成畫面上的文字：前端丟出的錯誤是 Errors 底下的 key，
// 伺服器回傳的錯誤訊息則原樣顯示
export function useErrorMessage() {
  const t = useTranslations("Errors");
  return (error: unknown, fallback = "generic") => {
    const message = error instanceof Error ? error.message : fallback;
    return t.has(message) ? t(message) : message;
  };
}
