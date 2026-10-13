"use client";

import { useSyncExternalStore } from "react";
import { OPENAI_KEY_HEADER } from "./openai-key";

// 使用者自己的 OpenAI 金鑰只存在這個瀏覽器的 localStorage，不會存到我們的伺服器
const STORAGE_KEY = "taste-trace:openai-key";
const CHANGE_EVENT = "taste-trace:openai-key-change";
const OPEN_PANEL_EVENT = "taste-trace:open-openai-key-panel";

// 無痕模式或封鎖網站資料時 localStorage 可能無法使用，一律包 try/catch
export function readOpenAIKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveOpenAIKey(key: string): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, key);
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function clearOpenAIKey() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 無法存取就當作已清除
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange); // 其他分頁修改時同步
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useOpenAIKey(): string | null {
  return useSyncExternalStore(subscribe, readOpenAIKey, () => null);
}

// 呼叫會用到 OpenAI 的 API 時帶上金鑰標頭
export function openAIKeyHeaders(): Record<string, string> {
  const key = readOpenAIKey();
  return key ? { [OPENAI_KEY_HEADER]: key } : {};
}

// 從其他元件（例如推薦失敗時）打開頁首的金鑰設定面板
export function requestOpenAIKeyPanel() {
  window.dispatchEvent(new Event(OPEN_PANEL_EVENT));
}

export function onOpenAIKeyPanelRequest(handler: () => void) {
  window.addEventListener(OPEN_PANEL_EVENT, handler);
  return () => window.removeEventListener(OPEN_PANEL_EVENT, handler);
}
