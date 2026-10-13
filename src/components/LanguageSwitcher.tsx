"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALE_LABELS, routing, type AppLocale } from "@/i18n/routing";

// 右上角的介面語系切換：只換介面文字，留在同一頁
export default function LanguageSwitcher() {
  const t = useTranslations("Header");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function choose(next: AppLocale) {
    setOpen(false);
    if (next === locale) return;
    startTransition(() => {
      router.replace(
        // 保留網址上的查詢參數與錨點
        pathname + window.location.search + window.location.hash,
        { locale: next, scroll: false },
      );
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t("language", { current: LOCALE_LABELS[locale] })}
        className={`flex h-9 items-center gap-1.5 rounded-full border border-border px-2.5 text-[13px] text-muted transition hover:border-foreground hover:text-foreground ${pending ? "opacity-60" : ""}`}
      >
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
          <circle cx="8" cy="8" r="6.25" />
          <path d="M1.75 8h12.5M8 1.75c1.9 1.8 2.8 3.9 2.8 6.25S9.9 12.45 8 14.25C6.1 12.45 5.2 10.35 5.2 8S6.1 3.55 8 1.75Z" />
        </svg>
        <span className="hidden sm:inline">{LOCALE_LABELS[locale]}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t("languageMenu")}
          className="absolute top-full right-0 z-40 mt-2 w-36 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.3)]"
        >
          {routing.locales.map((option) => (
            <li key={option} role="option" aria-selected={option === locale}>
              <button
                type="button"
                onClick={() => choose(option)}
                className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-background"
              >
                <span lang={option}>{LOCALE_LABELS[option]}</span>
                {option === locale && <span className="text-accent" aria-hidden>✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
