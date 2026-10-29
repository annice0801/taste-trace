import "server-only";
import { generateStructured, type AIClient } from "./ai";
import { connectDB } from "./mongodb";
import { pickingGuideSchema, type PickingGuide } from "./picking";
import { getPrompt } from "./prompts";
import { ingredientKey } from "./quantity";
import { PickingGuideModel, type PickingGuideDoc } from "@/models/PickingGuide";

// 挑選方法不太會變，一年才重新整理一次
const STALE_MS = 365 * 24 * 60 * 60 * 1000;

export type PickingResult =
  | { ok: true; guide: PickingGuide; fromCache: boolean }
  | { ok: false; status: number; error: string };

export const pickingKey = (name: string) => ingredientKey(name) || name.trim();

// 只讀快取，不呼叫 AI（MCP 工具用）
export async function findPickingGuide(name: string): Promise<PickingGuide | null> {
  await connectDB();
  const doc = await PickingGuideModel.findOne({ key: pickingKey(name) }).lean();
  return doc ? toGuide(doc) : null;
}

export async function getPickingGuide(
  { name, englishName }: { name: string; englishName?: string },
  getClient: () => Promise<AIClient | Response>,
): Promise<PickingResult | Response> {
  await connectDB();
  const key = pickingKey(name);

  const cached = await PickingGuideModel.findOne({ key }).lean();
  if (cached && Date.now() - cached.updatedAt.getTime() < STALE_MS) {
    return { ok: true, guide: toGuide(cached), fromCache: true };
  }

  const ai = await getClient();
  if (ai instanceof Response) return ai;

  // 系統提示詞在後台的 Prompt CMS 編輯（produce.picking）
  const data = await generateStructured(ai, {
    instructions: await getPrompt("produce.picking"),
    input: englishName ? `蔬果：${name}（${englishName}）` : `蔬果：${name}`,
    schema: pickingGuideSchema,
    name: "picking_guide",
  });
  if (!data) {
    return { ok: false, status: 502, error: "AI 沒有回傳資料，請再試一次" };
  }
  if (!data.valid || data.senses.length === 0) {
    return { ok: false, status: 422, error: "這不像是蔬菜或水果的名稱，請換個寫法，例如「西瓜」" };
  }

  const guide: PickingGuide = {
    name: data.name,
    summary: data.summary,
    // 同一種感官只留第一筆，避免 AI 重複列出
    senses: data.senses.filter((s, i, all) => all.findIndex((x) => x.sense === s.sense) === i),
    goals: data.goals,
    ripening: data.ripening,
    storage: data.storage,
    myth: data.myth,
  };
  const saved = await PickingGuideModel.findOneAndUpdate(
    { key },
    { $set: guide },
    { upsert: true, returnDocument: "after", runValidators: true },
  ).lean();

  return { ok: true, guide: toGuide(saved!), fromCache: false };
}

function toGuide(doc: PickingGuideDoc): PickingGuide {
  return {
    name: doc.name,
    summary: doc.summary ?? "",
    senses: doc.senses.map(({ sense, good, avoid }) => ({ sense, good, avoid: avoid ?? "" })),
    goals: doc.goals.map(({ goal, tips }) => ({ goal, tips })),
    ripening: doc.ripening ?? "",
    storage: doc.storage ?? "",
    myth: doc.myth ?? "",
  };
}
