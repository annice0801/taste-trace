"use client";

import { useSyncExternalStore } from "react";

// 採買籃：在食材卡片按「＋」加入，存在這個瀏覽器的 localStorage
export type BasketItem = {
  id: string; // 食譜名稱 + 食材名稱
  name: string;
  amount: string; // 加入當下的份量（已依人數換算）
  substitute: string | null;
  recipeTitle: string;
  imageUrl: string | null;
  done: boolean;
};

const STORAGE_KEY = "taste-trace:basket";
const CHANGE_EVENT = "taste-trace:basket-change";
const OPEN_EVENT = "taste-trace:open-basket";
const EMPTY: BasketItem[] = [];

let cachedRaw: string | null = null;
let cachedItems: BasketItem[] = EMPTY;

// 無痕模式或封鎖網站資料時 localStorage 可能無法使用，一律包 try/catch
function read(): BasketItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedItems = raw ? (JSON.parse(raw) as BasketItem[]) : EMPTY;
    }
    return cachedItems;
  } catch {
    return EMPTY;
  }
}

function write(items: BasketItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // 無法儲存時這次操作不保留
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export const basketId = (recipeTitle: string, name: string) => `${recipeTitle}::${name}`;

export function addToBasket(items: Omit<BasketItem, "done">[]) {
  const current = read();
  const ids = new Set(current.map((item) => item.id));
  // 已在籃子裡的食材更新份量（例如換了人數）
  const updated = current.map((item) => {
    const next = items.find((i) => i.id === item.id);
    return next ? { ...item, ...next } : item;
  });
  write([...updated, ...items.filter((item) => !ids.has(item.id)).map((item) => ({ ...item, done: false }))]);
}

export function removeFromBasket(id: string) {
  write(read().filter((item) => item.id !== id));
}

export function toggleBasketDone(id: string) {
  write(read().map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
}

export function clearBasket(onlyDone = false) {
  write(onlyDone ? read().filter((item) => !item.done) : []);
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange); // 其他分頁修改時同步
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useBasket(): BasketItem[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function openBasket() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function onOpenBasket(handler: () => void) {
  window.addEventListener(OPEN_EVENT, handler);
  return () => window.removeEventListener(OPEN_EVENT, handler);
}
