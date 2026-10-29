import "server-only";
import { connectDB } from "./mongodb";
import type { PickingGuide, PickingIndexItem } from "./picking";
import { ingredientKey } from "./quantity";
import { PickingGuideModel, type PickingGuideDoc } from "@/models/PickingGuide";

// 蔬果挑選標準：只從資料庫讀取，不呼叫 AI

export const pickingKey = (name: string) => ingredientKey(name) || name.trim();

// 所有收錄的蔬果名稱（網站顯示「完整挑選標準」連結與搜尋建議用）
export async function listPickingGuides(): Promise<PickingIndexItem[]> {
  await connectDB();
  const docs = await PickingGuideModel.find({}, { name: 1, aliases: 1, englishNames: 1, type: 1 }).sort({ type: 1, name: 1 }).lean();
  return docs.map(({ name, aliases, englishNames, type }) => ({ name, aliases, englishNames, type }));
}

// 先比對中文名稱與其他叫法，找不到再用英文名稱
export async function findPickingGuide(name: string, englishName?: string): Promise<PickingGuide | null> {
  await connectDB();
  const key = pickingKey(name);
  const doc =
    (await PickingGuideModel.findOne({ $or: [{ key }, { aliases: key }] }).lean()) ??
    (englishName ? await PickingGuideModel.findOne({ englishNames: englishName.trim().toLowerCase() }).lean() : null);
  return doc ? toGuide(doc) : null;
}

function toGuide(doc: PickingGuideDoc): PickingGuide {
  return {
    name: doc.name,
    type: doc.type,
    summary: doc.summary ?? "",
    senses: doc.senses.map(({ sense, good, avoid }) => ({ sense, good, avoid: avoid ?? "" })),
    goals: doc.goals.map(({ goal, tips }) => ({ goal, tips })),
    ripening: doc.ripening ?? "",
    storage: doc.storage ?? "",
    myth: doc.myth ?? "",
  };
}
