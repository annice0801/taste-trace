import "server-only";
import { del } from "@vercel/blob";
import mongoose, { Types } from "mongoose";
import { z } from "zod";
import type { Admin } from "./admin";
import { isAdminEmail } from "./admin";
import { findOrphanBlobs } from "./blob-assets";
import { normalizeIngredientKey, removeCuratedPhoto } from "./curated-photos";
import { connectDB } from "./mongodb";
import { AdminAuditModel } from "@/models/AdminAudit";
import { CreationModel } from "@/models/Creation";
import { ERROR_CATEGORIES, ErrorLogModel } from "@/models/ErrorLog";
import { FavoriteRecipeModel } from "@/models/FavoriteRecipe";
import { IngredientImageModel } from "@/models/IngredientImage";
import { ProduceGuideModel } from "@/models/ProduceGuide";
import { RecipeModel } from "@/models/Recipe";
import { SearchHistoryModel } from "@/models/SearchHistory";

// 後台的高風險操作。每個操作都分兩段：
//   preview：算出會影響多少資料，給管理員確認（不會改任何東西）
//   execute：帶著預覽發的確認憑證才能執行，執行時會重新檢查一次
export type Risk = "high" | "medium";

// 預期中的錯誤（找不到資料、不允許的操作）：直接告訴管理員，不寫進錯誤日誌
export class OpError extends Error {}
export type OpPreview = {
  title: string;
  summary: string;
  count: number;
  items: string[]; // 前幾筆受影響的資料，給管理員看一眼
  risk: Risk;
  confirmPhrase: string | null; // 高風險操作要輸入這段文字才能執行
};

type OpDefinition<S extends z.ZodType> = {
  schema: S;
  preview: (params: z.infer<S>) => Promise<OpPreview>;
  execute: (params: z.infer<S>, admin: Admin) => Promise<string>;
};

const objectId = z.string().regex(/^[0-9a-f]{24}$/);
const days = z.number().int().min(0).max(3650);

function db() {
  const database = mongoose.connection.db;
  if (!database) throw new OpError("資料庫尚未連線");
  return database;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

function define<S extends z.ZodType>(definition: OpDefinition<S>) {
  return definition;
}

export const OPS = {
  // 孤兒圖片：Blob 裡有、資料庫沒人引用
  "blob.deleteOrphans": define({
    schema: z.object({ urls: z.array(z.string().url()).min(1).max(1000).optional() }),
    async preview({ urls }) {
      const { orphans } = await findOrphanBlobs();
      const targets = urls ? orphans.filter((file) => urls.includes(file.url)) : orphans;
      const size = targets.reduce((sum, file) => sum + file.size, 0);
      return {
        title: "刪除孤兒圖片",
        summary: `將從 Vercel Blob 永久刪除 ${targets.length} 個沒有被引用的檔案（共 ${formatBytes(size)}）。刪除後無法復原。`,
        count: targets.length,
        items: targets.slice(0, 8).map((file) => `${file.pathname}（${formatBytes(file.size)}）`),
        risk: "high",
        confirmPhrase: `刪除 ${targets.length} 個檔案`,
      };
    },
    async execute({ urls }) {
      // 執行前重新比對，預覽之後才被引用的檔案不會被刪
      const { orphans } = await findOrphanBlobs();
      const targets = (urls ? orphans.filter((file) => urls.includes(file.url)) : orphans).map((f) => f.url);
      for (let i = 0; i < targets.length; i += 100) await del(targets.slice(i, i + 100));
      return `已刪除 ${targets.length} 個孤兒檔案`;
    },
  }),

  // 下架作品照：同時刪除 Blob 檔案與資料庫紀錄
  "creations.takedown": define({
    schema: z.object({ ids: z.array(objectId).min(1).max(100) }),
    async preview({ ids }) {
      await connectDB();
      const creations = await CreationModel.find({ _id: { $in: ids } })
        .populate<{ recipe: { title: string } | null }>("recipe", "title")
        .lean();
      return {
        title: "下架作品照",
        summary: `將刪除 ${creations.length} 張作品照（Blob 檔案與資料庫紀錄同步移除），上傳者也看不到了。`,
        count: creations.length,
        items: creations.slice(0, 8).map((c) => `${c.recipe?.title ?? "（食譜已刪除）"}・${c.caption || "無說明"}`),
        risk: "high",
        confirmPhrase: `下架 ${creations.length} 張`,
      };
    },
    async execute({ ids }) {
      await connectDB();
      const creations = await CreationModel.find({ _id: { $in: ids } }, { url: 1 }).lean();
      if (creations.length > 0) await del(creations.map((c) => c.url));
      await CreationModel.deleteMany({ _id: { $in: creations.map((c) => c._id) } });
      return `已下架 ${creations.length} 張作品照`;
    },
  }),

  "user.ban": define({
    schema: z.object({ userId: objectId, reason: z.string().trim().max(200).default("") }),
    async preview({ userId, reason }) {
      await connectDB();
      const user = await db().collection("user").findOne({ _id: new Types.ObjectId(userId) });
      if (!user) throw new OpError("找不到這位使用者");
      if (isAdminEmail(user.email)) throw new OpError("不能停權管理員帳號");
      const sessions = await db().collection("session").countDocuments({ userId: user._id });
      return {
        title: "停權使用者",
        summary: `停權 ${user.name}（${user.email}）。會立即登出 ${sessions} 個登入中的裝置，之後無法再登入。${reason ? `原因：${reason}` : ""}`,
        count: 1,
        items: [],
        risk: "high",
        confirmPhrase: `停權 ${user.email}`,
      };
    },
    async execute({ userId, reason }) {
      await connectDB();
      const _id = new Types.ObjectId(userId);
      const user = await db().collection("user").findOne({ _id });
      if (!user || isAdminEmail(user.email)) throw new OpError("無法停權這個帳號");
      await db()
        .collection("user")
        .updateOne({ _id }, { $set: { banned: true, banReason: reason || null, bannedAt: new Date() } });
      const { deletedCount } = await db().collection("session").deleteMany({ userId: _id });
      return `已停權 ${user.email}，登出 ${deletedCount} 個裝置`;
    },
  }),

  "user.unban": define({
    schema: z.object({ userId: objectId }),
    async preview({ userId }) {
      await connectDB();
      const user = await db().collection("user").findOne({ _id: new Types.ObjectId(userId) });
      if (!user) throw new OpError("找不到這位使用者");
      return {
        title: "解除停權",
        summary: `解除 ${user.name}（${user.email}）的停權，對方可以重新登入。`,
        count: 1,
        items: [],
        risk: "medium",
        confirmPhrase: null,
      };
    },
    async execute({ userId }) {
      await connectDB();
      await db()
        .collection("user")
        .updateOne(
          { _id: new Types.ObjectId(userId) },
          { $set: { banned: false }, $unset: { banReason: "", bannedAt: "" } },
        );
      return "已解除停權";
    },
  }),

  "db.clearSearchHistory": define({
    schema: z.object({ olderThanDays: days }),
    async preview({ olderThanDays }) {
      await connectDB();
      const count = await SearchHistoryModel.countDocuments({ createdAt: { $lt: daysAgo(olderThanDays) } });
      return {
        title: "清理推薦紀錄",
        summary: `刪除 ${olderThanDays} 天前的 ${count} 筆推薦紀錄（使用偏好統計的資料會跟著減少）。食譜本身不受影響。`,
        count,
        items: [],
        risk: "high",
        confirmPhrase: `刪除 ${count} 筆紀錄`,
      };
    },
    async execute({ olderThanDays }) {
      await connectDB();
      const { deletedCount } = await SearchHistoryModel.deleteMany({ createdAt: { $lt: daysAgo(olderThanDays) } });
      return `已刪除 ${deletedCount} 筆推薦紀錄`;
    },
  }),

  // 沒人收藏、沒有作品照的舊食譜
  "db.deleteUnusedRecipes": define({
    schema: z.object({ olderThanDays: days.min(1) }),
    async preview({ olderThanDays }) {
      const ids = await unusedRecipeIds(olderThanDays);
      const samples = await RecipeModel.find({ _id: { $in: ids.slice(0, 8) } }, { title: 1 }).lean();
      return {
        title: "刪除沒人使用的食譜",
        summary: `刪除 ${olderThanDays} 天前建立、沒有人收藏也沒有作品照的 ${ids.length} 道食譜（含已產生的做法）。`,
        count: ids.length,
        items: samples.map((recipe) => recipe.title),
        risk: "high",
        confirmPhrase: `刪除 ${ids.length} 道食譜`,
      };
    },
    async execute({ olderThanDays }) {
      const ids = await unusedRecipeIds(olderThanDays);
      const { deletedCount } = await RecipeModel.deleteMany({ _id: { $in: ids } });
      return `已刪除 ${deletedCount} 道食譜`;
    },
  }),

  "db.clearProduceCache": define({
    schema: z.object({}),
    async preview() {
      await connectDB();
      const docs = await ProduceGuideModel.find({}, { regionLabel: 1 }).lean();
      return {
        title: "清除當季蔬果快取",
        summary: `刪除 ${docs.length} 個地點的當季蔬果資料，下次有人查詢時會重新請 AI 整理（會產生 AI 費用）。`,
        count: docs.length,
        items: docs.slice(0, 8).map((doc) => doc.regionLabel),
        risk: "medium",
        confirmPhrase: null,
      };
    },
    async execute() {
      await connectDB();
      const { deletedCount } = await ProduceGuideModel.deleteMany({});
      return `已清除 ${deletedCount} 個地點`;
    },
  }),

  // 找不到照片的食材，讓下次顯示時重新找
  "db.retryIngredientImages": define({
    schema: z.object({}),
    async preview() {
      await connectDB();
      const count = await IngredientImageModel.countDocuments(missingIngredientImageFilter);
      return {
        title: "重新尋找食材照片",
        summary: `${count} 種食材之前找不到照片，重設後會在下次顯示時重新到 Unsplash 找（會用到 Unsplash 額度）。`,
        count,
        items: [],
        risk: "medium",
        confirmPhrase: null,
      };
    },
    async execute() {
      await connectDB();
      const { modifiedCount } = await IngredientImageModel.updateMany(missingIngredientImageFilter, {
        $unset: { imageCheckedAt: "" },
      });
      return `已重設 ${modifiedCount} 種食材`;
    },
  }),

  "db.clearErrorLogs": define({
    schema: z.object({
      category: z.enum(Object.keys(ERROR_CATEGORIES) as [string, ...string[]]).optional(),
      resolvedOnly: z.boolean().default(false),
    }),
    async preview({ category, resolvedOnly }) {
      await connectDB();
      const count = await ErrorLogModel.countDocuments(errorLogFilter(category, resolvedOnly));
      const scope = [
        category ? ERROR_CATEGORIES[category as keyof typeof ERROR_CATEGORIES] : "全部分類",
        resolvedOnly ? "已處理" : "全部狀態",
      ].join("・");
      return {
        title: "清除錯誤日誌",
        summary: `刪除 ${count} 筆錯誤日誌（${scope}）。`,
        count,
        items: [],
        risk: "high",
        confirmPhrase: `刪除 ${count} 筆日誌`,
      };
    },
    async execute({ category, resolvedOnly }) {
      await connectDB();
      const { deletedCount } = await ErrorLogModel.deleteMany(errorLogFilter(category, resolvedOnly));
      return `已刪除 ${deletedCount} 筆錯誤日誌`;
    },
  }),

  // 排錯：做法有問題時清掉，下次點開會重新產生
  "recipe.resetDetail": define({
    schema: z.object({ recipeId: objectId }),
    async preview({ recipeId }) {
      const recipe = await findRecipeOrThrow(recipeId);
      return {
        title: "重新產生做法",
        summary: `清除「${recipe.title}」已產生的食材與做法，下次有人點開時會重新請 AI 產生（會產生 AI 費用）。`,
        count: 1,
        items: [],
        risk: "medium",
        confirmPhrase: null,
      };
    },
    async execute({ recipeId }) {
      await connectDB();
      await RecipeModel.updateOne(
        { _id: recipeId },
        {
          $set: { ingredients: [], steps: [], adaptations: [] },
          $unset: { detailGeneratedAt: "", tip: "", masterPrinciple: "" },
        },
      );
      return "已清除做法";
    },
  }),

  // 移除管理員上傳的照片（刪 Blob 檔案），之後改回自動搜尋
  "photos.removeCurated": define({
    schema: z.object({ type: z.enum(["ingredient", "recipe"]), id: z.string().trim().min(1).max(60) }),
    async preview({ type, id }) {
      return {
        title: "移除手動照片",
        summary: `刪除「${type === "recipe" ? (await findRecipeOrThrow(id)).title : id}」的手動上傳照片（Blob 檔案一併刪除），之後改回自動搜尋照片。`,
        count: 1,
        items: [],
        risk: "medium",
        confirmPhrase: null,
      };
    },
    async execute({ type, id }) {
      const removed = await removeCuratedPhoto(
        type === "ingredient" ? { type, key: normalizeIngredientKey(id) } : { type, recipeId: id },
      );
      if (!removed) throw new OpError("這張不是手動上傳的照片");
      return "已移除手動照片";
    },
  }),

  "recipe.resetImage": define({
    schema: z.object({ recipeId: objectId }),
    async preview({ recipeId }) {
      const recipe = await findRecipeOrThrow(recipeId);
      return {
        title: "重新尋找食譜照片",
        summary: `移除「${recipe.title}」目前的示意照片，下次顯示時重新尋找。`,
        count: 1,
        items: [],
        risk: "medium",
        confirmPhrase: null,
      };
    },
    async execute({ recipeId }) {
      await connectDB();
      const result = await RecipeModel.updateOne(
        { _id: recipeId, imageManual: { $ne: true } }, // 手動照片要用「移除手動照片」
        { $unset: { image: "", imageCheckedAt: "" } },
      );
      if (result.matchedCount === 0) throw new OpError("這道菜用的是手動上傳的照片，請到照片管理移除");
      return "已移除照片";
    },
  }),
} as const;

export type OpName = keyof typeof OPS;

export function isOpName(name: string): name is OpName {
  return name in OPS;
}

const missingIngredientImageFilter = {
  imageCheckedAt: { $exists: true },
  $or: [{ image: { $exists: false } }, { "image.url": { $exists: false } }],
};

function errorLogFilter(category: string | undefined, resolvedOnly: boolean) {
  return { ...(category && { category }), ...(resolvedOnly && { resolved: true }) };
}

async function findRecipeOrThrow(recipeId: string) {
  await connectDB();
  const recipe = await RecipeModel.findById(recipeId, { title: 1 }).lean();
  if (!recipe) throw new OpError("找不到這道食譜");
  return recipe;
}

async function unusedRecipeIds(olderThanDays: number): Promise<Types.ObjectId[]> {
  await connectDB();
  const [favorited, withCreations] = await Promise.all([
    FavoriteRecipeModel.distinct("recipe"),
    CreationModel.distinct("recipe"),
  ]);
  const used = [...favorited, ...withCreations];
  const recipes = await RecipeModel.find(
    { _id: { $nin: used }, createdAt: { $lt: daysAgo(olderThanDays) } },
    { _id: 1 },
  ).lean();
  return recipes.map((recipe) => recipe._id as Types.ObjectId);
}

export async function audit(admin: Admin, action: string, params: unknown, result: string) {
  await connectDB();
  await AdminAuditModel.create({ adminEmail: admin.email, action, params, result });
}
