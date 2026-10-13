"use client";

import { useTranslations } from "next-intl";
import type { CreationFieldsValue } from "@/lib/creation-client";
import { MAX_CAPTION_LENGTH, MAX_NOTE_LENGTH } from "@/lib/recommendation";

// 作品的文字欄位：公開的「做的過程」、只有自己看得到的「私人備註」、公開開關
export default function CreationFields({
  value,
  onChange,
  idPrefix,
}: {
  value: CreationFieldsValue;
  onChange: (value: CreationFieldsValue) => void;
  idPrefix: string;
}) {
  const t = useTranslations("Creations");
  const isPublic = value.visibility === "public";
  return (
    <div className="space-y-5">
      <div>
        <label htmlFor={`${idPrefix}-caption`} className="flex items-baseline justify-between gap-3 text-sm font-medium">
          {t("caption")}
          <span className="text-[11px] font-normal text-muted">
            {isPublic ? t("captionPublic") : t("captionPrivate")}
          </span>
        </label>
        <textarea
          id={`${idPrefix}-caption`}
          value={value.caption}
          onChange={(event) => onChange({ ...value, caption: event.target.value })}
          maxLength={MAX_CAPTION_LENGTH}
          rows={3}
          placeholder={t("captionPlaceholder")}
          className="field mt-2 resize-y leading-relaxed"
        />
        <p className="mt-1 text-right text-[11px] text-muted tabular-nums">
          {value.caption.length} / {MAX_CAPTION_LENGTH}
        </p>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-note`} className="flex items-baseline justify-between gap-3 text-sm font-medium">
          {t("note")}
          <span className="inline-flex items-center gap-1 text-[11px] font-normal text-muted">
            <LockIcon /> {t("onlyYou")}
          </span>
        </label>
        <textarea
          id={`${idPrefix}-note`}
          value={value.note}
          onChange={(event) => onChange({ ...value, note: event.target.value })}
          maxLength={MAX_NOTE_LENGTH}
          rows={2}
          placeholder={t("notePlaceholder")}
          className="field mt-2 resize-y border-dashed leading-relaxed"
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background px-4 py-3">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(event) =>
            onChange({ ...value, visibility: event.target.checked ? "public" : "private" })
          }
          className="mt-0.5 size-4 shrink-0 accent-[var(--foreground)]"
        />
        <span className="text-sm leading-snug">
          {t("share")}
          <span className="mt-0.5 block text-xs text-muted">
            {t("shareHint")}
          </span>
        </span>
      </label>
    </div>
  );
}

export function LockIcon({ className = "size-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}
