import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import ChefAvatar, { PhotoCredit } from "@/components/ChefAvatar";
import Parallax from "@/components/Parallax";
import Reveal from "@/components/Reveal";
import { Link } from "@/i18n/navigation";
import { CATEGORIES, type Photo } from "@/lib/categories";
import { LANDING_PHOTOS } from "@/lib/landing-photos";
import { ANIMALS } from "@/lib/meat-cuts";

const CHEFS = CATEGORIES.filter((category) => category.chef);

// 文字在 messages/*.json 的 Landing 底下
const STAT_KEYS = [
  { key: "categories", value: String(CATEGORIES.length) },
  { key: "chefs", value: String(CHEFS.length) },
  { key: "servings", value: "1–20" },
  { key: "local", value: null },
] as const;
const STEP_KEYS = ["mood", "recommend", "save"] as const;
const FEATURE_KEYS = ["scale", "basket", "substitute", "notes", "works", "key"] as const;

function FramedPhoto({
  photo,
  alt,
  className,
  sizes,
  priority = false,
  depth = 12,
  zoom = 0,
  creditInside = false,
}: {
  photo: Photo;
  alt: string;
  className: string;
  sizes: string;
  priority?: boolean;
  depth?: number; // 照片在框內的視差幅度（最大 15）
  zoom?: number; // 捲動時從放大慢慢回到原尺寸的幅度，例：0.12
  creditInside?: boolean; // 授權標示放在照片右上角（照片下方有其他元素蓋住時用）
}) {
  return (
    <figure>
      <div className={`relative overflow-hidden rounded-sm bg-border ${className}`}>
        {/* 照片比框高 44%（上下各多 22%），捲動時在框內位移；
            位移上限是照片高度的 15%（≈ 框高的 21.6%），不會露出邊緣 */}
        <Parallax shift={Math.min(depth, 15)} zoom={zoom} className="absolute inset-x-0 -top-[22%] -bottom-[22%]">
          <Image
            src={photo.src}
            alt={alt}
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover"
            style={{ objectPosition: photo.position }}
          />
        </Parallax>
        {creditInside && (
          <figcaption className="absolute top-2 right-2 rounded-full bg-black/45 px-2.5 py-0.5">
            <PhotoCredit photo={photo} className="!text-white/85 [&_a:hover]:!text-white" />
          </figcaption>
        )}
      </div>
      {!creditInside && (
        <figcaption className="mt-2 text-right">
          <PhotoCredit photo={photo} />
        </figcaption>
      )}
    </figure>
  );
}

// 首頁的產季示意（台灣常見蔬果）
// 首頁示範的三個熱門部位，內容直接取自部位資料
const CUT_SAMPLES = [
  ["pork", "jowl"],
  ["beef", "topblade"],
  ["chicken", "thigh"],
].map(([animalId, cutId]) => {
  const cut = ANIMALS.find((animal) => animal.id === animalId)!.cuts.find((c) => c.id === cutId)!;
  return { animalId: animalId!, cut };
});

const SEASON_SAMPLES = [
  { key: "cabbage", months: [1, 2, 3, 11, 12] },
  { key: "bamboo", months: [4, 5, 6, 7, 8, 9] },
  { key: "mango", months: [5, 6, 7, 8] },
  { key: "pomelo", months: [8, 9] },
  { key: "persimmon", months: [9, 10, 11] },
] as const;

const br = () => <br />;

export default async function LandingPage() {
  const photos = LANDING_PHOTOS;
  const t = await getTranslations("Landing");
  const tc = await getTranslations("Categories.items");
  const tcuts = await getTranslations("Cuts");
  const showChinese = (await getLocale()) === "zh-TW";

  return (
    <main>
      {/* 主視覺 */}
      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-12 pb-20 sm:px-6 md:grid-cols-[1.1fr_1fr] md:gap-10 md:pt-16 md:pb-24 lg:gap-16 lg:pt-20 lg:pb-28">
        <div>
          <p className="eyebrow rise">Mood &amp; weather based recipes</p>
          <h1 className="mt-5 font-serif text-[2.6rem] leading-[1.12] tracking-tight sm:text-6xl md:text-5xl lg:text-6xl xl:text-7xl">
            {/* 標題逐行升起 */}
            {(t.raw("hero.title") as string).split("<br></br>").map((line, index) => (
              <span key={line} className="rise block" style={{ "--rise-delay": `${150 + index * 140}ms` } as React.CSSProperties}>
                {line}
              </span>
            ))}
          </h1>
          <p className="rise mt-6 max-w-md text-base leading-relaxed text-muted sm:text-lg" style={{ "--rise-delay": "480ms" } as React.CSSProperties}>
            {t("hero.body")}
          </p>
          <div className="rise mt-9 flex flex-wrap gap-3" style={{ "--rise-delay": "600ms" } as React.CSSProperties}>
            <Link href="/explore" className="btn-primary">
              {t("cta.start")} <span aria-hidden>→</span>
            </Link>
            <a href="#how" className="btn-secondary">
              {t("hero.how")}
            </a>
          </div>
          <p className="rise mt-6 text-xs text-muted" style={{ "--rise-delay": "720ms" } as React.CSSProperties}>{t("hero.note")}</p>
        </div>

        <div className="rise relative" style={{ "--rise-delay": "250ms" } as React.CSSProperties}>
          <FramedPhoto
            photo={photos.bread}
            alt={t("alt.bread")}
            className="aspect-[4/5] sm:aspect-[16/11] md:aspect-[4/5] lg:aspect-[5/6]"
            sizes="(max-width: 768px) 100vw, 560px"
            priority
            depth={15}
            zoom={0.14}
            creditInside
          />
          {/* 推薦結果示意：比照片捲得快，做出前後景深 */}
          <Parallax
            shift={-70}
            className="absolute bottom-12 left-3 w-[min(17rem,calc(100%-1.5rem))] sm:-bottom-6 md:-left-6 lg:-left-10"
          >
            <div className="rounded-xl border border-border bg-surface p-4 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.35)]">
            <p className="eyebrow !text-[10px]">{t("sample.eyebrow")}</p>
            <p className="mt-2 font-serif text-lg leading-snug">{t("sample.title")}</p>
            <ul className="mt-3 divide-y divide-border text-sm">
              {(["dish1", "dish2", "dish3"] as const).map((key) => [t(`sample.${key}`), t(`sample.${key}Time`)]).map(([dish, time]) => (
                <li key={dish} className="flex justify-between py-1.5">
                  <span>{dish}</span>
                  <span className="text-muted">{time}</span>
                </li>
              ))}
            </ul>
            </div>
          </Parallax>
        </div>
      </section>

      {/* 數字 */}
      <section className="border-y border-border">
        <dl className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-px bg-border md:grid-cols-4">
          {STAT_KEYS.map((stat, index) => (
            // 底色留在外層，內容浮現前不會露出格線的灰色
            <div key={stat.key} className="bg-background px-4 py-8 sm:px-6 md:py-10">
              <dt className="sr-only">{t(`stats.${stat.key}.label`)}</dt>
              <dd>
                <Reveal as="span" delay={index * 90} className="block">
                <span className="font-serif text-4xl sm:text-5xl">{stat.value ?? t(`stats.${stat.key}.value`)}</span>
                <span className="mt-2 block text-sm font-medium">{t(`stats.${stat.key}.label`)}</span>
                <span className="mt-1 block text-xs text-muted">{t(`stats.${stat.key}.note`)}</span>
                </Reveal>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 大字橫向滑動帶：兩列往相反方向，跟著捲動移動 */}
      <section className="overflow-hidden py-14 sm:py-20" aria-hidden>
        <Parallax shift={0} x={-14} className="whitespace-nowrap">
          <p className="font-serif text-[clamp(3rem,9vw,8rem)] leading-none tracking-tight">
            {Array.from({ length: 3 }, () => t("marquee.row1")).join("　")}
          </p>
        </Parallax>
        <Parallax shift={0} x={14} className="-ml-[40%] mt-3 whitespace-nowrap sm:mt-5">
          <p className="outline-text font-serif text-[clamp(3rem,9vw,8rem)] leading-none tracking-tight italic">
            {Array.from({ length: 3 }, () => t("marquee.row2")).join("　")}
          </p>
        </Parallax>
      </section>

      {/* 如何運作 */}
      <section id="how" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
          <div>
            <Reveal>
              <p className="eyebrow">How it works</p>
              <h2 className="mt-4 font-serif text-3xl leading-tight sm:text-5xl lg:text-[2.6rem] xl:text-5xl">
                {t.rich("how.title", { br })}
              </h2>
            </Reveal>
            <ol className="mt-12 space-y-10">
              {STEP_KEYS.map((key, index) => (
                <Reveal as="li" key={key} delay={index * 120} className="grid grid-cols-[3rem_1fr] gap-2 border-t border-border pt-6">
                  <span className="section-number">0{index + 1}</span>
                  <div>
                    <h3 className="font-serif text-xl">{t(`how.steps.${key}.title`)}</h3>
                    <p className="mt-2 leading-relaxed text-muted">{t(`how.steps.${key}.body`)}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
          <Parallax shift={-20} from={1024} className="lg:pt-20">
            <FramedPhoto
              photo={photos.asparagusSoup}
              alt={t("alt.asparagusSoup")}
              className="aspect-[4/3] md:aspect-[16/9] lg:aspect-[4/3]"
              sizes="(max-width: 1024px) 100vw, 600px"
              depth={15}
              zoom={0.1}
            />
          </Parallax>
        </div>
      </section>

      {/* 名廚 */}
      <section className="bg-olive text-on-olive">
        <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <Reveal>
                <p className="eyebrow !text-on-olive/60">Inspired by the masters</p>
                <h2 className="mt-4 font-serif text-3xl leading-tight sm:text-5xl">
                  {t.rich("chefs.title", { br })}
                </h2>
                <p className="mt-6 max-w-md leading-relaxed text-on-olive/75">
                  {t("chefs.body")}
                </p>
              </Reveal>
            </div>
            <div className="grid gap-px overflow-hidden rounded-sm bg-on-olive/15 sm:grid-cols-2">
              <div className="bg-olive p-6">
                <p className="font-serif text-lg italic">Master&apos;s Principle</p>
                <h3 className="mt-1 font-serif text-xl">{t("chefs.masterTitle")}</h3>
                <p className="mt-3 text-sm leading-relaxed text-on-olive/75">{t("chefs.masterBody")}</p>
              </div>
              <div className="bg-olive p-6">
                <p className="font-serif text-lg italic">Home Kitchen Adaptation</p>
                <h3 className="mt-1 font-serif text-xl">{t("chefs.homeTitle")}</h3>
                <p className="mt-3 text-sm leading-relaxed text-on-olive/75">{t("chefs.homeBody")}</p>
              </div>
            </div>
          </div>

          <ul className="mt-16 flex flex-wrap justify-center gap-x-4 gap-y-10 sm:gap-x-8">
            {CHEFS.map(({ slug, chef }, index) => (
              <Reveal as="li" key={slug} delay={(index % 4) * 90} className="w-[calc(50%-0.5rem)] sm:w-40">
                {/* 相鄰頭像捲動速度不同，做出前後層次 */}
                <Parallax shift={index % 2 ? -14 : 10} from={640}>
                <Link href={`/recipes/${slug}`} className="group block text-center">
                  <ChefAvatar chef={chef!} size={112} />
                  <span className="mt-4 block font-serif text-lg leading-tight group-hover:underline">
                    {chef!.englishName}
                  </span>
                  <span className="mt-1 block text-xs text-on-olive/60">
                    {[tc(`${slug}.chefName`), chef!.years].filter((part) => part !== chef!.englishName).join("・")}
                  </span>
                </Link>
                </Parallax>
              </Reveal>
            ))}
          </ul>
          <p className="mt-12 text-center text-xs text-on-olive/50">
            {t("chefs.disclaimer")}
          </p>
        </div>
      </section>

      {/* 功能 */}
      <section className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:gap-20">
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <p className="eyebrow">Features</p>
            <h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">
              {t.rich("features.title", { br })}
            </h2>
          </Reveal>
          <ul className="grid gap-x-10 sm:grid-cols-2">
            {FEATURE_KEYS.map((key, index) => (
              <Reveal as="li" key={key} delay={(index % 2) * 120} className="border-t border-border py-6">
                <p className="section-number">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-2 font-serif text-xl">{t(`features.items.${key}.title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t(`features.items.${key}.body`)}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* 全寬視差照片 */}
      <section className="relative mt-4 h-[70vh] max-h-[44rem] min-h-[26rem] overflow-hidden bg-olive md:h-[80vh]">
        {/* 上下各多 30%，位移上限 18%（≈ 區塊高的 28.8%），不會露出邊緣 */}
        <Parallax shift={18} className="absolute inset-x-0 -top-[30%] -bottom-[30%]">
          <Image
            src={photos.beetroots.src}
            alt={t("alt.beetroots")}
            fill
            sizes="100vw"
            className="object-cover"
          />
        </Parallax>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
        <div className="relative mx-auto flex h-full w-full max-w-6xl flex-col justify-end px-4 pb-10 sm:px-6 md:pb-16">
          <Parallax shift={-60}>
            <p className="eyebrow !text-white/70">From market to table</p>
            <p className="mt-4 max-w-2xl font-serif text-3xl leading-tight text-white sm:text-5xl">
              {t.rich("band.title", { br })}
            </p>
          </Parallax>
          <PhotoCredit photo={photos.beetroots} className="mt-8 self-end !text-white/60 [&_a:hover]:!text-white" />
        </div>
      </section>

      {/* 當季蔬果 */}
      <section className="mx-auto mt-24 w-full max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1fr_1.1fr] md:items-center md:gap-16">
          <Reveal>
            <p className="eyebrow">In season</p>
            <h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">
              {t.rich("produce.title", { br })}
            </h2>
            <p className="mt-4 max-w-md leading-relaxed text-muted">
              {t("produce.body")}
            </p>
            <Link href="/produce" className="btn-primary mt-8">
              {t("produce.cta")} <span aria-hidden>→</span>
            </Link>
          </Reveal>
          <Reveal delay={150} className="rounded-2xl border border-border bg-surface p-5 shadow-[0_30px_60px_-40px_rgba(60,40,20,0.35)] sm:p-7">
            <p className="flex items-baseline justify-between text-xs text-muted">
              <span>{t("produce.sampleLabel")}</span>
              <span className="tabular-nums">{t("produce.monthRange")}</span>
            </p>
            <ul className="mt-4 divide-y divide-border">
              {SEASON_SAMPLES.map((sample, index) => (
                <Reveal as="li" key={sample.key} delay={250 + index * 90} className="grid grid-cols-[5.5rem_1fr] items-center gap-4 py-3.5">
                  <span className="font-serif text-lg leading-tight">{t(`produce.samples.${sample.key}`)}</span>
                  <span className="grid grid-cols-12 gap-0.5" aria-label={t("produce.peakLabel", { months: sample.months.join(", ") })}>
                    {Array.from({ length: 12 }, (_, index) => (
                      <span
                        key={index}
                        className={`h-2.5 rounded-[2px] ${(sample.months as readonly number[]).includes(index + 1) ? "bg-olive" : "bg-border"}`}
                      />
                    ))}
                  </span>
                </Reveal>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* 肉品部位 */}
      <section className="mx-auto mt-24 w-full max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.1fr_1fr] md:items-center md:gap-16">
          <Reveal className="md:order-2">
            <p className="eyebrow">Meat cuts</p>
            <h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">
              {t.rich("cuts.title", { br })}
            </h2>
            <p className="mt-4 max-w-md leading-relaxed text-muted">
              {t("cuts.body")}
            </p>
            <Link href="/cuts" className="btn-primary mt-8">
              {t("cuts.cta")} <span aria-hidden>→</span>
            </Link>
          </Reveal>
          <Reveal delay={150} className="rounded-2xl border border-border bg-surface p-5 shadow-[0_30px_60px_-40px_rgba(60,40,20,0.35)] sm:p-7 md:order-1">
            <p className="text-xs text-muted">{t("cuts.sampleLabel")}</p>
            <ul className="mt-4 divide-y divide-border">
              {CUT_SAMPLES.map(({ animalId, cut }, index) => (
                <Reveal as="li" key={cut.id} delay={250 + index * 90} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4">
                  <span className="min-w-0">
                    <span className="block text-xs text-muted">{tcuts(`animals.${animalId}`)}</span>
                    <span className="font-serif text-lg leading-tight">{showChinese ? cut.name : cut.nameEn.split(" (")[0]}</span>
                  </span>
                  <span className="flex flex-col items-end gap-1.5 text-xs text-muted">
                    {(["fat", "tenderness"] as const).map((key) => (
                      <span key={key} className="flex items-center gap-2" aria-label={`${tcuts(key)} ${cut[key]}/5`}>
                        {tcuts(key)}
                        <span className="flex gap-0.5" aria-hidden>
                          {Array.from({ length: 5 }, (_, i) => (
                            <span key={i} className={`size-2 rounded-full ${i < cut[key] ? "bg-accent" : "bg-border"}`} />
                          ))}
                        </span>
                      </span>
                    ))}
                  </span>
                  <span className="flex w-full flex-wrap gap-1.5">
                    {cut.methods.slice(0, 3).map((m) => (
                      <span key={m.method} className="rounded-full border border-border px-2.5 py-0.5 text-xs">
                        {tcuts(`methods.${m.method}`)}
                      </span>
                    ))}
                  </span>
                </Reveal>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* 照片牆 */}
      <section className="mx-auto mt-24 w-full max-w-6xl px-4 sm:px-6">
        <div className="grid gap-4 md:grid-cols-[1.4fr_1fr] md:gap-6">
          <FramedPhoto
            photo={photos.ramen}
            alt={t("alt.ramen")}
            className="aspect-[4/3] md:aspect-auto md:h-[30rem] lg:h-[34rem]"
            sizes="(max-width: 768px) 100vw, 640px"
            depth={15}
          />
          <Parallax shift={-18} from={768} className="grid grid-cols-2 gap-4 md:mt-24 md:grid-cols-1 md:gap-6">
            <FramedPhoto
              photo={photos.chocolateCake}
              alt={t("alt.chocolateCake")}
              className="aspect-square md:aspect-auto md:h-[13rem] lg:h-[15rem]"
              sizes="(max-width: 768px) 50vw, 440px"
              depth={10}
            />
            <FramedPhoto
              photo={photos.appleCake}
              alt={t("alt.appleCake")}
              className="aspect-square md:aspect-auto md:h-[13rem] lg:h-[15rem]"
              sizes="(max-width: 768px) 50vw, 440px"
              depth={15}
            />
          </Parallax>
        </div>
      </section>

      {/* 行動呼籲 */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-24 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-8 border-t border-foreground pt-12 md:flex-row md:items-end">
          <Reveal>
            <h2 className="font-serif text-4xl leading-tight sm:text-6xl">
              {t.rich("cta.title", { br, em: (chunks) => <span className="italic text-accent">{chunks}</span> })}
            </h2>
          </Reveal>
          <div className="flex flex-wrap gap-3">
            <Link href="/explore" className="btn-primary">
              {t("cta.start")} <span aria-hidden>→</span>
            </Link>
            <Link href="/explore#chefs" className="btn-secondary">
              {t("cta.chefs")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
