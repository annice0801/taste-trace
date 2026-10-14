import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import CutsExplorer from "./CutsExplorer";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Cuts");
  return { title: `${t("title")}｜Taste-Trace` };
}

export default async function CutsPage() {
  const t = await getTranslations("Cuts");
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-12 sm:px-6 md:pt-16">
      <header className="max-w-2xl">
        <p className="eyebrow">Meat cuts</p>
        <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">{t("title")}</h1>
        <p className="mt-4 leading-relaxed text-muted">{t("intro")}</p>
      </header>
      <CutsExplorer />
    </main>
  );
}
