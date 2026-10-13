"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import CreationCard from "@/components/CreationCard";
import CreationFields from "@/components/CreationFields";
import { Link } from "@/i18n/navigation";
import { useErrorMessage } from "@/lib/use-error-message";
import { uploadCreationFile, type CreationFieldsValue } from "@/lib/creation-client";
import {
  MAX_CREATIONS_PER_RECIPE,
  type CreationItem,
} from "@/lib/recommendation";

type RecipeOption = {
  id: string;
  title: string;
  category: string;
  cooked: boolean;
};

type UploadStatus =
  | { type: "idle" }
  | { type: "working"; message: string }
  | { type: "error"; message: string }
  | { type: "done" };

const EMPTY_FIELDS: CreationFieldsValue = { caption: "", note: "", visibility: "public" };

export default function WorksStudio({
  recipes,
  initialCreations,
}: {
  recipes: RecipeOption[];
  initialCreations: CreationItem[];
}) {
  const t = useTranslations("Works");
  const tc = useTranslations("Creations");
  const errorMessage = useErrorMessage();
  const searchParams = useSearchParams();
  const requested = searchParams.get("recipe");
  const [creations, setCreations] = useState(initialCreations);
  const [recipeId, setRecipeId] = useState(
    recipes.some((recipe) => recipe.id === requested) ? requested! : (recipes[0]?.id ?? ""),
  );
  const [file, setFile] = useState<File | null>(null);
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [markCooked, setMarkCooked] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<UploadStatus>({ type: "idle" });
  const [filter, setFilter] = useState<string>("all");
  const inputRef = useRef<HTMLInputElement>(null);

  // 預覽用的暫時網址，換照片或離開頁面時釋放
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const selected = recipes.find((recipe) => recipe.id === recipeId);
  const usedCount = creations.filter((creation) => creation.recipeId === recipeId).length;
  const full = usedCount >= MAX_CREATIONS_PER_RECIPE;
  const working = status.type === "working";

  const shown = filter === "all" ? creations : creations.filter((c) => c.recipeId === filter);
  const filterOptions = recipes.filter((recipe) => creations.some((c) => c.recipeId === recipe.id));

  function pickFile(picked: File | undefined) {
    if (!picked) return;
    if (!picked.type.startsWith("image/")) {
      setStatus({ type: "error", message: errorMessage(new Error("notImage")) });
      return;
    }
    setFile(picked);
    setStatus({ type: "idle" });
  }

  async function upload() {
    if (!file || !recipeId) return;
    try {
      const creation = await uploadCreationFile({
        file,
        recipeId,
        fields,
        markCooked: markCooked && !selected?.cooked,
        onStatus: (step) => setStatus({ type: "working", message: tc(`status.${step}`) }),
      });
      setCreations((list) => [creation, ...list]);
      setFile(null);
      setFields(EMPTY_FIELDS);
      setStatus({ type: "done" });
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setStatus({ type: "error", message: errorMessage(err, "uploadFailed") });
    }
  }

  if (recipes.length === 0) {
    return (
      <div className="mt-10 rounded-2xl border border-border bg-surface px-6 py-12 text-center">
        <p className="font-serif text-2xl">{t("emptyTitle")}</p>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">
          {t("emptyBody")}
        </p>
        <Link href="/explore" className="btn-primary mt-6">
          {t("pickDish")} <span aria-hidden>→</span>
        </Link>
      </div>
    );
  }

  return (
    <>
      <section
        className="mt-10 grid gap-6 rounded-2xl border border-border bg-surface p-5 sm:p-8 md:grid-cols-[1fr_1.1fr] md:gap-10"
        aria-label={t("uploadSection")}
      >
        {/* 照片 */}
        <div className="min-w-0">
          <p className="eyebrow">01・{t("stepPhoto")}</p>
          <label
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              pickFile(event.dataTransfer.files[0]);
            }}
            className={`relative mt-3 flex aspect-[4/3] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed text-center transition ${
              dragging ? "border-foreground bg-accent-soft" : "border-border bg-background hover:border-foreground"
            }`}
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- 本機預覽的 blob: 網址不經過 next/image
              <img src={preview} alt={tc("previewAlt")} className="absolute inset-0 size-full object-cover" />
            ) : (
              <span className="px-6">
                <span className="mx-auto flex size-12 items-center justify-center rounded-full border border-border text-xl text-muted" aria-hidden>
                  +
                </span>
                <span className="mt-4 block font-serif text-lg">{t("dropzone")}</span>
                <span className="mt-1 block text-xs text-muted">{t("formats")}</span>
              </span>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => pickFile(event.target.files?.[0])}
            />
          </label>
          {file && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-2 text-xs text-muted underline underline-offset-4 hover:text-foreground"
            >
              {t("change")}
            </button>
          )}
          <p className="mt-3 text-xs leading-relaxed text-muted">
            {t("compressNote")}
          </p>
        </div>

        {/* 料理與說明 */}
        <form
          className="flex min-w-0 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            upload();
          }}
        >
          <label className="eyebrow" htmlFor="works-recipe">
            02・{t("stepRecipe")}
          </label>
          <select
            id="works-recipe"
            value={recipeId}
            onChange={(event) => setRecipeId(event.target.value)}
            className="field mt-3 appearance-none bg-[length:12px] bg-[right_1rem_center] bg-no-repeat pr-10"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%236b6157' stroke-width='1.5'/%3E%3C/svg%3E\")",
            }}
          >
            {recipes.map((recipe) => (
              <option key={recipe.id} value={recipe.id}>
                {recipe.title}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-muted">
            {t("usedCount", { used: usedCount, max: MAX_CREATIONS_PER_RECIPE })}
          </p>

          <p className="eyebrow mt-7">03・{t("stepNotes")}</p>
          <div className="mt-3">
            <CreationFields value={fields} onChange={setFields} idPrefix="works" />
          </div>

          {!selected?.cooked && (
            <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={markCooked}
                onChange={(event) => setMarkCooked(event.target.checked)}
                className="size-4 accent-[var(--foreground)]"
              />
              {t("markCooked")}
            </label>
          )}

          <div className="mt-auto pt-8">
            <button
              type="submit"
              disabled={!file || working || full}
              className="btn-primary w-full"
            >
              {working ? status.message : full ? t("full") : tc("upload")}
            </button>
            <p className="mt-3 min-h-5 text-center text-xs" role="status">
              {status.type === "error" && (
                <span className="text-red-700 dark:text-red-300">{status.message}</span>
              )}
              {status.type === "done" && <span className="text-green-700 dark:text-green-400">{t("done")}</span>}
            </p>
          </div>
        </form>
      </section>

      {/* 作品集 */}
      <section className="mt-16">
        <div className="flex flex-col gap-4 border-b border-foreground pb-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-serif text-2xl">
            {t("journal")}<span className="ml-2 text-base text-muted">{creations.length}</span>
          </h2>
          {filterOptions.length > 1 && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")} className="chip shrink-0">
                {t("all")}
              </button>
              {filterOptions.map((recipe) => (
                <button
                  key={recipe.id}
                  type="button"
                  aria-pressed={filter === recipe.id}
                  onClick={() => setFilter(recipe.id)}
                  className="chip shrink-0"
                >
                  {recipe.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {shown.length === 0 ? (
          <p className="py-16 text-center text-muted">{t("noCreations")}</p>
        ) : (
          <ul className="mt-8 columns-2 gap-4 sm:gap-6 lg:columns-3">
            {shown.map((creation) => (
              <li key={creation.id} className="mb-6 break-inside-avoid has-[[data-editing]]:[column-span:all]">
                <CreationCard
                  creation={creation}
                  mine
                  showRecipeTitle
                  sizes="(max-width: 1024px) 50vw, 320px"
                  onChange={(next) =>
                    setCreations((list) => list.map((c) => (c.id === next.id ? next : c)))
                  }
                  onDelete={(id) => setCreations((list) => list.filter((c) => c.id !== id))}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
