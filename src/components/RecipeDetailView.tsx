"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import RecipeCreations from "@/components/RecipeCreations";
import { scaleAmount } from "@/lib/quantity";
import type { MasterPrinciple, RecipeDetail } from "@/lib/recommendation";
import {
  addToBasket,
  basketId,
  openBasket,
  removeFromBasket,
  useBasket,
} from "@/lib/shopping-basket";

export const MIN_SERVINGS = 1;
export const MAX_SERVINGS = 20;

// 份量調整：左減右加，1 到 20 人
export function ServingStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (servings: number) => void;
}) {
  const t = useTranslations("Recipe");
  const step = (delta: number) =>
    onChange(Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, value + delta)));
  const button =
    "flex size-9 items-center justify-center rounded-full text-lg leading-none transition hover:bg-foreground hover:text-background disabled:pointer-events-none disabled:opacity-30";

  return (
    <div className="flex items-center gap-2 text-sm" role="group" aria-label={t("servingsLabel")}>
      <span className="text-xs text-muted">{t("servingsLabel")}</span>
      <div className="flex items-center rounded-full border border-border bg-surface p-0.5">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={value <= MIN_SERVINGS}
          aria-label={t("decrease")}
          className={button}
        >
          −
        </button>
        <output aria-live="polite" className="min-w-14 text-center tabular-nums">
          {t("servings", { count: value })}
        </output>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={value >= MAX_SERVINGS}
          aria-label={t("increase")}
          className={button}
        >
          +
        </button>
      </div>
    </div>
  );
}

// 名廚類別：大師精髓（核心科學原理與技法特徵）
function MasterPrincipleSection({ master }: { master: MasterPrinciple }) {
  const t = useTranslations("Recipe");
  return (
    <section className="rounded-sm bg-olive p-5 text-on-olive sm:p-7">
      <p className="font-serif text-lg italic text-on-olive/70">Master&apos;s Principle</p>
      <h4 className="font-serif text-2xl">{t("master")}</h4>
      {master.summary && (
        <p className="mt-4 text-sm leading-relaxed text-on-olive/85">{master.summary}</p>
      )}

      {master.principles.length > 0 && (
        <>
          <p className="mt-6 text-[11px] tracking-[0.18em] text-on-olive/55 uppercase">
            {t("principles")}
          </p>
          <dl className="mt-2 divide-y divide-on-olive/15">
            {master.principles.map((principle) => (
              <div key={principle.name} className="py-3">
                <dt className="font-serif text-lg">{principle.name}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-on-olive/80">{principle.science}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {master.techniques.length > 0 && (
        <>
          <p className="mt-5 text-[11px] tracking-[0.18em] text-on-olive/55 uppercase">{t("techniques")}</p>
          <ul className="mt-2 space-y-2 text-sm leading-relaxed">
            {master.techniques.map((technique) => (
              <li key={technique} className="flex gap-3">
                <span className="mt-2.5 h-px w-3 shrink-0 bg-on-olive/50" aria-hidden />
                {technique}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

// 食材（可依份量換算）、做法與小撇步；名廚類別多「大師精髓」與「現代家庭實踐版」
export default function RecipeDetailView({
  detail,
  personaName,
  baseServings,
  recipeTitle,
  recipeId,
}: {
  detail: RecipeDetail;
  personaName: string;
  baseServings: number | null;
  recipeTitle: string;
  recipeId: string;
}) {
  const t = useTranslations("Recipe");
  const [servings, setServings] = useState(baseServings ?? 2);
  const factor = baseServings ? servings / baseServings : 1;
  const isChef = Boolean(detail.master);
  const basket = useBasket();
  const basketIds = new Set(basket.map((item) => item.id));

  const toBasketItem = (ingredient: RecipeDetail["ingredients"][number]) => ({
    id: basketId(recipeTitle, ingredient.name),
    name: ingredient.name,
    amount: scaleAmount(ingredient.amount, factor),
    substitute: ingredient.localSubstitute,
    recipeTitle,
    imageUrl: null,
  });
  const allInBasket = detail.ingredients.every((ingredient) =>
    basketIds.has(basketId(recipeTitle, ingredient.name)),
  );

  const recipeBody = (
    <>
      {detail.adaptations.length > 0 && (
        <div className="mt-5">
          <p className="eyebrow">{t("adaptations")}</p>
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {detail.adaptations.map((adaptation) => (
              <li key={adaptation.original} className="grid gap-1 py-3 text-sm sm:grid-cols-[1fr_auto_1fr] sm:gap-4">
                <span className="text-muted line-through decoration-muted/40">{adaptation.original}</span>
                <span className="hidden text-muted sm:block" aria-hidden>→</span>
                <span>
                  {adaptation.home}
                  {adaptation.reason && (
                    <span className="mt-0.5 block text-xs text-muted">{adaptation.reason}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid gap-8 sm:grid-cols-[2fr_3fr]">
        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-foreground pb-2">
            <h4 className="font-serif text-lg">{t("ingredients")}</h4>
            {baseServings && <ServingStepper value={servings} onChange={setServings} />}
          </div>
          <ul className="divide-y divide-border text-sm">
            {detail.ingredients.map((ingredient) => {
              const id = basketId(recipeTitle, ingredient.name);
              const inBasket = basketIds.has(id);
              return (
                <li key={ingredient.name} className="py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0">{ingredient.name}</span>
                    <span className="ml-auto shrink-0 text-muted tabular-nums">
                      {scaleAmount(ingredient.amount, factor)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        inBasket ? removeFromBasket(id) : addToBasket([toBasketItem(ingredient)])
                      }
                      aria-pressed={inBasket}
                      aria-label={inBasket ? t("removeFromBasket", { name: ingredient.name }) : t("addToBasket", { name: ingredient.name })}
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-xs leading-none transition ${
                        inBasket
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted hover:border-foreground hover:text-foreground"
                      }`}
                    >
                      {inBasket ? "✓" : "+"}
                    </button>
                  </div>
                  {ingredient.localSubstitute && (
                    <p className="mt-0.5 pr-9 text-xs text-accent">
                      {t("substitute", { item: ingredient.localSubstitute })}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          {factor !== 1 && (
            <p className="mt-2 text-xs text-muted">
              {t("scaledNote", { count: baseServings ?? 0 })}
            </p>
          )}
          <button
            type="button"
            onClick={() =>
              allInBasket ? openBasket() : addToBasket(detail.ingredients.map(toBasketItem))
            }
            className="mt-3 text-xs font-medium underline underline-offset-4 hover:text-accent"
          >
            {allInBasket ? `${t("viewBasket")} →` : t("addAll")}
          </button>
        </section>

        <section className="min-w-0">
          <h4 className="mb-3 border-b border-foreground pb-2 font-serif text-lg">{t("steps")}</h4>
          <ol className="space-y-4 text-sm leading-relaxed">
            {detail.steps.map((step, index) => (
              <li key={index} className="grid grid-cols-[2rem_1fr] gap-1">
                <span className="section-number">{String(index + 1).padStart(2, "0")}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {detail.tip && (
        <p className="mt-6 border-l-2 border-accent bg-accent-soft/60 px-4 py-3 text-sm leading-relaxed">
          <span className="font-medium">{t("tip", { name: personaName })}　</span>
          {detail.tip}
        </p>
      )}
    </>
  );

  if (!isChef) {
    return (
      <div className="pb-2">
        {recipeBody}
        <RecipeCreations recipeId={recipeId} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-2">
      <MasterPrincipleSection master={detail.master!} />
      <section>
        <p className="font-serif text-lg italic text-muted">Home Kitchen Adaptation</p>
        <h4 className="font-serif text-2xl">{t("home")}</h4>
        {recipeBody}
      </section>
      <RecipeCreations recipeId={recipeId} />
    </div>
  );
}
