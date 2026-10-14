import { requireAdmin } from "@/lib/admin";
import { connectDB } from "@/lib/mongodb";
import { FavoriteRecipeModel } from "@/models/FavoriteRecipe";
import { RecipeModel } from "@/models/Recipe";

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 資料維護：用菜名或 id 找食譜，看做法、照片的狀態
export async function GET(request: Request) {
  const admin = await requireAdmin(request, "maintenance");
  if (admin instanceof Response) return admin;

  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) ?? "";
  await connectDB();
  const filter = /^[0-9a-f]{24}$/.test(q)
    ? { _id: q }
    : q
      ? { $or: [{ title: { $regex: escapeRegex(q), $options: "i" } }, { englishName: { $regex: escapeRegex(q), $options: "i" } }] }
      : {};
  const recipes = await RecipeModel.find(filter).sort({ createdAt: -1 }).limit(30).lean();
  const favoriteCounts = new Map(
    (
      await FavoriteRecipeModel.aggregate<{ _id: unknown; count: number }>([
        { $match: { recipe: { $in: recipes.map((r) => r._id) } } },
        { $group: { _id: "$recipe", count: { $sum: 1 } } },
      ])
    ).map((row) => [String(row._id), row.count]),
  );

  return Response.json({
    recipes: recipes.map((recipe) => ({
      id: recipe._id.toString(),
      title: recipe.title,
      englishName: recipe.englishName ?? "",
      category: recipe.category ?? "",
      createdAt: recipe.createdAt?.toISOString() ?? null,
      hasDetail: Boolean(recipe.detailGeneratedAt),
      detailGeneratedAt: recipe.detailGeneratedAt?.toISOString() ?? null,
      ingredientCount: recipe.ingredients?.length ?? 0,
      stepCount: recipe.steps?.length ?? 0,
      image: recipe.image?.url ? { url: recipe.image.url, source: recipe.image.source } : null,
      imageCheckedAt: recipe.imageCheckedAt?.toISOString() ?? null,
      favorites: favoriteCounts.get(recipe._id.toString()) ?? 0,
    })),
  });
}
