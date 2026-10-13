import mongoose from "mongoose";
import { requireAdmin } from "@/lib/admin";
import { getModelSetting } from "@/lib/ai-settings";
import { connectDB } from "@/lib/mongodb";
import { AdminAuditModel } from "@/models/AdminAudit";
import { CreationModel } from "@/models/Creation";
import { ErrorLogModel } from "@/models/ErrorLog";
import { FavoriteRecipeModel } from "@/models/FavoriteRecipe";
import { RecipeModel } from "@/models/Recipe";
import { SearchHistoryModel } from "@/models/SearchHistory";

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000);

// 後台首頁：各項數量、近 24 小時錯誤、最近的管理操作
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;

  await connectDB();
  const users = mongoose.connection.db!.collection("user");
  const [
    userCount,
    bannedCount,
    recipeCount,
    recipesWithDetail,
    favoriteCount,
    creationCount,
    publicCreationCount,
    searches24h,
    searches7d,
    errorsByCategory,
    unresolvedErrors,
    recentAudit,
    model,
  ] = await Promise.all([
    users.countDocuments(),
    users.countDocuments({ banned: true }),
    RecipeModel.countDocuments(),
    RecipeModel.countDocuments({ detailGeneratedAt: { $exists: true } }),
    FavoriteRecipeModel.countDocuments(),
    CreationModel.countDocuments(),
    CreationModel.countDocuments({ visibility: "public" }),
    SearchHistoryModel.countDocuments({ createdAt: { $gte: hoursAgo(24) } }),
    SearchHistoryModel.countDocuments({ createdAt: { $gte: hoursAgo(24 * 7) } }),
    ErrorLogModel.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: hoursAgo(24) } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    ErrorLogModel.countDocuments({ resolved: false }),
    AdminAuditModel.find().sort({ createdAt: -1 }).limit(8).lean(),
    getModelSetting(),
  ]);

  return Response.json({
    counts: {
      users: userCount,
      banned: bannedCount,
      recipes: recipeCount,
      recipesWithDetail,
      favorites: favoriteCount,
      creations: creationCount,
      publicCreations: publicCreationCount,
      searches24h,
      searches7d,
      unresolvedErrors,
    },
    errorsByCategory: errorsByCategory.map((row) => ({ category: row._id, count: row.count })),
    recentAudit: recentAudit.map((row) => ({
      id: row._id.toString(),
      adminEmail: row.adminEmail,
      action: row.action,
      result: row.result ?? "",
      createdAt: row.createdAt.toISOString(),
    })),
    model,
  });
}
