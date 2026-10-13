import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import LoginPrompt from "@/app/[locale]/favorites/LoginPrompt";
import { getCurrentUser } from "@/lib/auth";
import { listCreations } from "@/lib/creations";
import { listFavorites } from "@/lib/recipes";
import WorksStudio from "./WorksStudio";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Works");
  return { title: `${t("title")}｜Taste-Trace` };
}

export default async function WorksPage() {
  const t = await getTranslations("Works");
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-12 sm:px-6 md:pt-16">
      <header className="max-w-2xl">
        <p className="eyebrow">My kitchen journal</p>
        <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">{t("title")}</h1>
        <p className="mt-4 leading-relaxed text-muted">
          {t("intro")}
        </p>
      </header>
      <Suspense fallback={<p className="mt-10 animate-pulse text-muted">{t("loading")}</p>}>
        <Works />
      </Suspense>
    </main>
  );
}

// 讀取登入狀態屬於請求資料，包在 Suspense 裡讓頁面外框可以先顯示
async function Works() {
  const user = await getCurrentUser();
  if (!user) {
    const tl = await getTranslations("Login");
    return <LoginPrompt message={tl("works")} />;
  }

  const [favorites, creations] = await Promise.all([
    listFavorites(user.id),
    listCreations(user.id),
  ]);
  return (
    <WorksStudio
      recipes={favorites.map((favorite) => ({
        id: favorite.recipeId,
        title: favorite.title,
        category: favorite.category,
        cooked: favorite.labels.includes("cooked"),
      }))}
      initialCreations={creations}
    />
  );
}
