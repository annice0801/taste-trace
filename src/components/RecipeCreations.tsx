"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import CreationCard from "@/components/CreationCard";
import CreationFields from "@/components/CreationFields";
import { signInWithGoogle } from "@/lib/auth-client";
import { uploadCreationFile, type CreationFieldsValue } from "@/lib/creation-client";
import { MAX_CREATIONS_PER_RECIPE, type RecipeCreation } from "@/lib/recommendation";
import { useErrorMessage } from "@/lib/use-error-message";

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "done"; creations: RecipeCreation[]; signedIn: boolean };

const EMPTY_FIELDS: CreationFieldsValue = { caption: "", note: "", visibility: "public" };

// 食譜裡的「大家的作品」：看別人公開的做法過程，也能直接上傳自己的作品
export default function RecipeCreations({ recipeId }: { recipeId: string }) {
  const t = useTranslations("Creations");
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/creations?recipeId=${recipeId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) setState({ status: "done", creations: data.creations, signedIn: data.signedIn });
      })
      .catch(() => !cancelled && setState({ status: "error" }));
    return () => {
      cancelled = true;
    };
  }, [recipeId]);

  if (state.status === "loading") {
    return <p className="mt-10 animate-pulse text-sm text-muted">{t("loading")}</p>;
  }
  if (state.status === "error") {
    return <p className="mt-10 text-sm text-muted">{t("loadError")}</p>;
  }

  const { creations, signedIn } = state;
  const mineCount = creations.filter((creation) => creation.mine).length;
  const othersCount = creations.length - mineCount;
  const update = (next: (list: RecipeCreation[]) => RecipeCreation[]) =>
    setState({ ...state, creations: next(creations) });

  return (
    <section className="mt-10 min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-foreground pb-2">
        <h4 className="font-serif text-lg">
          {t("sectionTitle")}
          <span className="ml-2 text-sm text-muted">
            {othersCount > 0 ? t("sharedCount", { count: othersCount }) : t("noneShared")}
            {mineCount > 0 && `・${t("mineCount", { count: mineCount })}`}
          </span>
        </h4>
        {!composing && (
          <button
            type="button"
            onClick={() =>
              signedIn ? setComposing(true) : signInWithGoogle(window.location.pathname)
            }
            disabled={mineCount >= MAX_CREATIONS_PER_RECIPE}
            className="btn-secondary !px-3.5 !py-1.5 !text-xs"
          >
            {mineCount >= MAX_CREATIONS_PER_RECIPE
              ? t("full")
              : signedIn
                ? `＋ ${t("shareMine")}`
                : t("signInToShare")}
          </button>
        )}
      </div>

      {composing && (
        <Composer
          recipeId={recipeId}
          onCancel={() => setComposing(false)}
          onUploaded={(creation) => {
            update((list) => [creation, ...list]);
            setComposing(false);
          }}
        />
      )}

      {creations.length === 0 ? (
        !composing && (
          <p className="py-8 text-sm leading-relaxed text-muted">
            {t("emptyHint")}
          </p>
        )
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
          {creations.map((creation) => (
            <li key={creation.id} className="min-w-0 has-[[data-editing]]:col-span-full">
              <CreationCard
                creation={creation}
                mine={creation.mine}
                authorName={creation.authorName}
                sizes="(max-width: 640px) 50vw, 240px"
                onChange={(next) =>
                  update((list) =>
                    list.map((c) => (c.id === next.id ? { ...c, ...next } : c)),
                  )
                }
                onDelete={(id) => update((list) => list.filter((c) => c.id !== id))}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Composer({
  recipeId,
  onCancel,
  onUploaded,
}: {
  recipeId: string;
  onCancel: () => void;
  onUploaded: (creation: RecipeCreation) => void;
}) {
  const t = useTranslations("Creations");
  const errorMessage = useErrorMessage();
  const [file, setFile] = useState<File | null>(null);
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [status, setStatus] = useState<{ working?: string; error?: string }>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function submit() {
    if (!file) return;
    try {
      const creation = await uploadCreationFile({
        file,
        recipeId,
        fields,
        markCooked: true,
        onStatus: (step) => setStatus({ working: t(`status.${step}`) }),
      });
      onUploaded({ ...creation, authorName: t("you"), mine: true });
    } catch (err) {
      setStatus({ error: errorMessage(err, "uploadFailed") });
    }
  }

  return (
    <form
      className="mt-5 grid gap-5 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-[minmax(0,14rem)_1fr] sm:p-6"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label className="relative flex aspect-[16/9] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-background text-center transition hover:border-foreground sm:aspect-square">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- 本機預覽的 blob: 網址不經過 next/image
          <img src={preview} alt={t("previewAlt")} className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="px-4">
            <span className="mx-auto flex size-10 items-center justify-center rounded-full border border-border text-lg text-muted" aria-hidden>
              +
            </span>
            <span className="mt-3 block text-sm">{t("pickPhoto")}</span>
            <span className="mt-1 block text-[11px] text-muted">{t("pickPhotoHint")}</span>
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const picked = event.target.files?.[0];
            if (picked?.type.startsWith("image/")) {
              setFile(picked);
              setStatus({});
            }
          }}
        />
      </label>

      <div className="min-w-0">
        <CreationFields value={fields} onChange={setFields} idPrefix={`new-${recipeId}`} />
        <p className="mt-3 min-h-4 text-xs text-red-700 dark:text-red-300" role="status">
          {status.error}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="submit" disabled={!file || Boolean(status.working)} className="btn-primary !px-5 !py-2 !text-sm">
            {status.working ?? (file ? t("upload") : t("pickFirst"))}
          </button>
          <button type="button" onClick={onCancel} disabled={Boolean(status.working)} className="btn-secondary !px-5 !py-2 !text-sm">
            {t("cancel")}
          </button>
        </div>
        <p className="mt-3 text-[11px] text-muted">{t("autoSaveHint")}</p>
      </div>
    </form>
  );
}
