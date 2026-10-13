"use client";

import { useState } from "react";
import { dateTime } from "./api";
import { Card, ErrorText, Loading, PageHeader } from "./ui";
import { useAdminData } from "./useAdminData";
import { useOperation } from "./useOperation";

type RecipeRow = {
  id: string;
  title: string;
  englishName: string;
  category: string;
  createdAt: string | null;
  hasDetail: boolean;
  detailGeneratedAt: string | null;
  ingredientCount: number;
  stepCount: number;
  image: { url: string; source: string } | null;
  imageCheckedAt: string | null;
  favorites: number;
};

export default function Maintenance() {
  const { run } = useOperation();
  const [historyDays, setHistoryDays] = useState(180);
  const [recipeDays, setRecipeDays] = useState(30);

  return (
    <>
      <PageHeader
        title="資料維護"
        description="營運排錯與清理。每個操作都會先預覽影響範圍，確認後才執行，並記錄在操作紀錄。"
      />
      <RecipeLookup />

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card title="清理推薦紀錄">
          <p className="text-sm text-muted">刪除較舊的推薦紀錄。食譜、收藏不受影響，但使用統計會少掉這段期間。</p>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <input type="number" min={0} value={historyDays} onChange={(event) => setHistoryDays(Number(event.target.value))} className="field w-24 !py-1.5" />
            天前
            <button type="button" onClick={() => run("db.clearSearchHistory", { olderThanDays: historyDays })} className="btn-secondary ml-auto !py-1.5 !text-sm">
              預覽並清理
            </button>
          </div>
        </Card>

        <Card title="刪除沒人使用的食譜">
          <p className="text-sm text-muted">刪除超過指定天數、沒有任何人收藏、也沒有作品照的食譜。</p>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <input type="number" min={1} value={recipeDays} onChange={(event) => setRecipeDays(Number(event.target.value))} className="field w-24 !py-1.5" />
            天前建立
            <button type="button" onClick={() => run("db.deleteUnusedRecipes", { olderThanDays: recipeDays })} className="btn-secondary ml-auto !py-1.5 !text-sm">
              預覽並刪除
            </button>
          </div>
        </Card>

        <Card title="清除當季蔬果快取">
          <p className="text-sm text-muted">AI 整理的產季資料有誤時使用。下次查詢會重新產生。</p>
          <button type="button" onClick={() => run("db.clearProduceCache")} className="btn-secondary mt-3 !py-1.5 !text-sm">預覽並清除</button>
        </Card>

        <Card title="重新尋找食材照片">
          <p className="text-sm text-muted">Unsplash 額度用完時找不到照片的食材，重設後會再找一次。</p>
          <button type="button" onClick={() => run("db.retryIngredientImages")} className="btn-secondary mt-3 !py-1.5 !text-sm">預覽並重設</button>
        </Card>
      </div>
    </>
  );
}

// 排錯：找到某道食譜，看做法、照片狀態，必要時重新產生
function RecipeLookup() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState<string | null>(null);
  const { data, error, loading, reload } = useAdminData<{ recipes: RecipeRow[] }>(
    query === null ? null : `/api/admin/recipes?q=${encodeURIComponent(query)}`,
  );
  const { run } = useOperation();

  return (
    <Card title="食譜排錯">
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(q.trim());
        }}
      >
        <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="菜名、英文名或食譜 id；留空列出最新 30 道" className="field flex-1" />
        <button type="submit" className="btn-primary">查詢</button>
      </form>
      <div className="mt-4">
        {error && <ErrorText message={error} />}
        {query !== null && !data && !error && <Loading />}
        {data && data.recipes.length === 0 && <p className="text-sm text-muted">找不到符合的食譜。</p>}
        {data && data.recipes.length > 0 && (
          <ul className={`divide-y divide-border ${loading ? "opacity-60" : ""}`}>
            {data.recipes.map((recipe) => (
              <li key={recipe.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                {recipe.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 排錯預覽
                  <img src={recipe.image.url} alt="" className="size-14 shrink-0 rounded-lg bg-border object-cover" />
                ) : (
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-border text-[10px] text-muted">無照片</span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {recipe.title}
                    <span className="ml-2 text-xs font-normal text-muted">{recipe.englishName}</span>
                  </p>
                  <p className="text-xs text-muted">
                    <code>{recipe.id}</code>・{recipe.category}・收藏 {recipe.favorites}
                    {recipe.createdAt && `・建立 ${dateTime.format(new Date(recipe.createdAt))}`}
                  </p>
                  <p className="text-xs">
                    {recipe.hasDetail ? (
                      <span className="text-green-700 dark:text-green-400">
                        做法已產生（{recipe.ingredientCount} 種食材、{recipe.stepCount} 步）
                      </span>
                    ) : (
                      <span className="text-muted">做法尚未產生</span>
                    )}
                    {recipe.image ? <span className="text-muted">・照片：{recipe.image.source}</span> : recipe.imageCheckedAt && <span className="text-muted">・找過照片但沒找到</span>}
                  </p>
                </div>
                <div className="flex gap-3 text-xs">
                  <button
                    type="button"
                    disabled={!recipe.hasDetail}
                    onClick={async () => (await run("recipe.resetDetail", { recipeId: recipe.id })) && reload()}
                    className="underline underline-offset-4 disabled:opacity-40"
                  >
                    重新產生做法
                  </button>
                  <button
                    type="button"
                    disabled={!recipe.image && !recipe.imageCheckedAt}
                    onClick={async () => (await run("recipe.resetImage", { recipeId: recipe.id })) && reload()}
                    className="underline underline-offset-4 disabled:opacity-40"
                  >
                    重找照片
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
