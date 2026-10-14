import "server-only";
import { del, put } from "@vercel/blob";
import { Types } from "mongoose";
import { connectDB } from "./mongodb";
import { ingredientKey } from "./quantity";
import { IngredientImageModel } from "@/models/IngredientImage";
import { RecipeModel } from "@/models/Recipe";

// 管理員手動上傳的照片：檔案存在 Vercel Blob 的 curated/ 底下，資料庫記網址與攝影者、授權。
// 標記為 manual 後，自動搜尋與照片檢查都不會覆蓋或清掉。

export type CuratedTarget = { type: "ingredient"; key: string } | { type: "recipe"; recipeId: string };
export type CuratedCredit = { author: string; license: string };

// 上傳到 Blob 的檔名只用英數字，避免中文路徑在某些工具裡出問題
function blobPath(target: CuratedTarget): string {
  const slug =
    target.type === "recipe"
      ? target.recipeId
      : Buffer.from(target.key).toString("hex").slice(0, 40);
  return `curated/${target.type}/${slug}.jpg`;
}

export async function saveCuratedPhoto(
  target: CuratedTarget,
  file: File,
  credit: CuratedCredit,
): Promise<{ url: string }> {
  await connectDB();
  const previous =
    target.type === "ingredient"
      ? (await IngredientImageModel.findOne({ key: target.key }, { image: 1 }).lean())?.image
      : (await RecipeModel.findById(target.recipeId, { image: 1 }).lean())?.image;
  if (target.type === "recipe" && !(await RecipeModel.exists({ _id: target.recipeId }))) {
    throw new Error("找不到這道食譜");
  }

  const blob = await put(blobPath(target), file, {
    access: "public",
    addRandomSuffix: true,
    contentType: "image/jpeg",
  });

  try {
    if (target.type === "ingredient") {
      await IngredientImageModel.updateOne(
        { key: target.key },
        {
          $set: {
            image: {
              url: blob.url,
              source: "custom",
              author: credit.author || undefined,
              license: credit.license || undefined,
              pathname: blob.pathname,
            },
            manual: true,
            imageCheckedAt: new Date(),
          },
        },
        { upsert: true },
      );
    } else {
      await RecipeModel.updateOne(
        { _id: target.recipeId },
        {
          $set: {
            image: {
              url: blob.url,
              source: "custom",
              provider: "Taste-Trace",
              author: credit.author || undefined,
              sourceUrl: blob.url,
              license: credit.license || undefined,
              pathname: blob.pathname,
            },
            imageManual: true,
            imageCheckedAt: new Date(),
          },
        },
      );
    }
  } catch (error) {
    await del(blob.url).catch(() => {}); // 資料庫寫入失敗就把剛上傳的檔案刪掉
    throw error;
  }

  // 換掉之前手動上傳的照片時，刪除舊檔
  if (previous?.source === "custom" && previous.url) await del(previous.url).catch(() => {});
  return { url: blob.url };
}

// 移除手動照片：刪 Blob 檔案，清掉照片讓自動搜尋重新找
export async function removeCuratedPhoto(target: CuratedTarget): Promise<boolean> {
  await connectDB();
  if (target.type === "ingredient") {
    const doc = await IngredientImageModel.findOne({ key: target.key }, { image: 1 }).lean();
    if (doc?.image?.source !== "custom") return false;
    if (doc.image.url) await del(doc.image.url);
    await IngredientImageModel.updateOne(
      { key: target.key },
      { $unset: { image: "", manual: "", imageCheckedAt: "" } },
    );
    return true;
  }
  const doc = await RecipeModel.findById(target.recipeId, { image: 1 }).lean();
  if (doc?.image?.source !== "custom") return false;
  await del(doc.image.url);
  await RecipeModel.updateOne(
    { _id: target.recipeId },
    { $unset: { image: "", imageManual: "", imageCheckedAt: "" } },
  );
  return true;
}

export function normalizeIngredientKey(name: string): string {
  return ingredientKey(name) || name.trim();
}

export function isObjectId(value: string): boolean {
  return Types.ObjectId.isValid(value) && /^[0-9a-f]{24}$/.test(value);
}
