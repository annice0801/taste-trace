"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ingredientKey, mergeAmounts } from "@/lib/quantity";
import {
  clearBasket,
  onOpenBasket,
  removeFromBasket,
  toggleBasketDone,
  useBasket,
  type BasketItem,
} from "@/lib/shopping-basket";

type Group = { key: string; name: string; amount: string; substitutes: string[]; recipes: string[]; items: BasketItem[] };

// 同一種食材合併成一列，例：兩道菜都要洋蔥 → 洋蔥 1 又 1/2 顆
function groupItems(items: BasketItem[]): Group[] {
  const groups = new Map<string, Group>();
  for (const item of items) {
    const key = ingredientKey(item.name) || item.name;
    const group = groups.get(key) ?? { key, name: item.name, amount: "", substitutes: [], recipes: [], items: [] };
    group.items.push(item);
    if (item.substitute && !group.substitutes.includes(item.substitute)) group.substitutes.push(item.substitute);
    if (!group.recipes.includes(item.recipeTitle)) group.recipes.push(item.recipeTitle);
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => ({
    ...group,
    amount: mergeAmounts(group.items.map((item) => item.amount)),
  }));
}

// 頁首的「採買籃」按鈕與側邊清單
export default function BasketDrawer() {
  const t = useTranslations("Basket");
  const sep = t("sep");
  const items = useBasket();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const groups = useMemo(() => groupItems(items), [items]);
  const remaining = groups.filter((group) => !group.items.every((item) => item.done)).length;

  useEffect(() => onOpenBasket(() => setOpen(true)), []);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function copy() {
    const text = groups
      .filter((group) => !group.items.every((item) => item.done))
      .map((group) =>
        `□ ${group.name} ${group.amount}${group.substitutes.length ? ` (${t("substitute", { items: group.substitutes.join(sep) })})` : ""}`,
      )
      .join("\n");
    try {
      await navigator.clipboard.writeText(`${t("copyTitle")}\n${text}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 不支援剪貼簿時不做事
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-[13px] text-muted transition hover:border-foreground hover:text-foreground"
        aria-label={t("button", { count: remaining })}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        </svg>
        {remaining > 0 && (
          <span className="flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-medium text-white tabular-nums">
            {remaining}
          </span>
        )}
      </button>

      {/* 掛到 body：頁首的 backdrop-blur 會讓 fixed 元素只能在頁首範圍內顯示 */}
      {open &&
        createPortal(
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={t("title")}>
          <button type="button" className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} aria-label={t("close")} />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="eyebrow">Shopping basket</p>
                <h2 className="font-serif text-2xl">{t("title")}</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-9 items-center justify-center rounded-full border border-border text-lg"
                aria-label={t("close")}
              >
                ×
              </button>
            </div>

            {groups.length === 0 ? (
              <p className="flex-1 px-5 py-16 text-center text-sm leading-relaxed text-muted">
                {t.rich("empty", { br: () => <br /> })}
              </p>
            ) : (
              <ul className="flex-1 divide-y divide-border overflow-y-auto px-5">
                {groups.map((group) => {
                  const done = group.items.every((item) => item.done);
                  return (
                    <li key={group.key} className="flex items-start gap-3 py-3">
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={() => group.items.forEach((item) => item.done === done && toggleBasketDone(item.id))}
                        className="mt-1 size-4 accent-[var(--foreground)]"
                        aria-label={t("bought", { name: group.name })}
                      />
                      <div className={`min-w-0 flex-1 text-sm ${done ? "text-muted line-through" : ""}`}>
                        <div className="flex justify-between gap-3">
                          <span>{group.name}</span>
                          <span className="max-w-[50%] text-right text-muted tabular-nums">{group.amount}</span>
                        </div>
                        {group.substitutes.length > 0 && (
                          <p className="mt-0.5 text-xs text-accent">{t("substitute", { items: group.substitutes.join(sep) })}</p>
                        )}
                        <p className="mt-0.5 text-xs text-muted">{t("usedIn", { recipes: group.recipes.join(sep) })}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => group.items.forEach((item) => removeFromBasket(item.id))}
                        className="text-xs text-muted hover:text-foreground"
                        aria-label={t("removeItem", { name: group.name })}
                      >
                        {t("remove")}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {groups.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-border px-5 py-4">
                <button type="button" onClick={copy} className="btn-primary flex-1 !py-2">
                  {copied ? t("copied") : t("copy")}
                </button>
                <button type="button" onClick={() => clearBasket(true)} className="btn-secondary !py-2">
                  {t("clearDone")}
                </button>
                <button type="button" onClick={() => clearBasket()} className="btn-secondary !py-2">
                  {t("clearAll")}
                </button>
              </div>
            )}
          </aside>
        </div>,
          document.body,
        )}
    </>
  );
}
