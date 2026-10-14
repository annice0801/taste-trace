"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { ANIMALS, POULTRY_LAYER_ORDER, type Animal, type CookingMethod, type MeatCut } from "@/lib/meat-cuts";

// 部位圖的配色：淺陶土色的部位、選取時深陶土色，與網站主色一致
const FILL = "#eeb79a";
const FILL_HOVER = "#e59c7a";
const FILL_ACTIVE = "#9c3d1c";
const FILL_DIM = "#f3dccd";

export default function CutsExplorer() {
  const t = useTranslations("Cuts");
  const locale = useLocale();
  const [animalId, setAnimalId] = useState<Animal["id"]>("pork");
  const animal = ANIMALS.find((a) => a.id === animalId)!;
  const [selectedId, setSelectedId] = useState<string>(animal.cuts[0]!.id);
  const [method, setMethod] = useState<CookingMethod | null>(null);
  const allCuts = [...animal.cuts, ...animal.others];
  const selected = allCuts.find((cut) => cut.id === selectedId) ?? animal.cuts[0]!;
  // 這種肉出現過的煮法，給「依煮法找部位」篩選
  const methods = [...new Set(allCuts.flatMap((cut) => cut.methods.map((m) => m.method)))];
  const matches = (cut: MeatCut) => !method || cut.methods.some((m) => m.method === method);
  const detailRef = useRef<HTMLDivElement>(null);

  // 選了部位；手機上說明在圖的下方，自動捲過去
  function selectCut(id: string) {
    setSelectedId(id);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  function chooseAnimal(id: Animal["id"]) {
    const next = ANIMALS.find((a) => a.id === id)!;
    setAnimalId(id);
    setSelectedId(next.cuts[0]!.id);
    setMethod(null);
  }

  return (
    <div className="mt-10">
      {/* 選肉的種類 */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label={t("chooseAnimal")}>
        {ANIMALS.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={a.id === animalId}
            onClick={() => chooseAnimal(a.id)}
            className={`shrink-0 rounded-full border px-5 py-2 text-sm transition ${
              a.id === animalId ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"
            }`}
          >
            {t(`animals.${a.id}`)}
          </button>
        ))}
      </div>

      {/* 依煮法找部位 */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs text-muted">{t("filterByMethod")}</span>
        <button type="button" aria-pressed={!method} onClick={() => setMethod(null)} className="chip !px-3 !py-1 !text-xs">
          {t("allMethods")}
        </button>
        {methods.map((m) => (
          <button key={m} type="button" aria-pressed={method === m} onClick={() => setMethod(method === m ? null : m)} className="chip !px-3 !py-1 !text-xs">
            {t(`methods.${m}`)}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-start">
        <div className="min-w-0">
          <CutDiagram
            animal={animal}
            selectedId={selected.id}
            onSelect={selectCut}
            matches={matches}
            title={t("diagramTitle", { animal: t(`animals.${animal.id}`) })}
            showChinese={locale !== "en"}
          />
          <p className="mt-3 text-xs leading-relaxed text-muted">{animal.intro}</p>

          {/* 手機上點圖比較難，下面再列一次部位 */}
          <ul className="mt-5 flex flex-wrap gap-2" aria-label={t("cutList")}>
            {animal.cuts.map((cut) => (
              <li key={cut.id}>
                <button
                  type="button"
                  aria-pressed={cut.id === selected.id}
                  onClick={() => selectCut(cut.id)}
                  className={`chip !px-3 !py-1 !text-xs ${matches(cut) ? "" : "opacity-40"}`}
                >
                  {cut.name}
                </button>
              </li>
            ))}
          </ul>

          {animal.others.length > 0 && (
            <div className="mt-6">
              <p className="eyebrow">{t("others")}</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {animal.others.map((cut) => (
                  <li key={cut.id}>
                    <button
                      type="button"
                      aria-pressed={cut.id === selected.id}
                      onClick={() => selectCut(cut.id)}
                      className={`chip !px-3 !py-1 !text-xs ${matches(cut) ? "" : "opacity-40"}`}
                    >
                      {cut.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div ref={detailRef} className="scroll-mt-20">
          <CutDetail key={`${animal.id}-${selected.id}`} cut={selected} highlight={method} />
        </div>
      </div>

      <p className="mt-12 border-t border-border pt-4 text-xs leading-relaxed text-muted">{t("disclaimer")}</p>
    </div>
  );
}

function CutDiagram({
  animal,
  selectedId,
  onSelect,
  matches,
  title,
  showChinese,
}: {
  animal: Animal;
  selectedId: string;
  onSelect: (id: string) => void;
  matches: (cut: MeatCut) => boolean;
  title: string;
  showChinese: boolean;
}) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const clipId = `cut-clip-${animal.id}`;
  // 禽類的背部是底層，要先畫；其他動物照資料順序
  const isPoultry = ["chicken", "duck", "goose"].includes(animal.id);
  const layered = isPoultry
    ? [...animal.cuts].sort((a, b) => POULTRY_LAYER_ORDER.indexOf(a.id) - POULTRY_LAYER_ORDER.indexOf(b.id))
    : animal.cuts;

  return (
    <figure className="overflow-hidden rounded-2xl border border-border bg-[#f7efe3] p-3 sm:p-5 dark:bg-surface">
      <figcaption className="mb-1 text-center font-serif text-xl text-accent sm:text-2xl">{title}</figcaption>
      <svg viewBox="0 0 640 400" className="w-full select-none" role="group" aria-label={title}>
        <defs>
          <clipPath id={clipId}>
            <path d={animal.outline} />
          </clipPath>
        </defs>

        {/* 部位：被身體輪廓裁切，部位之間用白色虛線分隔 */}
        <g clipPath={`url(#${clipId})`}>
          {layered.map((cut) => {
            if (!cut.region) return null;
            const active = cut.id === selectedId;
            const fill = active ? FILL_ACTIVE : !matches(cut) ? FILL_DIM : cut.id === hoverId ? FILL_HOVER : FILL;
            const props = {
              fill,
              stroke: "#fffaf3",
              strokeWidth: 2,
              strokeDasharray: "5 4",
              className: "cursor-pointer outline-none transition-[fill] duration-200",
              role: "button",
              tabIndex: 0,
              "aria-label": `${cut.name} ${cut.nameEn}`,
              "aria-pressed": active,
              onClick: () => onSelect(cut.id),
              onKeyDown: (event: React.KeyboardEvent) => (event.key === "Enter" || event.key === " ") && onSelect(cut.id),
              onPointerEnter: () => setHoverId(cut.id),
              onPointerLeave: () => setHoverId(null),
            };
            return cut.region.startsWith("M") ? <path key={cut.id} d={cut.region} {...props} /> : <polygon key={cut.id} points={cut.region} {...props} />;
          })}
        </g>

        {/* 輪廓與五官 */}
        <path d={animal.outline} fill="none" stroke="#7a3a22" strokeWidth={2.5} strokeLinejoin="round" pointerEvents="none" />
        {animal.details.map((d) => (
          <path key={d} d={d} fill="none" stroke="#7a3a22" strokeWidth={2.5} strokeLinecap="round" pointerEvents="none" />
        ))}

        {/* 標籤：英文小字在上、中文在下 */}
        {animal.cuts.map((cut) => {
          if (!cut.label) return null;
          const [x, y] = cut.label;
          const active = cut.id === selectedId;
          // 文字加一圈描邊（paint-order），放在淺色或深色部位上都看得清楚
          const ink = active
            ? { fill: "#fffaf3", stroke: "#6f2a12", strokeWidth: 3.5 }
            : { fill: "#5b2512", stroke: "#fbefe6", strokeWidth: 3.5 };
          return (
            <g key={cut.id} pointerEvents="none" opacity={matches(cut) ? 1 : 0.45} style={{ paintOrder: "stroke" }} strokeLinejoin="round">
              <text x={x} y={showChinese ? y - 17 : y} textAnchor="middle" fontSize={10} fontStyle="italic" {...ink} strokeWidth={3}>
                {cut.nameEn.split(" (")[0]}
              </text>
              {showChinese && (
                <text x={x} y={y} textAnchor="middle" fontSize={15} fontWeight={700} className="font-serif" {...ink}>
                  {cut.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-10 text-muted">{label}</span>
      <span className="flex gap-1" aria-label={`${label} ${value}/5`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={`size-2.5 rounded-full ${n <= value ? "bg-accent" : "bg-border"}`} />
        ))}
      </span>
    </div>
  );
}

function CutDetail({ cut, highlight }: { cut: MeatCut; highlight: CookingMethod | null }) {
  const t = useTranslations("Cuts");
  const locale = useLocale();
  // 選了煮法時，把那個煮法排到最前面
  const methods = highlight ? [...cut.methods].sort((a, b) => Number(b.method === highlight) - Number(a.method === highlight)) : cut.methods;

  return (
    <article className="rounded-2xl border border-border bg-surface p-5 sm:p-6 lg:sticky lg:top-24" aria-live="polite">
      <p className="text-xs tracking-wide text-muted italic">{cut.nameEn}</p>
      <h2 className="mt-1 font-serif text-3xl">{cut.name}</h2>
      {cut.aliases.length > 0 && (
        <p className="mt-1 text-sm text-muted">
          {t("aliases")}：{cut.aliases.join("、")}
        </p>
      )}
      {locale !== "zh-TW" && <p className="mt-2 rounded-lg bg-background px-3 py-1.5 text-[11px] text-muted">{t("contentNotice")}</p>}

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1.5">
        <Meter label={t("fat")} value={cut.fat} />
        <Meter label={t("tenderness")} value={cut.tenderness} />
      </div>

      <p className="mt-4 leading-relaxed">{cut.description}</p>
      <p className="mt-2 text-sm text-muted">{t("texture")}：{cut.texture}</p>

      <h3 className="mt-6 border-b border-foreground pb-2 font-serif text-lg">{t("howToCook")}</h3>
      <ul className="divide-y divide-border">
        {methods.map((m) => (
          <li key={m.method + m.thickness} className={`py-3 ${highlight === m.method ? "rounded-lg bg-accent-soft/60 px-3" : ""}`}>
            <p className="flex flex-wrap items-baseline gap-2">
              <span className="rounded-full bg-foreground px-2.5 py-0.5 text-xs text-background">{t(`methods.${m.method}`)}</span>
              <span className="text-sm font-medium">{m.thickness}</span>
            </p>
            <p className="mt-1 text-sm text-muted">⏱ {m.time}</p>
            {m.tip && <p className="mt-1 text-xs leading-relaxed text-accent">{m.tip}</p>}
          </li>
        ))}
      </ul>

      <h3 className="mt-6 font-serif text-lg">{t("dishes")}</h3>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {cut.dishes.map((dish) => (
          <li key={dish} className="rounded-full bg-background px-3 py-1 text-xs">{dish}</li>
        ))}
      </ul>

      <p className="mt-6 border-l-2 border-accent pl-3 text-sm leading-relaxed">
        <span className="font-medium">{t("buyTip")}　</span>
        {cut.buyTip}
      </p>
    </article>
  );
}
