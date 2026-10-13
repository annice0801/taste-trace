"use client";

import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import CreationFields, { LockIcon } from "@/components/CreationFields";
import {
  deleteCreationRequest,
  patchCreation,
  type CreationFieldsValue,
} from "@/lib/creation-client";
import type { CreationItem } from "@/lib/recommendation";
import { useErrorMessage } from "@/lib/use-error-message";

// 一張作品：照片、做的過程；自己的作品多了公開狀態、私人備註、編輯與刪除
export default function CreationCard({
  creation,
  mine,
  authorName,
  showRecipeTitle = false,
  sizes,
  onChange,
  onDelete,
}: {
  creation: CreationItem;
  mine: boolean;
  authorName?: string;
  showRecipeTitle?: boolean;
  sizes: string;
  onChange?: (creation: CreationItem) => void;
  onDelete?: (id: string) => void;
}) {
  const t = useTranslations("Creations");
  const format = useFormatter();
  const errorMessage = useErrorMessage();
  const date = format.dateTime(new Date(creation.createdAt), { year: "numeric", month: "long", day: "numeric" });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CreationFieldsValue>({
    caption: creation.caption,
    note: creation.note,
    visibility: creation.visibility,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isPublic = creation.visibility === "public";

  async function save() {
    setSaving(true);
    setError("");
    try {
      onChange?.(await patchCreation({ id: creation.id, ...draft }));
      setEditing(false);
    } catch (err) {
      setError(errorMessage(err, "saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm(t("confirmDelete", { title: creation.recipeTitle }))) return;
    try {
      await deleteCreationRequest(creation.id);
      onDelete?.(creation.id);
    } catch (err) {
      window.alert(errorMessage(err, "deleteFailed"));
    }
  }

  return (
    <figure className="min-w-0">
      <div className="relative overflow-hidden rounded-sm bg-border">
        <Image
          src={creation.url}
          alt={creation.caption || t("photoAlt", { title: creation.recipeTitle })}
          width={creation.width ?? 1200}
          height={creation.height ?? 900}
          sizes={sizes}
          className="h-auto w-full"
        />
        {mine && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-[#fbf8f3]/90 px-2.5 py-1 text-[11px] text-[#1d1a16]">
            {isPublic ? t("public") : <><LockIcon /> {t("private")}</>}
          </span>
        )}
      </div>

      <figcaption className="mt-2.5">
        {showRecipeTitle && <p className="font-serif text-base leading-snug">{creation.recipeTitle}</p>}
        {authorName && (
          <div className="flex items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft font-serif text-sm text-accent" aria-hidden>
              {authorName.slice(0, 1)}
            </span>
            <p className="min-w-0 leading-tight">
              <span className="block truncate text-xs font-medium">{mine ? t("you") : authorName}</span>
              <span className="block text-[11px] text-muted">{date}</span>
            </p>
          </div>
        )}

        {editing ? (
          // data-editing：外層格線偵測到後讓這張卡片佔滿整列，表單才不會擠
          <div data-editing className="mt-3 rounded-xl border border-border bg-surface p-4">
            <CreationFields value={draft} onChange={setDraft} idPrefix={`edit-${creation.id}`} />
            {error && <p className="mt-3 text-xs text-red-700 dark:text-red-300">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={save} disabled={saving} className="btn-primary !px-4 !py-2 !text-xs">
                {saving ? t("saving") : t("save")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setDraft({ caption: creation.caption, note: creation.note, visibility: creation.visibility });
                }}
                className="btn-secondary !px-4 !py-2 !text-xs"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        ) : (
          <>
            {creation.caption && (
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-line">{creation.caption}</p>
            )}
            {mine && creation.note && (
              <p className="mt-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs leading-relaxed whitespace-pre-line text-muted">
                <span className="mb-0.5 flex items-center gap-1 font-medium text-foreground">
                  <LockIcon /> {t("note")}
                </span>
                {creation.note}
              </p>
            )}
            {!authorName && (
              <p className="mt-1 text-[11px] text-muted">{date}</p>
            )}
            {mine && (
              <div className="mt-2 flex gap-4 text-xs">
                <button type="button" onClick={() => setEditing(true)} className="text-muted underline underline-offset-4 hover:text-foreground">
                  {t("edit")}
                </button>
                <button type="button" onClick={remove} className="text-muted underline underline-offset-4 hover:text-accent">
                  {t("delete")}
                </button>
              </div>
            )}
          </>
        )}
      </figcaption>
    </figure>
  );
}
