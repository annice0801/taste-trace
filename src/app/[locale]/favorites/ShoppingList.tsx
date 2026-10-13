"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { ServingStepper } from "@/components/RecipeDetailView";
import { ingredientKey, mergeAmounts, scaleAmount } from "@/lib/quantity";
import type { FavoriteItem } from "@/lib/recommendation";

type ShoppingItem = {
  key: string;
  name: string;
  amount: string;
  substitutes: string[]; // 當地超市買不到時可用的替代品
  recipes: string[]; // 用到這項食材的菜
};

// 把多道菜的食材依份量換算後合併：同名食材加總，並附上當地替代提示
function buildShoppingList(recipes: FavoriteItem[], servings: number): ShoppingItem[] {
  const items = new Map<string, ShoppingItem & { amounts: string[] }>();

  for (const recipe of recipes) {
    if (!recipe.detail) continue;
    const factor = recipe.servings ? servings / recipe.servings : 1;
    for (const ingredient of recipe.detail.ingredients) {
      const key = ingredientKey(ingredient.name);
      const item =
        items.get(key) ??
        { key, name: ingredient.name, amount: "", amounts: [], substitutes: [], recipes: [] };
      item.amounts.push(scaleAmount(ingredient.amount, factor));
      if (ingredient.localSubstitute && !item.substitutes.includes(ingredient.localSubstitute)) {
        item.substitutes.push(ingredient.localSubstitute);
      }
      if (!item.recipes.includes(recipe.title)) item.recipes.push(recipe.title);
      items.set(key, item);
    }
  }

  return [...items.values()].map(({ amounts, ...item }) => ({
    ...item,
    amount: mergeAmounts(amounts),
  }));
}

export default function ShoppingList({
  recipes,
  onClear,
}: {
  recipes: FavoriteItem[];
  onClear: () => void;
}) {
  const t = useTranslations("Shopping");
  const tb = useTranslations("Basket");
  const sep = tb("sep");
  const [servings, setServings] = useState(2);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const items = useMemo(() => buildShoppingList(recipes, servings), [recipes, servings]);
  const remaining = items.filter((item) => !checked.has(item.key)).length;

  function toggle(key: string) {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function copy() {
    const text = [
      t("copyHeader", { count: servings, recipes: recipes.map((r) => r.title).join(sep) }),
      ...items.map(
        (item) =>
          `□ ${item.name} ${item.amount}` +
          (item.substitutes.length ? ` (${tb("substitute", { items: item.substitutes.join(sep) })})` : ""),
      ),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 不支援剪貼簿時不處理
    }
  }

  return (
    <section className="rounded-2xl border border-foreground bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl">{t("title")}</h2>
          <p className="text-sm text-muted">
            {recipes.map((r) => r.title).join(sep)}・{t("remaining", { remaining, total: items.length })}
          </p>
        </div>
        <ServingStepper value={servings} onChange={setServings} />
      </div>

      <ul className="mt-4 divide-y divide-border">
        {items.map((item) => {
          const done = checked.has(item.key);
          return (
            <li key={item.key} className="py-2">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => toggle(item.key)}
                  className="mt-1 size-4 accent-[var(--foreground)]"
                />
                <span className={`min-w-0 flex-1 ${done ? "text-muted line-through" : ""}`}>
                  <span className="flex justify-between gap-2 text-sm">
                    <span>{item.name}</span>
                    <span className="shrink-0 text-muted">{item.amount}</span>
                  </span>
                  {item.substitutes.length > 0 && (
                    <span className="block text-xs text-accent">
                      {tb("substitute", { items: item.substitutes.join(sep) })}
                    </span>
                  )}
                  {recipes.length > 1 && (
                    <span className="block text-xs text-muted">{tb("usedIn", { recipes: item.recipes.join(sep) })}</span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copy}
          className="btn-primary !py-2"
        >
          {copied ? `${tb("copied")} ✓` : tb("copy")}
        </button>
        <button
          type="button"
          onClick={onClear}
          className="btn-secondary !py-2"
        >
          {t("clear")}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">
        {t("mergeNote")}
      </p>
    </section>
  );
}
