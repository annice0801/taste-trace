"use client";

// 蔬果挑選標準的彈出視窗：依感官與目的列出怎麼挑
// 內容從資料庫讀取，不呼叫 AI，不需要金鑰

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { PickingGuide, Sense } from "@/lib/picking";

export type PickingTarget = { name: string; englishName?: string };

type LoadResult =
  | { status: "error"; error: string }
  | { status: "missing" }
  | { status: "done"; guide: PickingGuide };

const SENSE_ICONS: Record<Sense, string> = { look: "👀", touch: "✋", sound: "👂", smell: "👃", weight: "⚖️" };

export function PickingGuideDialog({ target, onClose }: { target: PickingTarget | null; onClose: () => void }) {
  const t = useTranslations("Produce");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // 結果記下是哪一次請求的；換了蔬果、結果還沒回來時就顯示載入中
  const requestKey = target ? `${target.name}#${reloadKey}` : "";
  const [result, setResult] = useState<{ key: string; value: LoadResult } | null>(null);
  const state = result?.key === requestKey ? result.value : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (target && dialog && !dialog.open) dialog.showModal();
  }, [target]);

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    const finish = (value: LoadResult) => !cancelled && setResult({ key: requestKey, value });
    const query = new URLSearchParams({ name: target.name });
    if (target.englishName) query.set("en", target.englishName);
    fetch(`/api/picking?${query}`)
      .then(async (res) => {
        if (res.status === 404) return finish({ status: "missing" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return finish({ status: "error", error: data.error ?? t("loadError") });
        finish({ status: "done", guide: data as PickingGuide });
      })
      .catch(() => finish({ status: "error", error: t("networkError") }));
    return () => {
      cancelled = true;
    };
  }, [target, requestKey, t]);

  const guide = state?.status === "done" ? state.guide : null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      // 點視窗外的灰色背景關閉
      onClick={(event) => event.target === event.currentTarget && dialogRef.current?.close()}
      aria-labelledby="picking-title"
      className="m-auto max-h-[88vh] w-[min(640px,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-border bg-surface p-0 text-foreground backdrop:bg-black/40"
    >
      {target && (
        <div className="p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <h2 id="picking-title" className="font-serif text-2xl leading-snug">
              {t("pickingTitle", { name: guide?.name ?? target.name })}
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label={t("pickingClose")}
              className="-mr-2 -mt-1 rounded-full px-2.5 py-1 text-xl leading-none text-muted hover:text-foreground"
            >
              ×
            </button>
          </div>

          {!state && <p className="mt-6 animate-pulse text-sm text-muted">{t("pickingLoading")}</p>}

          {state?.status === "missing" && (
            <p className="mt-6 text-sm leading-relaxed text-muted">{t("pickingNotFound", { name: target.name })}</p>
          )}

          {state?.status === "error" && (
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-red-700 dark:text-red-300">
              <span>{state.error}</span>
              <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="font-medium underline underline-offset-4">
                {t("retry")}
              </button>
            </div>
          )}

          {guide && (
            <>
              {guide.summary && <p className="mt-3 rounded-lg bg-accent-soft px-4 py-3 text-[15px] leading-relaxed">{guide.summary}</p>}

              <h3 className="eyebrow mt-7">{t("pickingSenses")}</h3>
              <ul className="mt-3 space-y-3">
                {guide.senses.map((s) => (
                  <li key={s.sense} className="flex gap-3 rounded-xl border border-border p-4">
                    <span className="flex w-10 shrink-0 flex-col items-center text-center">
                      <span className="text-2xl" aria-hidden>{SENSE_ICONS[s.sense]}</span>
                      <span className="mt-1 text-xs font-medium">{t(`senses.${s.sense}`)}</span>
                    </span>
                    <div className="min-w-0 space-y-1.5 text-sm leading-relaxed">
                      <p>
                        <span className="mr-1.5 font-medium text-emerald-700 dark:text-emerald-300">✓ {t("pickingGood")}</span>
                        {s.good}
                      </p>
                      {s.avoid && (
                        <p>
                          <span className="mr-1.5 font-medium text-red-700 dark:text-red-300">✕ {t("pickingAvoid")}</span>
                          {s.avoid}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {guide.goals.length > 0 && (
                <>
                  <h3 className="eyebrow mt-7">{t("pickingGoals")}</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {guide.goals.map((g) => (
                      <div key={g.goal} className="rounded-xl border border-border p-4">
                        <p className="font-medium">{g.goal}</p>
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-relaxed">
                          {g.tips.map((tip) => (
                            <li key={tip}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <dl className="mt-7 space-y-3 text-sm leading-relaxed">
                {guide.ripening && (
                  <div className="flex gap-3">
                    <dt className="w-16 shrink-0 text-muted">{t("pickingRipening")}</dt>
                    <dd>{guide.ripening}</dd>
                  </div>
                )}
                {guide.storage && (
                  <div className="flex gap-3">
                    <dt className="w-16 shrink-0 text-muted">{t("pickingStorage")}</dt>
                    <dd>{guide.storage}</dd>
                  </div>
                )}
                {guide.myth && (
                  <div className="flex gap-3">
                    <dt className="w-16 shrink-0 text-muted">{t("pickingMyth")}</dt>
                    <dd>{guide.myth}</dd>
                  </div>
                )}
              </dl>

              <p className="mt-6 text-xs text-muted">{t("pickingNote")}</p>
            </>
          )}
        </div>
      )}
    </dialog>
  );
}
