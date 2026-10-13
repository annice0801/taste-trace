"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import CategoryGlyph from "@/components/CategoryGlyph";
import { recipeBadges } from "@/components/recipe-badges";
import RecipeDetailView from "@/components/RecipeDetailView";
import { Link } from "@/i18n/navigation";
import { ImageCredit } from "@/components/RecipeHero";
import RecipeTags from "@/components/RecipeTags";
import SaveButton from "@/components/SaveButton";
import {
  FAVORITE_LABELS,
  keysOf,
  TASTE_NOTES,
  type FavoriteLabel,
  type TasteNote,
} from "@/lib/recipe-tags";
import type { FavoriteItem, FavoriteUpdate } from "@/lib/recommendation";

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export default function FavoriteCard({
  favorite,
  categorySlug,
  personaName,
  selected,
  onSelect,
  onChange,
  onRemove,
}: {
  favorite: FavoriteItem;
  categorySlug: string;
  personaName: string;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onChange: (favorite: FavoriteItem) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("Favorites");
  const tt = useTranslations("Tags");
  const tr = useTranslations("Recommender");
  const tp = useTranslations("Photo");
  const [note, setNote] = useState(favorite.note);
  const [error, setError] = useState("");
  const badges = recipeBadges(favorite, tt);

  // 先更新畫面再存檔，失敗就還原
  async function save(update: Omit<FavoriteUpdate, "recipeId">) {
    const previous = favorite;
    onChange({
      ...favorite,
      ...(update.labels && { labels: update.labels }),
      ...(update.tasteNotes && { tasteNotes: update.tasteNotes }),
      ...(update.note !== undefined && { note: update.note }),
    });
    setError("");
    try {
      const res = await fetch("/api/favorites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId: favorite.recipeId, ...update }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? t("saveError"));
    } catch (err) {
      onChange(previous);
      setError(err instanceof Error ? err.message : t("saveError"));
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-surface p-4 sm:p-6">
      <div className="flex gap-4 sm:gap-5">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-sm bg-accent-soft sm:size-32">
          {favorite.image ? (
            <Image
              src={favorite.image.url}
              alt={tp("recipeAlt", { title: favorite.title })}
              fill
              sizes="112px"
              className="object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center" aria-hidden>
              <CategoryGlyph slug={categorySlug} size={72} />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="min-w-0 font-serif text-xl leading-snug sm:text-2xl">{favorite.title}</h2>
            <SaveButton
              recipeId={favorite.recipeId}
              initialSaved
              onChange={(saved) => !saved && onRemove()}
            />
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted">{favorite.description}</p>
          {badges.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {badges.map((badge) => (
                <span key={badge} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
                  {badge}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <RecipeTags
        cuisine={favorite.cuisine}
        servings={favorite.servings}
        flavors={favorite.flavors}
      />

      {/* 收藏分類 */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {keysOf(FAVORITE_LABELS).map((label: FavoriteLabel) => {
          const active = favorite.labels.includes(label);
          return (
            <button
              key={label}
              type="button"
              aria-pressed={active}
              onClick={() => save({ labels: toggle(favorite.labels, label) })}
              className="chip !px-3 !py-1 !text-xs"
            >
              {tt(`favoriteLabels.${label}`)}
            </button>
          );
        })}
      </div>

      {/* 隨手記 */}
      <div className="mt-3 rounded-xl bg-background p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-muted">{t("quickNotes")}</span>
          {keysOf(TASTE_NOTES).map((taste: TasteNote) => {
            const active = favorite.tasteNotes.includes(taste);
            return (
              <button
                key={taste}
                type="button"
                aria-pressed={active}
                onClick={() => save({ tasteNotes: toggle(favorite.tasteNotes, taste) })}
                className={`rounded-full px-2.5 py-0.5 text-xs transition ${
                  active
                    ? "bg-accent text-white"
                    : "bg-surface text-muted hover:text-foreground"
                }`}
              >
                {tt(`tasteNotes.${taste}`)}
              </button>
            );
          })}
        </div>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => note.trim() !== favorite.note && save({ note: note.trim() })}
          onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
          maxLength={200}
          placeholder={t("notePlaceholder")}
          className="field mt-2 !rounded-lg !px-3 !py-1.5 text-sm"
        />
        {error && <p className="mt-1 text-xs text-red-700 dark:text-red-300">{error}</p>}
      </div>

      {/* 作品照 */}
      <div className="mt-4 flex items-center gap-3">
        {favorite.creations.length > 0 && (
          <ul className="flex -space-x-2">
            {favorite.creations.slice(0, 4).map((creation) => (
              <li key={creation.id} className="relative size-10 overflow-hidden rounded-full border-2 border-surface bg-border">
                <Image src={creation.url} alt={creation.caption || t("creationAlt")} fill sizes="40px" className="object-cover" />
              </li>
            ))}
          </ul>
        )}
        <Link
          href={`/works?recipe=${favorite.recipeId}`}
          className="text-sm text-muted underline underline-offset-4 hover:text-foreground"
        >
          {favorite.creations.length > 0
            ? t("creationsMore", { count: favorite.creations.length })
            : t("creationsFirst")}
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        {favorite.detail ? (
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected}
              onChange={(event) => onSelect(event.target.checked)}
              className="size-4 accent-[var(--foreground)]"
            />
            {t("addToShopping")}
          </label>
        ) : (
          <span className="text-xs text-muted">{t("noDetail")}</span>
        )}
        {favorite.image && <ImageCredit image={favorite.image} />}
      </div>

      {favorite.detail && (
        <details className="group mt-3 border-t border-border">
          <summary className="flex cursor-pointer list-none items-center justify-between pt-3 pb-1 text-sm font-medium [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">{tr("showDetail")}</span>
            <span className="hidden group-open:inline">{t("collapse")}</span>
            <span className="text-muted transition group-open:rotate-180" aria-hidden>↓</span>
          </summary>
          <RecipeDetailView
            detail={favorite.detail}
            personaName={personaName}
            baseServings={favorite.servings}
            recipeTitle={favorite.title}
            recipeId={favorite.recipeId}
          />
        </details>
      )}
    </article>
  );
}
