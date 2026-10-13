import { defineRouting } from "next-intl/routing";

// 介面語系：只影響介面文字，食譜資料維持原樣
export const routing = defineRouting({
  locales: ["zh-TW", "en", "ja"],
  defaultLocale: "zh-TW",
  // 繁中網址不加前綴（/explore），其他語系是 /en/explore、/ja/explore
  localePrefix: "as-needed",
});

export type AppLocale = (typeof routing.locales)[number];

export const LOCALE_LABELS: Record<AppLocale, string> = {
  "zh-TW": "繁中",
  en: "EN",
  ja: "日本語",
};

// <html lang>、日期格式用的語言標籤
export const HTML_LANG: Record<AppLocale, string> = {
  "zh-TW": "zh-Hant-TW",
  en: "en",
  ja: "ja",
};
