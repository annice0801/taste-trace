import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import CategoryGlyph from "@/components/CategoryGlyph";
import ChefAvatar from "@/components/ChefAvatar";
import Reveal from "@/components/Reveal";
import { Link } from "@/i18n/navigation";
import { CATEGORIES } from "@/lib/categories";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Explore");
  return { title: `${t("metaTitle")}｜Taste-Trace` };
}

export default async function ExplorePage() {
  const t = await getTranslations("Explore");
  const tg = await getTranslations("Categories.groups");
  const tc = await getTranslations("Categories.items");
  const chefs = CATEGORIES.filter((category) => category.group === "chef");
  const others = (["country", "course"] as const).map((group) => ({
    group,
    label: tg(group),
    categories: CATEGORIES.filter((category) => category.group === group),
  }));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-12 sm:px-6 md:pt-16">
      <header className="max-w-2xl">
        <p className="eyebrow">Explore</p>
        <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">{t("title")}</h1>
        <p className="mt-4 leading-relaxed text-muted">{t("intro")}</p>
      </header>

      <section id="chefs" className="mt-16 scroll-mt-20">
        <div className="flex flex-col gap-2 border-b border-foreground pb-3 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 className="font-serif text-2xl">{tg("chef")}</h2>
          <span className="text-xs text-muted">{t("chefNote")}</span>
        </div>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {chefs.map(({ slug, chef }, index) => (
            <Reveal as="li" key={slug} delay={(index % 3) * 100}>
              <Link
                href={`/recipes/${slug}`}
                className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-6 transition hover:border-foreground"
              >
                <div className="flex items-center gap-4">
                  <ChefAvatar chef={chef!} size={72} />
                  <div className="min-w-0">
                    <p className="font-serif text-xl leading-tight">{chef!.englishName}</p>
                    <p className="mt-1 text-xs text-muted">
                      {[tc(`${slug}.chefName`), tc(`${slug}.country`), chef!.years]
                        .filter((part) => part !== chef!.englishName)
                        .join("・")}
                    </p>
                  </div>
                </div>
                <p className="mt-5 flex-1 text-sm leading-relaxed text-muted">{tc(`${slug}.knownFor`)}</p>
                <p className="mt-5 border-t border-border pt-4 text-xs">
                  <span className="text-muted">{t("signature")}　</span>
                  {tc(`${slug}.signatureDishes`)}
                </p>
              </Link>
            </Reveal>
          ))}
        </ul>
      </section>

      {others.map(({ group, label, categories }) => (
        <section key={group} className="mt-16">
          <div className="flex items-baseline justify-between border-b border-foreground pb-3">
            <h2 className="font-serif text-2xl">{label}</h2>
            <span className="text-xs text-muted">{t("count", { count: categories.length })}</span>
          </div>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, index) => (
              <Reveal as="li" key={category.slug} delay={(index % 3) * 80} className="border-b border-border">
                <Link
                  href={`/recipes/${category.slug}`}
                  className="group flex items-center gap-4 py-5 pr-2 transition sm:pr-6"
                >
                  <CategoryGlyph slug={category.slug} size={60} className="shrink-0 transition group-hover:-rotate-6" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-serif text-xl group-hover:text-accent">{tc(`${category.slug}.label`)}</span>
                    <span className="mt-0.5 block truncate text-sm text-muted">{tc(`${category.slug}.description`)}</span>
                  </span>
                  <span className="text-muted transition group-hover:translate-x-1 group-hover:text-accent" aria-hidden>
                    →
                  </span>
                </Link>
              </Reveal>
            ))}
          </ul>
        </section>
      ))}

    </main>
  );
}
