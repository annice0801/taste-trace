import mongoose, { Types } from "mongoose";
import { requireAdmin } from "@/lib/admin";
import { connectDB } from "@/lib/mongodb";
import { CreationModel } from "@/models/Creation";

const PAGE_SIZE = 48;

// 作品照審核牆：最新上傳在前，附上傳者與公開狀態
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;

  const url = new URL(request.url);
  const before = url.searchParams.get("before");
  const visibility = url.searchParams.get("visibility");
  await connectDB();
  const creations = await CreationModel.find({
    ...(before && !Number.isNaN(Date.parse(before)) && { createdAt: { $lt: new Date(before) } }),
    ...((visibility === "public" || visibility === "private") && { visibility }),
  })
    .sort({ createdAt: -1 })
    .limit(PAGE_SIZE + 1)
    .populate<{ recipe: { _id: Types.ObjectId; title: string } | null }>("recipe", "title")
    .lean();

  const userIds = [...new Set(creations.map((c) => c.userId))]
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));
  const users = await mongoose.connection
    .db!.collection<{ _id: Types.ObjectId; name?: string; email?: string }>("user")
    .find({ _id: { $in: userIds } }, { projection: { name: 1, email: 1 } })
    .toArray();
  const userById = new Map(users.map((user) => [user._id.toString(), user]));

  return Response.json({
    creations: creations.slice(0, PAGE_SIZE).map((c) => ({
      id: c._id.toString(),
      url: c.url,
      width: c.width ?? null,
      height: c.height ?? null,
      caption: c.caption ?? "",
      visibility: c.visibility ?? "private",
      recipeTitle: c.recipe?.title ?? "（食譜已刪除）",
      userName: userById.get(c.userId)?.name ?? "（已刪除的使用者）",
      userEmail: userById.get(c.userId)?.email ?? "",
      createdAt: c.createdAt.toISOString(),
    })),
    hasMore: creations.length > PAGE_SIZE,
  });
}
