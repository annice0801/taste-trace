import mongoose from "mongoose";
import { isOwnerEmail, requireAdmin } from "@/lib/admin";
import { AdminMemberModel } from "@/models/AdminMember";
import { connectDB } from "@/lib/mongodb";
import { CreationModel } from "@/models/Creation";
import { FavoriteRecipeModel } from "@/models/FavoriteRecipe";
import { SearchHistoryModel } from "@/models/SearchHistory";

const PAGE_SIZE = 50;

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 使用者名單：Google 登入註冊的帳號，附收藏、作品、推薦次數
export async function GET(request: Request) {
  const admin = await requireAdmin(request, "users");
  if (admin instanceof Response) return admin;

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim().slice(0, 100) ?? "";
  const page = Math.max(0, Number(url.searchParams.get("page")) || 0);
  const status = url.searchParams.get("status");

  await connectDB();
  const collection = mongoose.connection.db!.collection("user");
  const filter = {
    ...(q && {
      $or: [
        { name: { $regex: escapeRegex(q), $options: "i" } },
        { email: { $regex: escapeRegex(q), $options: "i" } },
      ],
    }),
    ...(status === "banned" && { banned: true }),
  };
  const [total, users] = await Promise.all([
    collection.countDocuments(filter),
    collection
      .find(filter, { projection: { name: 1, email: 1, image: 1, createdAt: 1, banned: 1, banReason: 1 } })
      .sort({ createdAt: -1 })
      .skip(page * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .toArray(),
  ]);

  const ids = users.map((user) => user._id.toString());
  const memberEmails = new Set(
    (await AdminMemberModel.find({ email: { $in: users.map((user) => String(user.email ?? "").toLowerCase()) } }, { email: 1 }).lean()).map((m) => m.email),
  );
  const countBy = async (model: typeof FavoriteRecipeModel | typeof CreationModel | typeof SearchHistoryModel) =>
    new Map(
      (
        await (model as typeof FavoriteRecipeModel).aggregate<{ _id: string; count: number }>([
          { $match: { userId: { $in: ids } } },
          { $group: { _id: "$userId", count: { $sum: 1 } } },
        ])
      ).map((row) => [row._id, row.count]),
    );
  const [favorites, creations, searches] = await Promise.all([
    countBy(FavoriteRecipeModel),
    countBy(CreationModel),
    countBy(SearchHistoryModel),
  ]);

  return Response.json({
    total,
    pageSize: PAGE_SIZE,
    users: users.map((user) => {
      const id = user._id.toString();
      return {
        id,
        name: user.name ?? "",
        email: user.email ?? "",
        image: typeof user.image === "string" ? user.image : null,
        createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : null,
        banned: Boolean(user.banned),
        banReason: user.banReason ?? null,
        isAdmin: isOwnerEmail(user.email) || memberEmails.has(String(user.email ?? "").toLowerCase()),
        favorites: favorites.get(id) ?? 0,
        creations: creations.get(id) ?? 0,
        searches: searches.get(id) ?? 0,
      };
    }),
  });
}
