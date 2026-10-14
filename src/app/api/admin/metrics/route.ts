import { requireAdmin } from "@/lib/admin";
import { CATEGORIES } from "@/lib/categories";
import { connectDB } from "@/lib/mongodb";
import { AnalyticsEventModel } from "@/models/AnalyticsEvent";
import { FavoriteRecipeModel } from "@/models/FavoriteRecipe";
import { SearchHistoryModel } from "@/models/SearchHistory";

type Row = { _id: string; count: number };

// 使用偏好統計：菜系熱度（查詢、收藏）與標籤點擊率
export async function GET(request: Request) {
  const admin = await requireAdmin(request, "metrics");
  if (admin instanceof Response) return admin;

  const daysParam = Number(new URL(request.url).searchParams.get("days"));
  const days = [7, 30, 90, 365].includes(daysParam) ? daysParam : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  await connectDB();
  const [searches, favorites, impressions, opens, favoriteTags, daily] = await Promise.all([
    SearchHistoryModel.aggregate<Row>([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]),
    FavoriteRecipeModel.aggregate<Row>([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]),
    tagCounts("recipe_impression", since),
    tagCounts("recipe_open", since),
    // 收藏的食譜帶了哪些標籤（快手菜要回查食譜的時間）
    FavoriteRecipeModel.aggregate<Row>([
      { $match: { createdAt: { $gte: since } } },
      { $lookup: { from: "recipes", localField: "recipe", foreignField: "_id", as: "recipe" } },
      { $unwind: "$recipe" },
      {
        $project: {
          tags: {
            $concatArrays: [
              { $map: { input: { $ifNull: ["$recipe.attributes.scenes", []] }, in: { $concat: ["scene:", "$$this"] } } },
              { $map: { input: { $ifNull: ["$recipe.attributes.mainIngredients", []] }, in: { $concat: ["main:", "$$this"] } } },
              { $cond: [{ $ifNull: ["$recipe.attributes.role", false] }, [{ $concat: ["role:", "$recipe.attributes.role"] }], []] },
              { $cond: [{ $ifNull: ["$recipe.attributes.difficulty", false] }, [{ $concat: ["diff:", "$recipe.attributes.difficulty"] }], []] },
              { $cond: [{ $lte: [{ $ifNull: ["$recipe.totalTimeMinutes", 999] }, 20] }, ["time:under-20"], []] },
            ],
          },
        },
      },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
    ]),
    SearchHistoryModel.aggregate<Row>([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Taipei" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const toMap = (rows: Row[]) => new Map(rows.map((row) => [row._id, row.count]));
  const searchMap = toMap(searches);
  const favoriteMap = toMap(favorites);
  const cuisines = CATEGORIES.map((category) => ({
    slug: category.slug,
    label: category.label,
    group: category.group,
    searches: searchMap.get(category.slug) ?? 0,
    favorites: favoriteMap.get(category.slug) ?? 0,
  })).sort((a, b) => b.searches + b.favorites - (a.searches + a.favorites));

  const impressionMap = toMap(impressions);
  const openMap = toMap(opens);
  const favoriteTagMap = toMap(favoriteTags);
  const tagIds = new Set([...impressionMap.keys(), ...openMap.keys(), ...favoriteTagMap.keys()]);
  const tags = [...tagIds]
    .map((tag) => {
      const shown = impressionMap.get(tag) ?? 0;
      const opened = openMap.get(tag) ?? 0;
      return {
        tag,
        impressions: shown,
        opens: opened,
        ctr: shown > 0 ? opened / shown : null,
        favorites: favoriteTagMap.get(tag) ?? 0,
      };
    })
    .sort((a, b) => b.impressions - a.impressions || b.favorites - a.favorites);

  return Response.json({
    days,
    cuisines,
    tags,
    daily: daily.map((row) => ({ date: row._id, searches: row.count })),
    totals: {
      searches: searches.reduce((sum, row) => sum + row.count, 0),
      favorites: favorites.reduce((sum, row) => sum + row.count, 0),
      impressions: [...impressionMap.values()].length ? await AnalyticsEventModel.countDocuments({ type: "recipe_impression", createdAt: { $gte: since } }) : 0,
      opens: await AnalyticsEventModel.countDocuments({ type: "recipe_open", createdAt: { $gte: since } }),
    },
  });
}

function tagCounts(type: string, since: Date) {
  return AnalyticsEventModel.aggregate<Row>([
    { $match: { type, createdAt: { $gte: since } } },
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
  ]);
}
