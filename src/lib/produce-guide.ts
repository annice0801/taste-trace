import "server-only";
import { generateStructured, type AIClient } from "./ai";
import { connectDB } from "./mongodb";
import { produceGuideSchema, type ProduceGuide } from "./produce";
import { getPrompt } from "./prompts";
import { ingredientKey } from "./quantity";
import { IngredientImageModel } from "@/models/IngredientImage";
import { ProduceGuideModel, type ProduceGuideDoc } from "@/models/ProduceGuide";
import { logError } from "./error-log";

// 產季不常變，半年才重新整理一次
const STALE_MS = 180 * 24 * 60 * 60 * 1000;

function cacheKey(location?: string, timezone?: string): string {
  return location
    ? `loc:${location.toLowerCase().replace(/[\s・·,，]+/g, " ").trim()}`
    : `tz:${timezone}`;
}

export type ProduceResult =
  | { ok: true; guide: ProduceGuide; fromCache: boolean }
  | { ok: false; status: number; error: string };

export async function getProduceGuide(
  { location, timezone }: { location?: string; timezone?: string },
  getClient: () => Promise<AIClient | Response>,
): Promise<ProduceResult | Response> {
  await connectDB();
  const key = cacheKey(location, timezone);

  const cached = await ProduceGuideModel.findOne({ key }).lean();
  if (cached && Date.now() - cached.updatedAt.getTime() < STALE_MS) {
    return { ok: true, guide: toGuide(cached), fromCache: true };
  }

  const ai = await getClient();
  if (ai instanceof Response) return ai;

  // 系統提示詞在後台的 Prompt CMS 編輯（produce.system）
  const data = await generateStructured(ai, {
    instructions: await getPrompt("produce.system"),
    input: location ? `我現在在：${location}` : `我所在的時區：${timezone}（請據此推估我所在的地區）`,
    schema: produceGuideSchema,
    name: "produce_guide",
  });
  if (!data) {
    return { ok: false, status: 502, error: "AI 沒有回傳資料，請再試一次" };
  }
  if (!data.valid || data.items.length === 0) {
    return { ok: false, status: 422, error: "找不到這個地點，請換個寫法，例如「日本・京都」" };
  }

  const items = data.items.map((item) => ({
    ...item,
    peakMonths: [...new Set(item.peakMonths)].sort((a, b) => a - b),
  }));
  const saved = await ProduceGuideModel.findOneAndUpdate(
    { key },
    { $set: { regionLabel: data.regionLabel, climateNote: data.climateNote, items } },
    { upsert: true, returnDocument: "after", runValidators: true },
  ).lean();

  // 先把英文名稱存進食材照片快取，找照片時就不用再翻譯
  await IngredientImageModel.bulkWrite(
    items.map((item) => ({
      updateOne: {
        filter: { key: ingredientKey(item.name) || item.name },
        update: { $setOnInsert: { englishName: item.englishName.trim().toLowerCase() } },
        upsert: true,
      },
    })),
  ).catch((error) => logError("database", "produce.englishNames", error));

  return { ok: true, guide: toGuide(saved!), fromCache: false };
}

function toGuide(doc: Pick<ProduceGuideDoc, "regionLabel" | "climateNote" | "items">): ProduceGuide {
  return {
    regionLabel: doc.regionLabel,
    climateNote: doc.climateNote ?? "",
    items: doc.items.map((item) => ({
      name: item.name,
      englishName: item.englishName ?? "",
      type: item.type,
      description: item.description ?? "",
      peakMonths: item.peakMonths ?? [],
      mainAreas: item.mainAreas ?? "",
      howToChoose: item.howToChoose ?? "",
      howToEat: item.howToEat ?? "",
    })),
  };
}
