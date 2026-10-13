import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import CategoryGlyph from "@/components/CategoryGlyph";
import ChefAvatar from "@/components/ChefAvatar";
import { Link } from "@/i18n/navigation";
import { CATEGORIES, getCategory, type Category, type ChefProfile } from "@/lib/categories";
import Recommender from "./Recommender";

type Params = PageProps<"/[locale]/recipes/[category]">["params"];

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category: category.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/recipes/[category]">): Promise<Metadata> {
  const category = getCategory((await params).category);
  const tc = await getTranslations("Categories.items");
  return { title: category ? `${tc(`${category.slug}.label`)}｜Taste-Trace` : "Taste-Trace" };
}

// params 屬於網址資料，包在 Suspense 裡，從首頁點進來時外框可以立即顯示
export default async function RecipePage({ params }: PageProps<"/[locale]/recipes/[category]">) {
  const t = await getTranslations("CategoryPage");
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-8 sm:px-6 md:pt-12">
      <Link href="/explore" className="text-sm text-muted hover:text-foreground">
        ← {t("back")}
      </Link>

      <Suspense fallback={<CategorySkeleton />}>
        <CategoryContent params={params} />
      </Suspense>
    </main>
  );
}

async function CategoryContent({ params }: { params: Params }) {
  const category = getCategory((await params).category);
  if (!category) notFound();
  const tg = await getTranslations("Categories.groups");
  const tc = await getTranslations("Categories.items");
  // 介面上顯示的人設文字依語系翻譯；給 AI 的人設描述（style）維持原樣
  const persona = {
    ...category.persona,
    name: tc(`${category.slug}.personaName`),
    title: tc(`${category.slug}.personaTitle`),
    greeting: tc(`${category.slug}.greeting`),
  };

  return (
    <>
      {category.chef ? (
        <ChefHeader category={category} chef={category.chef} />
      ) : (
        <header className="mt-6 mb-10 flex items-center gap-5 border-b border-border pb-8">
          <CategoryGlyph slug={category.slug} size={96} className="shrink-0" />
          <div className="min-w-0">
            <p className="eyebrow">{tg(category.group)}</p>
            <h1 className="mt-2 font-serif text-4xl sm:text-5xl">{tc(`${category.slug}.label`)}</h1>
            <p className="mt-2 text-muted">{tc(`${category.slug}.description`)}</p>
          </div>
        </header>
      )}

      {/* 酒類內容依法標示警語 */}
      {category.slug === "cocktail" && (
        <p className="-mt-6 mb-8 rounded-xl border border-border bg-surface px-4 py-3 text-center text-sm font-medium">
          {(await getTranslations("CategoryPage"))("alcoholNotice")}
        </p>
      )}

      <Recommender
        categorySlug={category.slug}
        persona={persona}
        chef={category.chef}
      />
    </>
  );
}

async function ChefHeader({ category, chef }: { category: Category; chef: ChefProfile }) {
  const t = await getTranslations("CategoryPage");
  const tc = await getTranslations(`Categories.items.${category.slug}`);
  return (
    <header className="mt-6 mb-10 border-b border-border pb-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <ChefAvatar chef={chef} size={120} />
        <div className="min-w-0">
          <p className="eyebrow">
            {t("inspiredBy")}・{chef.flag} {tc("country")}・{chef.years}
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-tight sm:text-5xl">{category.label}</h1>
          {/* 英文介面的譯名和英文原名相同，就不重複顯示 */}
          {tc("chefName") !== chef.englishName && (
            <p className="mt-1 font-serif text-lg text-muted">{tc("chefName")}</p>
          )}
        </div>
      </div>
      <p className="mt-6 leading-relaxed">{tc("knownFor")}{t("period")}</p>
      <p className="mt-3 text-sm">
        <span className="text-muted">{t("signature")}　</span>
        {tc("signatureDishes")}
      </p>
      <p className="mt-6 text-xs leading-relaxed text-muted">{t("disclaimer", { name: chef.englishName })}</p>
    </header>
  );
}

function CategorySkeleton() {
  return (
    <div className="mt-4 animate-pulse space-y-6">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-border" />
        <div className="space-y-2">
          <div className="h-7 w-32 rounded bg-border" />
          <div className="h-4 w-48 rounded bg-border" />
        </div>
      </div>
      <div className="h-24 rounded-2xl bg-border" />
    </div>
  );
}
