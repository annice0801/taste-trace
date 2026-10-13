"use client";

// 匿名使用行為事件（不含使用者資訊），送到 /api/events
export type AnalyticsEventInput = {
  type: "recipe_impression" | "recipe_open";
  recipeId: string;
  category: string;
  tags: string[];
};

export function track(events: AnalyticsEventInput[]) {
  if (events.length === 0) return;
  const body = JSON.stringify({ events });
  try {
    // sendBeacon 在換頁時也送得出去；不支援時改用 fetch keepalive
    if (navigator.sendBeacon?.("/api/events", new Blob([body], { type: "application/json" }))) return;
    void fetch("/api/events", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
  } catch {
    // 統計失敗不影響使用
  }
}
