"use client";

import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";
import { KEY_ERROR_CODES } from "@/lib/openai-key";
import { openAIKeyHeaders, requestOpenAIKeyPanel } from "@/lib/openai-key-store";
import {
  MAX_LOCATION_LENGTH,
  MONTHS,
  PRESET_LOCATIONS,
  type ProduceGuide,
  type ProduceItem,
  type ProduceType,
} from "@/lib/produce";
import { useIngredientPhotos, type IngredientPhoto } from "@/lib/use-ingredient-photos";

type LoadResult =
  | { status: "error"; error: string; needsKey: boolean }
  | { status: "done"; guide: ProduceGuide };
type LoadState = { status: "loading" } | LoadResult;

// 記住上次選的地點（只存在這個瀏覽器）；null 代表依時區自動判斷
const LOCATION_STORAGE_KEY = "taste-trace:produce-location";
const LOCATION_CHANGE_EVENT = "taste-trace:produce-location-change";

function subscribeLocation(onChange: () => void) {
  window.addEventListener(LOCATION_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(LOCATION_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// 本月：依使用者的瀏覽器時間，伺服器端渲染時先不決定
const noopSubscribe = () => () => {};
const currentMonth = () => new Date().getMonth() + 1;

// 手機上月份列可以橫向捲動，把本月捲到中間
function centerInScroller(element: HTMLElement | null) {
  const scroller = element?.parentElement;
  if (!element || !scroller) return;
  scroller.scrollLeft = element.offsetLeft - scroller.offsetLeft - (scroller.clientWidth - element.clientWidth) / 2;
}

// 瀏覽器不允許 localStorage（例如部分無痕模式）時，改記在記憶體裡
let memoryLocation: string | null = null;

function readSavedLocation(): string | null {
  try {
    return localStorage.getItem(LOCATION_STORAGE_KEY);
  } catch {
    return memoryLocation;
  }
}

function saveLocation(location: string | null) {
  memoryLocation = location;
  try {
    if (location) localStorage.setItem(LOCATION_STORAGE_KEY, location);
    else localStorage.removeItem(LOCATION_STORAGE_KEY);
  } catch {
    // 無法儲存就只在這次瀏覽有效
  }
  window.dispatchEvent(new Event(LOCATION_CHANGE_EVENT));
}

// 月份名稱依介面語系顯示：1月 / Jan / 1月
function useMonthLabel() {
  const format = useFormatter();
  return (month: number) => format.dateTime(new Date(2026, month - 1, 1), { month: "short" });
}

export default function ProduceExplorer() {
  const t = useTranslations("Produce");
  const monthLabel = useMonthLabel();
  // 常用地點顯示翻譯後的名稱；使用者自己輸入的地名原樣顯示
  const presetLabel = (value: string | null | undefined) => {
    const preset = PRESET_LOCATIONS.find((item) => item.value === value);
    return preset ? t(`presets.${preset.key}`) : value;
  };
  // undefined：伺服器端渲染時還不知道瀏覽器裡存的地點
  const location = useSyncExternalStore(subscribeLocation, readSavedLocation, () => undefined);
  const thisMonth = useSyncExternalStore(noopSubscribe, currentMonth, () => null);
  const [pickedMonth, setPickedMonth] = useState<number | null>(null);
  const month = pickedMonth ?? thisMonth;
  const [draft, setDraft] = useState("");
  const [type, setType] = useState<ProduceType | "all">("all");
  const [reloadKey, setReloadKey] = useState(0);

  // 結果記下是哪一次請求的；地點換了、結果還沒回來時就顯示載入中
  const requestKey = `${location ?? ""}#${reloadKey}`;
  const [result, setResult] = useState<{ key: string; value: LoadResult } | null>(null);
  const state: LoadState = result?.key === requestKey ? result.value : { status: "loading" };

  useEffect(() => {
    if (location === undefined) return;
    let cancelled = false;
    const finish = (value: LoadResult) => !cancelled && setResult({ key: requestKey, value });
    fetch("/api/produce", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...openAIKeyHeaders() },
      body: JSON.stringify(
        location ? { location } : { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      ),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const needsKey = Object.values(KEY_ERROR_CODES).includes(data.code);
          finish({ status: "error", error: data.error ?? t("loadError"), needsKey });
          return;
        }
        finish({ status: "done", guide: data as ProduceGuide });
      })
      .catch(() => finish({ status: "error", error: t("networkError"), needsKey: false }));
    return () => {
      cancelled = true;
    };
  }, [location, requestKey, t]);

  function choose(next: string | null) {
    saveLocation(next);
    setDraft("");
  }

  const guide = state.status === "done" ? state.guide : null;
  const items = guide?.items.filter((item) => type === "all" || item.type === type) ?? [];
  const inSeason = month ? items.filter((item) => item.peakMonths.includes(month)) : items;
  const offSeason = month ? items.filter((item) => !item.peakMonths.includes(month)) : [];

  return (
    <>
      {/* 地點 */}
      <section className="mt-10 rounded-2xl border border-border bg-surface p-5 sm:p-7" aria-label={t("chooseLocation")}>
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">{location ? t("manual") : t("auto")}</p>
            <p className="mt-2 font-serif text-3xl leading-tight">
              {/* 常用地點用翻譯後的名稱；其他地點顯示整理後的地區名稱 */}
              {(location && PRESET_LOCATIONS.some((item) => item.value === location)
                ? presetLabel(location)
                : guide?.regionLabel) ?? location ?? t("detecting")}
            </p>
            {guide?.climateNote && (
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{guide.climateNote}</p>
            )}
          </div>
          <form
            className="flex w-full gap-2 md:max-w-sm"
            onSubmit={(event) => {
              event.preventDefault();
              if (draft.trim()) choose(draft.trim());
            }}
          >
            <label htmlFor="produce-location" className="sr-only">
              {t("locationLabel")}
            </label>
            <input
              id="produce-location"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={MAX_LOCATION_LENGTH}
              placeholder={t("placeholder")}
              aria-describedby="produce-location-hint"
              className="field"
            />
            <button type="submit" disabled={!draft.trim()} className="btn-primary shrink-0 !px-4">
              {t("go")}
            </button>
          </form>
        </div>
        <p id="produce-location-hint" className="sr-only">{t("locationHint")}</p>

        <div className="-mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <button type="button" aria-pressed={!location} onClick={() => choose(null)} className="chip shrink-0">
            {t("myLocation")}
          </button>
          {PRESET_LOCATIONS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              aria-pressed={location === preset.value}
              onClick={() => choose(preset.value)}
              className="chip shrink-0"
            >
              {t(`presets.${preset.key}`)}
            </button>
          ))}
        </div>
      </section>

      {/* 月份與類別 */}
      <div className="mt-10 flex flex-col gap-4 border-b border-foreground pb-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="group" aria-label={t("monthGroup")}>
          {MONTHS.map((value) => {
            const label = monthLabel(value);
            const isCurrent = value === thisMonth;
            return (
              <button
                key={label}
                ref={isCurrent ? centerInScroller : undefined}
                type="button"
                aria-pressed={month === value}
                onClick={() => setPickedMonth(value)}
                className="chip shrink-0 !px-3 tabular-nums"
              >
                {label}
                {isCurrent && <span className="ml-1 text-[10px] text-accent">{t("thisMonth")}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2" role="group" aria-label={t("typeGroup")}>
          {(["all", "vegetable", "fruit"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={type === value}
              onClick={() => setType(value)}
              className="chip"
            >
              {t(`types.${value}`)}
            </button>
          ))}
        </div>
      </div>

      {state.status === "loading" && (
        <div className="mt-8">
          <p className="animate-pulse text-sm text-muted">
            {t("loading")}
          </p>
          <ul className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4" aria-hidden>
            {Array.from({ length: 8 }, (_, index) => (
              <li key={index} className="aspect-[4/5] animate-pulse rounded-xl bg-border/60" />
            ))}
          </ul>
        </div>
      )}

      {state.status === "error" && (
        <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-red-700 dark:text-red-300">
          <span>{state.error}</span>
          {state.needsKey && (
            <button type="button" onClick={requestOpenAIKeyPanel} className="btn-primary !py-1.5 !text-[13px]">
              {t("setKey")}
            </button>
          )}
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="font-medium underline underline-offset-4"
          >
            {t("retry")}
          </button>
        </div>
      )}

      {guide && month && (
        <ProduceGrid inSeason={inSeason} offSeason={offSeason} month={month} allItems={guide.items} />
      )}

      <p className="mt-12 text-xs leading-relaxed text-muted">
        {t("disclaimer")}
      </p>
    </>
  );
}

function ProduceGrid({
  inSeason,
  offSeason,
  month,
  allItems,
}: {
  inSeason: ProduceItem[];
  offSeason: ProduceItem[];
  month: number;
  allItems: ProduceItem[];
}) {
  const t = useTranslations("Produce");
  const monthLabel = useMonthLabel();
  // 照片依整份清單一次要，切換月份或類別時不重新查詢
  const photos = useIngredientPhotos(allItems.map((item) => item.name));

  return (
    <>
      <section className="mt-8">
        <h2 className="font-serif text-2xl">
          {t("inSeasonTitle", { month: monthLabel(month) })}
          <span className="ml-2 text-base text-muted">{t("kinds", { count: inSeason.length })}</span>
        </h2>
        {inSeason.length === 0 ? (
          <p className="py-8 text-sm text-muted">{t("noneThisMonth")}</p>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
            {inSeason.map((item) => (
              <ProduceCard key={item.name} item={item} month={month} photo={photos[item.name]} />
            ))}
          </ul>
        )}
      </section>

      {offSeason.length > 0 && (
        <section className="mt-16">
          <h2 className="border-t border-border pt-6 font-serif text-xl text-muted">
            {t("otherMonths")}<span className="ml-2 text-sm">{t("kinds", { count: offSeason.length })}</span>
          </h2>
          <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 opacity-80 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
            {offSeason.map((item) => (
              <ProduceCard key={item.name} item={item} month={month} photo={photos[item.name]} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function ProduceCard({
  item,
  month,
  photo,
}: {
  item: ProduceItem;
  month: number;
  photo: IngredientPhoto | null | undefined;
}) {
  const t = useTranslations("Produce");
  return (
    <li className="min-w-0">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-accent-soft">
        {photo ? (
          <Image src={photo.url} alt={item.name} fill sizes="(max-width: 768px) 50vw, 280px" className="object-cover" />
        ) : (
          <span
            className={`flex size-full items-center justify-center font-serif text-5xl text-accent/70 ${photo === undefined ? "animate-pulse" : ""}`}
            aria-hidden
          >
            {item.name.slice(0, 1)}
          </span>
        )}
        <span className="absolute top-2 left-2 rounded-full bg-[#fbf8f3]/90 px-2.5 py-0.5 text-[11px] text-[#1d1a16]">
          {t(`types.${item.type}`)}
        </span>
      </div>
      {photo && (
        <p className="mt-1 truncate text-[10px] text-muted/80">
          Photo by{" "}
          <a href={photo.authorUrl} target="_blank" rel="noreferrer" className="underline decoration-dotted">
            {photo.author}
          </a>{" "}
          on{" "}
          <a href={photo.sourceUrl} target="_blank" rel="noreferrer" className="underline decoration-dotted">
            Unsplash
          </a>
        </p>
      )}

      <h3 className="mt-2 font-serif text-xl leading-snug">{item.name}</h3>
      <p className="text-[11px] tracking-wide text-muted capitalize">{item.englishName}</p>
      <SeasonBar months={item.peakMonths} current={month} />
      <p className="mt-3 text-sm leading-relaxed">{item.description}</p>

      <dl className="mt-3 space-y-1.5 text-xs leading-relaxed">
        {item.mainAreas && (
          <div className="flex gap-2">
            <dt className="shrink-0 text-muted">{t("areas")}</dt>
            <dd>{item.mainAreas}</dd>
          </div>
        )}
        {item.howToChoose && (
          <div className="flex gap-2">
            <dt className="shrink-0 text-muted">{t("choose")}</dt>
            <dd>{item.howToChoose}</dd>
          </div>
        )}
        {item.howToEat && (
          <div className="flex gap-2">
            <dt className="shrink-0 text-muted">{t("eat")}</dt>
            <dd>{item.howToEat}</dd>
          </div>
        )}
      </dl>
    </li>
  );
}

// 12 格產季條：深色是盛產月份，外框標出目前選的月份
function SeasonBar({ months, current }: { months: number[]; current: number }) {
  const t = useTranslations("Produce");
  const monthLabel = useMonthLabel();
  return (
    <div className="mt-2">
      <ol className="grid grid-cols-12 gap-0.5" aria-label={t("peakMonths", { months: months.map(monthLabel).join(", ") })}>
        {MONTHS.map((value) => {
          const label = monthLabel(value);
          const peak = months.includes(value);
          return (
            <li
              key={label}
              title={label}
              className={`h-2 rounded-[2px] ${peak ? "bg-olive" : "bg-border"} ${
                value === current ? "outline outline-1 outline-offset-1 outline-foreground" : ""
              }`}
            />
          );
        })}
      </ol>
      <div className="mt-1 flex justify-between text-[9px] text-muted tabular-nums" aria-hidden>
        <span>1</span>
        <span>6</span>
        <span>12</span>
      </div>
    </div>
  );
}
