import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { listFavorites } from "@/lib/recipes";
import FavoritesList from "./FavoritesList";
import LoginPrompt from "./LoginPrompt";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Favorites");
  return { title: `${t("title")}｜Taste-Trace` };
}

export default async function FavoritesPage() {
  const t = await getTranslations("Favorites");
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-12 sm:px-6 md:pt-16">
      <p className="eyebrow">Saved recipes</p>
      <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">{t("title")}</h1>
      <Suspense fallback={<p className="mt-10 animate-pulse text-muted">{t("loading")}</p>}>
        <Favorites />
      </Suspense>
    </main>
  );
}

// 讀取登入狀態屬於請求資料，包在 Suspense 裡讓頁面外框可以先顯示
async function Favorites() {
  const user = await getCurrentUser();
  if (!user) return <LoginPrompt />;

  const favorites = await listFavorites(user.id);
  return <FavoritesList initialFavorites={favorites} />;
}
