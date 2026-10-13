"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, getCategory } from "@/lib/categories";
import {
  FAVORITE_LABELS,
  keysOf,
  MAIN_INGREDIENTS,
  ROLES,
  SCENES,
  TASTE_NOTES,
  type FavoriteLabel,
} from "@/lib/recipe-tags";
import type { FavoriteItem } from "@/lib/recommendation";
import FavoriteCard from "./FavoriteCard";
import ShoppingList from "./ShoppingList";

const ALL = "all";

function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T | typeof ALL; label: string }[];
  value: T | typeof ALL;
  onChange: (value: T | typeof ALL) => void;
}) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className="chip shrink-0"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function FavoritesList({
  initialFavorites,
}: {
  initialFavorites: FavoriteItem[];
}) {
  const t = useTranslations("Favorites");
  const tt = useTranslations("Tags");
  const tc = useTranslations("Categories.items");
  const [favorites, setFavorites] = useState(initialFavorites);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [label, setLabel] = useState<FavoriteLabel | typeof ALL>(ALL);
  const [shoppingIds, setShoppingIds] = useState<string[]>([]);

  // 只顯示有收藏的類別
  const categoryOptions = useMemo(
    () => [
      { value: ALL, label: t("allCategories") },
      ...CATEGORIES.filter((c) => favorites.some((f) => f.category === c.slug)).map((c) => ({
        value: c.slug,
        label: tc(`${c.slug}.label`),
      })),
    ],
    [favorites, t, tc],
  );

  const labelOptions: { value: FavoriteLabel | typeof ALL; label: string }[] = [
    { value: ALL, label: t("allSaved") },
    ...keysOf(FAVORITE_LABELS).map((key) => ({
      value: key,
      label: t("labelCount", {
        label: tt(`favoriteLabels.${key}`),
        count: favorites.filter((f) => f.labels.includes(key)).length,
      }),
    })),
  ];

  // 依菜名、介紹、食材、口味、分類標籤與筆記快速查找
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return favorites.filter((favorite) => {
      if (category !== ALL && favorite.category !== category) return false;
      if (label !== ALL && !favorite.labels.includes(label)) return false;
      if (!keyword) return true;
      const haystack = [
        favorite.title,
        favorite.description,
        favorite.cuisine,
        favorite.note,
        ...favorite.flavors,
        // 中文標籤與目前語系的標籤都能搜尋
        ...favorite.scenes.flatMap((s) => [SCENES[s], tt(`scenes.${s}`)]),
        ...(favorite.role ? [ROLES[favorite.role], tt(`roles.${favorite.role}`)] : []),
        ...favorite.mainIngredients.flatMap((m) => [MAIN_INGREDIENTS[m], tt(`mainIngredients.${m}`)]),
        ...favorite.tasteNotes.flatMap((note) => [TASTE_NOTES[note], tt(`tasteNotes.${note}`)]),
        ...(favorite.detail?.ingredients.map((i) => i.name) ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [favorites, query, category, label, tt]);

  const shoppingRecipes = favorites.filter((f) => shoppingIds.includes(f.recipeId));

  function updateFavorite(updated: FavoriteItem) {
    setFavorites((list) => list.map((f) => (f.recipeId === updated.recipeId ? updated : f)));
  }

  function removeFavorite(recipeId: string) {
    setFavorites((list) => list.filter((f) => f.recipeId !== recipeId));
    setShoppingIds((ids) => ids.filter((id) => id !== recipeId));
  }

  if (favorites.length === 0) {
    return (
      <div className="mt-10 rounded-2xl border border-border bg-surface px-6 py-12 text-center">
        <p className="font-serif text-2xl">{t("empty")}</p>
        <Link href="/explore" className="btn-primary mt-6">
          {t("pickDish")} <span aria-hidden>→</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-5">
      {shoppingRecipes.length > 0 && (
        <ShoppingList recipes={shoppingRecipes} onClear={() => setShoppingIds([])} />
      )}

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("searchPlaceholder")}
        className="field"
      />

      <FilterChips options={labelOptions} value={label} onChange={setLabel} />
      {categoryOptions.length > 2 && (
        <FilterChips options={categoryOptions} value={category} onChange={setCategory} />
      )}

      <p className="text-sm text-muted">
        {t("count", { count: filtered.length })}
        {filtered.length !== favorites.length && t("ofTotal", { count: favorites.length })}
      </p>

      <ul className="space-y-4">
        {filtered.map((favorite) => {
          const categoryInfo = getCategory(favorite.category);
          return (
            <li key={favorite.recipeId}>
              <FavoriteCard
                favorite={favorite}
                categorySlug={favorite.category}
                personaName={
                  categoryInfo ? tc(`${categoryInfo.slug}.personaName`) : t("defaultPersona")
                }
                selected={shoppingIds.includes(favorite.recipeId)}
                onSelect={(selected) =>
                  setShoppingIds((ids) =>
                    selected
                      ? [...ids, favorite.recipeId]
                      : ids.filter((id) => id !== favorite.recipeId),
                  )
                }
                onChange={updateFavorite}
                onRemove={() => removeFavorite(favorite.recipeId)}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
