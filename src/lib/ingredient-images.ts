import "server-only";
import { z } from "zod";
import { generateStructured, type AIClient } from "./ai";
import { findUnsplashImage, LOOKUP_INTERVAL_MS, sleep } from "./images";
import { connectDB } from "./mongodb";
import { ingredientKey } from "./quantity";
import { IngredientImageModel } from "@/models/IngredientImage";
import { logError } from "./error-log";

export type IngredientPhoto = {
  url: string;
  author: string;
  authorUrl: string;
  sourceUrl: string;
};

// 每次請求最多找幾種食材的照片（Unsplash 測試額度每小時 50 次）
const MAX_LOOKUPS_PER_REQUEST = 6;
// 找不到照片時，隔多久才再找一次
const RETRY_MS = 7 * 24 * 60 * 60 * 1000;

const translationSchema = z.object({
  items: z.array(
    z.object({
      name: z.string().describe("原本的中文食材名稱，原樣照抄"),
      englishName: z
        .string()
        .describe("用來搜尋食材照片的英文名稱，只寫食材本身，1 到 3 個英文字，例：canned tomatoes、unsalted butter、scallion"),
    }),
  ),
});

async function translateNames(ai: AIClient, names: string[]) {
  const parsed = await generateStructured(ai, {
    instructions: "把使用者提供的中文食材名稱逐一翻成英文，用來搜尋食材照片。",
    input: names.join("\n"),
    schema: translationSchema,
    name: "ingredient_names",
    reasoning: { effort: "none" }, // 單純翻譯不需要推理
  });
  return parsed?.items ?? [];
}

// 回傳每個食材名稱的照片（null 代表沒有照片），以及這次還沒處理到、可以稍後再要的名稱
export async function resolveIngredientImages(
  names: string[],
  ai: AIClient | null,
): Promise<{ images: Record<string, IngredientPhoto | null>; pending: string[] }> {
  await connectDB();
  const keyOf = new Map(names.map((name) => [name, ingredientKey(name) || name]));
  const keys = [...new Set(keyOf.values())];

  const docs = new Map(
    (await IngredientImageModel.find({ key: { $in: keys } }).lean()).map((doc) => [doc.key, doc]),
  );

  // 還沒有英文名稱的食材，一次請 AI 翻譯（沒有可用的 OpenAI 金鑰就先跳過）
  const untranslated = keys.filter((key) => !docs.get(key)?.englishName);
  if (untranslated.length > 0 && ai) {
    try {
      const items = await translateNames(ai, untranslated);
      for (const { name, englishName } of items) {
        const key = ingredientKey(name) || name;
        if (!untranslated.includes(key) || !englishName.trim()) continue;
        const doc = await IngredientImageModel.findOneAndUpdate(
          { key },
          { $set: { englishName: englishName.trim().toLowerCase() } },
          { upsert: true, returnDocument: "after" },
        ).lean();
        if (doc) docs.set(key, doc);
      }
    } catch (error) {
      logError("ai", "ingredient-images.translate", error);
    }
  }

  // 依序找照片；Unsplash 額度用完或出錯就停，剩下的下次再找
  let lookups = 0;
  let stopped = false;
  const pendingKeys = new Set<string>();
  for (const key of keys) {
    const doc = docs.get(key);
    if (!doc?.englishName || doc.image?.url) {
      if (!doc?.englishName) pendingKeys.add(key);
      continue;
    }
    const checkedRecently =
      doc.imageCheckedAt && Date.now() - doc.imageCheckedAt.getTime() < RETRY_MS;
    if (checkedRecently) continue;
    if (stopped || lookups >= MAX_LOOKUPS_PER_REQUEST) {
      pendingKeys.add(key);
      continue;
    }

    if (lookups > 0) await sleep(LOOKUP_INTERVAL_MS);
    lookups++;
    try {
      // 只採用蔬果、食材本身的照片（排除動物、果醬罐之類的加工品）
      const photo = await findUnsplashImage(`fresh ${doc.englishName}`, "squarish", 400, "produce");
      const image = photo && {
        url: photo.url,
        author: photo.author ?? "Unsplash",
        authorUrl: photo.authorUrl ?? photo.sourceUrl,
        sourceUrl: photo.sourceUrl,
      };
      const updated = await IngredientImageModel.findOneAndUpdate(
        { key },
        { $set: { imageCheckedAt: new Date(), ...(image && { image }) } },
        { returnDocument: "after" },
      ).lean();
      if (updated) docs.set(key, updated);
    } catch (error) {
      logError("unsplash", "ingredient-images.unsplash", error, { query: doc.englishName });
      stopped = true;
      pendingKeys.add(key);
    }
  }

  const images: Record<string, IngredientPhoto | null> = {};
  const pending: string[] = [];
  for (const [name, key] of keyOf) {
    const image = docs.get(key)?.image;
    images[name] = image?.url
      ? {
          url: image.url,
          author: image.author ?? "Unsplash",
          authorUrl: image.authorUrl ?? image.sourceUrl ?? "https://unsplash.com",
          sourceUrl: image.sourceUrl ?? "https://unsplash.com",
        }
      : null;
    if (pendingKeys.has(key)) pending.push(name);
  }
  // 額度用完時，這次就不要再請前端重試
  return { images, pending: stopped ? [] : pending };
}
