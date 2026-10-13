import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ProduceExplorer from "./ProduceExplorer";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Produce");
  return { title: `${t("title")}｜Taste-Trace` };
}

export default async function ProducePage() {
  const t = await getTranslations("Produce");
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-12 sm:px-6 md:pt-16">
      <header className="max-w-2xl">
        <p className="eyebrow">In season</p>
        <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">{t("title")}</h1>
        <p className="mt-4 leading-relaxed text-muted">
          {t("intro")}
        </p>
      </header>
      <ProduceExplorer />
    </main>
  );
}
