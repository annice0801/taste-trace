"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import RecipeDetailView from "@/components/RecipeDetailView";
import RecipeHero from "@/components/RecipeHero";
import RecipeTags from "@/components/RecipeTags";
import ChefAvatar from "@/components/ChefAvatar";
import { track } from "@/lib/analytics";
import { recipeTags } from "@/lib/analytics-tags";
import SaveButton from "@/components/SaveButton";
import type { ChefProfile, Persona } from "@/lib/categories";
import { KEY_ERROR_CODES } from "@/lib/openai-key";
import { openAIKeyHeaders, requestOpenAIKeyPanel } from "@/lib/openai-key-store";
import type {
  RecipeDetail,
  RecipeDetailRequest,
  RecipeImage,
  RecommendRequest,
  RecommendResponse,
  RecommendedRecipe,
} from "@/lib/recommendation";

const MOOD_KEYS = ["happy", "tired", "stressed", "comfort", "celebrate", "noAppetite"] as const;

type Status = "idle" | "locating" | "loading" | "done" | "error";

// API 錯誤；needsKey 代表要請使用者設定或更換 OpenAI 金鑰
class ApiError extends Error {
  constructor(
    message: string,
    readonly needsKey: boolean,
  ) {
    super(message);
  }
}

async function postJson<T>(url: string, body: unknown, fallbackError: string): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...openAIKeyHeaders() },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const needsKey = Object.values(KEY_ERROR_CODES).includes(data.code);
    throw new ApiError(data.error ?? fallbackError, needsKey);
  }
  return data as T;
}

function SetKeyButton() {
  const t = useTranslations("Recommender");
  return (
    <button
      type="button"
      onClick={requestOpenAIKeyPanel}
      className="btn-primary !py-1.5 !text-[13px]"
    >
      {t("setKey")}
    </button>
  );
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("geolocation unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 10000,
      maximumAge: 10 * 60 * 1000,
    });
  });
}

export default function Recommender({
  categorySlug,
  persona,
  chef,
}: {
  categorySlug: string;
  persona: Persona;
  chef?: ChefProfile;
}) {
  const t = useTranslations("Recommender");
  const [mood, setMood] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [userMessage, setUserMessage] = useState("");
  const [result, setResult] = useState<RecommendResponse | null>(null);
  const [error, setError] = useState("");
  const [errorNeedsKey, setErrorNeedsKey] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);

  const busy = status === "locating" || status === "loading";

  async function requestRecommendation(useWeather: boolean, moodText: string) {
    setError("");
    setResult(null);

    const body: RecommendRequest = {
      category: categorySlug,
      mood: moodText || undefined,
    };

    if (useWeather) {
      setStatus("locating");
      setUserMessage(moodText ? t("moodWithWeather", { mood: moodText }) : t("weatherOnly"));
      try {
        const position = await getPosition();
        body.location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      } catch {
        setStatus("error");
        setError(t("locationError"));
        return;
      }
    } else {
      setUserMessage(moodText);
    }

    setStatus("loading");
    setErrorNeedsKey(false);
    try {
      const recommendation = await postJson<RecommendResponse>(
        "/api/recommend",
        body,
        t("recommendError"),
      );
      setResult(recommendation);
      setStatus("done");
      track(
        recommendation.recipes.map((recipe) => ({
          type: "recipe_impression",
          recipeId: recipe.id,
          category: categorySlug,
          tags: recipeTags(recipe),
        })),
      );
      loadImages(recommendation);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : t("recommendError"));
      setErrorNeedsKey(err instanceof ApiError && err.needsKey);
    }
  }

  // 推薦先顯示，照片之後再補上（每道菜只會找一次，結果存在資料庫）
  async function loadImages(recommendation: RecommendResponse) {
    const missing = recommendation.recipes.filter((recipe) => !recipe.image);
    if (missing.length === 0) return;

    setLoadingImages(true);
    try {
      const res = await fetch("/api/recipe-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeIds: missing.map((recipe) => recipe.id) }),
      });
      if (!res.ok) return;
      const { images } = (await res.json()) as {
        images: Record<string, RecipeImage | null>;
      };
      setResult((current) =>
        current && {
          ...current,
          recipes: current.recipes.map((recipe) => ({
            ...recipe,
            image: recipe.image ?? images[recipe.id] ?? null,
          })),
        },
      );
    } catch {
      // 照片只是示意，失敗就維持佔位圖
    } finally {
      setLoadingImages(false);
    }
  }

  function reset() {
    setStatus("idle");
    setResult(null);
    setError("");
    setUserMessage("");
    setMood("");
  }

  return (
    <div className="space-y-8">
      <PersonaBubble persona={persona} chef={chef}>
        {persona.greeting}
      </PersonaBubble>

      {status === "idle" && (
        <form
          className="rounded-2xl border border-border bg-surface p-5 sm:p-7"
          onSubmit={(event) => {
            event.preventDefault();
            if (mood.trim()) requestRecommendation(false, mood.trim());
          }}
        >
          <p className="eyebrow">{t("moodLabel")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {MOOD_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => requestRecommendation(false, t(`moods.${key}`))}
                className="chip"
              >
                {t(`moods.${key}`)}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              value={mood}
              onChange={(event) => setMood(event.target.value)}
              maxLength={200}
              placeholder={t("moodPlaceholder")}
              className="field flex-1"
            />
            <button type="submit" disabled={!mood.trim()} className="btn-primary">
              {t("send")}
            </button>
          </div>

          <div className="my-6 flex items-center gap-4 text-xs text-muted">
            <span className="h-px flex-1 bg-border" />
            {t("or")}
            <span className="h-px flex-1 bg-border" />
          </div>

          <p className="eyebrow">{t("weatherLabel")}</p>
          <button
            type="button"
            onClick={() => requestRecommendation(true, mood.trim())}
            className="btn-secondary mt-4 w-full"
          >
            {mood.trim() ? t("weatherWithMood") : t("weatherButton")}
          </button>
          <p className="mt-2 text-center text-xs text-muted">{t("locationPrivacy")}</p>
        </form>
      )}

      {userMessage && (
        <div className="flex justify-end">
          <p className="max-w-[85%] rounded-2xl rounded-tr-md bg-foreground px-4 py-2.5 text-background">
            {userMessage}
          </p>
        </div>
      )}

      {busy && (
        <PersonaBubble persona={persona} chef={chef}>
          <span className="animate-pulse text-muted">
            {status === "locating" ? t("locating") : t("thinking", { name: persona.name })}
          </span>
        </PersonaBubble>
      )}

      {status === "error" && (
        <div className="space-y-4 rounded-2xl border border-red-300/70 bg-red-50 p-5 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <p>{error}</p>
          <div className="flex flex-wrap items-center gap-3">
            {errorNeedsKey && <SetKeyButton />}
            <button type="button" onClick={reset} className="text-sm font-medium underline underline-offset-4">
              {t("restart")}
            </button>
          </div>
        </div>
      )}

      {result && (
        <>
          <PersonaBubble persona={persona} chef={chef}>
            {result.weather && (
              <span className="mb-2 block text-xs text-muted">
                {result.weather.code !== undefined && t.has(`weatherCodes.${result.weather.code}`)
                  ? t(`weatherCodes.${result.weather.code}`)
                  : result.weather.description}
                ・{t("temperature", {
                  temperature: Math.round(result.weather.temperature),
                  feelsLike: Math.round(result.weather.apparentTemperature),
                })}
                <span className="ml-1.5 text-[10px] opacity-70">
                  {t("weatherSource")}
                  <a
                    href="https://open-meteo.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-dotted underline-offset-2 hover:text-foreground"
                  >
                    Open-Meteo
                  </a>
                </span>
              </span>
            )}
            <p>{result.message}</p>
          </PersonaBubble>

          <ol className="space-y-14 pt-4">
            {result.recipes.map((recipe, index) => (
              <li key={recipe.id}>
                <RecipeCard
                  recipe={recipe}
                  index={index}
                  categorySlug={categorySlug}
                  loadingImage={loadingImages && !recipe.image}
                  personaName={persona.name}
                />
              </li>
            ))}
          </ol>

          <button type="button" onClick={reset} className="btn-secondary w-full">
            {t("askAgain")}
          </button>
        </>
      )}
    </div>
  );
}

function PersonaBubble({
  persona,
  chef,
  children,
}: {
  persona: Persona;
  chef?: ChefProfile;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 sm:gap-4">
      {chef ? (
        <ChefAvatar chef={chef} size={44} showFlag={false} />
      ) : (
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-2xl"
          aria-hidden
        >
          {persona.avatar}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="mb-1.5 text-xs text-muted">
          <span className="font-medium text-foreground">{persona.name}</span>・{persona.title}
        </p>
        <div className="rounded-2xl rounded-tl-md border border-border bg-surface px-4 py-3 leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}

type DetailState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; detail: RecipeDetail }
  | { status: "error"; error: string; needsKey: boolean };

function RecipeCard({
  recipe,
  index,
  categorySlug,
  loadingImage,
  personaName,
}: {
  recipe: RecommendedRecipe;
  index: number;
  categorySlug: string;
  loadingImage: boolean;
  personaName: string;
}) {
  const t = useTranslations("Recommender");
  const [detailState, setDetailState] = useState<DetailState>({ status: "idle" });

  // 第一次展開才向後端要食材與做法（資料庫有就直接回傳），之後收起再展開不重抓
  async function loadDetail() {
    setDetailState({ status: "loading" });
    const body: RecipeDetailRequest = {
      recipeId: recipe.id,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    try {
      const detail = await postJson<RecipeDetail>(
        "/api/recipe-detail",
        body,
        t("detailError"),
      );
      setDetailState({ status: "done", detail });
    } catch (err) {
      setDetailState({
        status: "error",
        error: err instanceof Error ? err.message : t("detailError"),
        needsKey: err instanceof ApiError && err.needsKey,
      });
    }
  }

  return (
    <article>
      <RecipeHero recipe={recipe} categorySlug={categorySlug} loadingImage={loadingImage} />

      <div className="mt-5 flex items-baseline gap-3">
        <span className="section-number">{String(index + 1).padStart(2, "0")}</span>
        <h3 className="min-w-0 font-serif text-2xl leading-snug sm:text-3xl">{recipe.title}</h3>
      </div>
      <p className="mt-2 leading-relaxed text-muted">{recipe.description}</p>

      <RecipeTags
        cuisine={recipe.cuisine}
        servings={recipe.servings}
        flavors={recipe.flavors}
      />

      <blockquote className="mt-5 border-l-2 border-accent pl-4 text-[15px] leading-relaxed">
        {recipe.reason}
        <footer className="mt-1 text-xs text-muted">—— {personaName}</footer>
      </blockquote>

      <details
        className="group mt-6 border-t border-border"
        onToggle={(event) => {
          if (event.currentTarget.open && detailState.status === "idle") {
            loadDetail();
            track([{ type: "recipe_open", recipeId: recipe.id, category: categorySlug, tags: recipeTags(recipe) }]);
          }
        }}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">{t("showDetail")}</span>
          <span className="hidden group-open:inline">{t("hideDetail")}</span>
          <span className="text-muted transition group-open:rotate-180" aria-hidden>
            ↓
          </span>
        </summary>

        {detailState.status === "loading" && (
          <p className="animate-pulse pb-4 text-sm text-muted">{t("writing", { name: personaName })}</p>
        )}

        {detailState.status === "error" && (
          <div className="flex flex-wrap items-center gap-3 pb-4 text-sm text-red-700 dark:text-red-300">
            <span>{detailState.error}</span>
            {detailState.needsKey && <SetKeyButton />}
            <button type="button" onClick={loadDetail} className="font-medium underline underline-offset-4">
              {t("retry")}
            </button>
          </div>
        )}

        {detailState.status === "done" && (
          <>
            <RecipeDetailView
              detail={detailState.detail}
              personaName={personaName}
              baseServings={recipe.servings}
              recipeTitle={recipe.title}
              recipeId={recipe.id}
            />
            <div className="mt-6">
              <SaveButton recipeId={recipe.id} initialSaved={recipe.saved} />
            </div>
          </>
        )}
      </details>
    </article>
  );
}
