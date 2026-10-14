import "server-only";
import { del, put } from "@vercel/blob";
import { blobToken } from "./blob-token";
import mongoose, { Types } from "mongoose";
import { connectDB } from "./mongodb";
import {
  MAX_CREATIONS_PER_RECIPE,
  type CreationItem,
  type CreationUpdate,
  type CreationVisibility,
  type RecipeCreation,
} from "./recommendation";
import { CreationModel, type Creation } from "@/models/Creation";
import { FavoriteRecipeModel } from "@/models/FavoriteRecipe";
import type { Recipe } from "@/models/Recipe";

type CreationDoc = Creation & { _id: Types.ObjectId; createdAt: Date };
type RecipeRef = Pick<Recipe, "title"> & { _id: Types.ObjectId };

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// includeNote：只有上傳者本人才拿得到私人備註
function toCreationItem(
  creation: CreationDoc,
  recipeTitle: string,
  includeNote = true,
): CreationItem {
  return {
    id: creation._id.toString(),
    recipeId: creation.recipe.toString(),
    recipeTitle,
    url: creation.url,
    width: creation.width ?? null,
    height: creation.height ?? null,
    caption: creation.caption ?? "",
    note: includeNote ? (creation.note ?? "") : "",
    visibility: (creation.visibility ?? "private") as CreationVisibility,
    createdAt: creation.createdAt.toISOString(),
  };
}

export type UploadResult =
  | { ok: true; creation: CreationItem }
  | { ok: false; status: number; error: string };

// 上傳作品照：只能上傳到自己收藏的食譜，每道菜最多 MAX_CREATIONS_PER_RECIPE 張
export async function uploadCreation({
  userId,
  recipeId,
  file,
  caption,
  note,
  visibility,
  width,
  height,
  markCooked,
}: {
  userId: string;
  recipeId: string;
  file: File;
  caption: string;
  note: string;
  visibility: CreationVisibility;
  width?: number;
  height?: number;
  markCooked: boolean;
}): Promise<UploadResult> {
  await connectDB();

  const favorite = await FavoriteRecipeModel.findOne({ userId, recipe: recipeId })
    .populate<{ recipe: RecipeRef | null }>("recipe", "title")
    .lean();
  if (!favorite?.recipe) {
    return { ok: false, status: 404, error: "請先收藏這道食譜再上傳作品" };
  }

  const count = await CreationModel.countDocuments({ userId, recipe: recipeId });
  if (count >= MAX_CREATIONS_PER_RECIPE) {
    return {
      ok: false,
      status: 409,
      error: `每道菜最多 ${MAX_CREATIONS_PER_RECIPE} 張作品照，請先刪除舊的`,
    };
  }

  // 路徑加上隨機字尾，網址無法被猜到
  const blob = await put(
    `creations/${userId}/${recipeId}.${EXTENSIONS[file.type]}`,
    file,
    { access: "public", addRandomSuffix: true, contentType: file.type, token: blobToken() },
  );

  try {
    const creation = await CreationModel.create({
      userId,
      recipe: recipeId,
      url: blob.url,
      pathname: blob.pathname,
      width,
      height,
      caption: caption || undefined,
      note: note || undefined,
      visibility,
    });
    if (markCooked) {
      await FavoriteRecipeModel.updateOne(
        { userId, recipe: recipeId },
        { $addToSet: { labels: "cooked" } },
      );
    }
    return {
      ok: true,
      creation: toCreationItem(creation.toObject() as CreationDoc, favorite.recipe.title),
    };
  } catch (error) {
    // 資料庫寫入失敗時把剛上傳的檔案刪掉，避免留下沒人用的檔案
    await del(blob.url, { token: blobToken() }).catch(() => {});
    throw error;
  }
}

// 刪除作品照；回傳 false 代表找不到或不是自己的
export async function deleteCreation(userId: string, creationId: string): Promise<boolean> {
  await connectDB();
  const creation = await CreationModel.findOne({ _id: creationId, userId }).lean();
  if (!creation) return false;
  await del(creation.url, { token: blobToken() });
  await CreationModel.deleteOne({ _id: creationId, userId });
  return true;
}

export async function listCreations(
  userId: string,
  recipeIds?: Types.ObjectId[],
): Promise<CreationItem[]> {
  await connectDB();
  const creations = await CreationModel.find({
    userId,
    ...(recipeIds && { recipe: { $in: recipeIds } }),
  })
    .sort({ createdAt: -1 })
    .populate<{ recipe: RecipeRef | null }>("recipe", "title")
    .lean();

  return creations.flatMap((creation) =>
    creation.recipe
      ? [
          toCreationItem(
            { ...creation, recipe: creation.recipe._id } as CreationDoc,
            creation.recipe.title,
          ),
        ]
      : [],
  );
}

// 修改作品的過程說明、私人備註與公開設定；回傳 null 代表找不到或不是自己的
export async function updateCreation(
  userId: string,
  { id, caption, note, visibility }: CreationUpdate,
): Promise<CreationItem | null> {
  await connectDB();
  const creation = await CreationModel.findOneAndUpdate(
    { _id: id, userId },
    {
      $set: {
        ...(caption !== undefined && { caption }),
        ...(note !== undefined && { note }),
        ...(visibility && { visibility }),
      },
    },
    { new: true, runValidators: true },
  )
    .populate<{ recipe: RecipeRef | null }>("recipe", "title")
    .lean();
  if (!creation?.recipe) return null;
  return toCreationItem(
    { ...creation, recipe: creation.recipe._id } as CreationDoc,
    creation.recipe.title,
  );
}

const RECIPE_CREATIONS_LIMIT = 30;

// 食譜頁「大家的作品」：所有人公開的作品，加上目前使用者自己的（含私人與備註）
export async function listRecipeCreations(
  recipeId: string,
  viewerId: string | null,
): Promise<RecipeCreation[]> {
  await connectDB();
  const creations = await CreationModel.find({
    recipe: recipeId,
    $or: [{ visibility: "public" }, ...(viewerId ? [{ userId: viewerId }] : [])],
  })
    .sort({ createdAt: -1 })
    .limit(RECIPE_CREATIONS_LIMIT)
    .populate<{ recipe: RecipeRef | null }>("recipe", "title")
    .lean();

  const authorNames = await findAuthorNames([...new Set(creations.map((c) => c.userId))]);
  return creations.flatMap((creation) => {
    if (!creation.recipe) return [];
    const mine = creation.userId === viewerId;
    return [
      {
        ...toCreationItem(
          { ...creation, recipe: creation.recipe._id } as CreationDoc,
          creation.recipe.title,
          mine,
        ),
        authorName: authorNames.get(creation.userId) ?? "Taste-Trace 使用者",
        mine,
      },
    ];
  });
}

// 從 Better Auth 的 user collection 只讀出顯示名稱，不讀信箱
async function findAuthorNames(userIds: string[]): Promise<Map<string, string>> {
  const ids = userIds.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
  if (ids.length === 0 || !mongoose.connection.db) return new Map();
  const users = await mongoose.connection.db
    .collection<{ _id: Types.ObjectId; name?: string }>("user")
    .find({ _id: { $in: ids } }, { projection: { name: 1 } })
    .toArray();
  return new Map(users.flatMap((user) => (user.name ? [[user._id.toString(), user.name]] : [])));
}
