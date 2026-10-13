import "server-only";
import { connectDB } from "./mongodb";
import { AppSettingModel } from "@/models/AppSetting";

// 後台可切換的預設 AI 模型；存在 MongoDB，改了不用重新部署
export const AI_PROVIDERS = { openai: "OpenAI", gemini: "Google Gemini" } as const;
export type AIProvider = keyof typeof AI_PROVIDERS;
export type ModelSetting = { provider: AIProvider; model: string };

export const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
export const DEFAULT_MODEL_SETTING: ModelSetting = { provider: "openai", model: DEFAULT_OPENAI_MODEL };
// Gemini 走 Google 提供的 OpenAI 相容端點，沿用同一套 SDK
export const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";

const SETTING_KEY = "ai.model";
// 多台伺服器時，其他台最慢 10 秒內讀到新設定
const CACHE_MS = 10_000;
let cache: { value: ModelSetting; at: number } | null = null;

function isModelSetting(value: unknown): value is ModelSetting {
  const v = value as ModelSetting | null;
  return Boolean(v && (v.provider === "openai" || v.provider === "gemini") && typeof v.model === "string" && v.model);
}

export async function getModelSetting(): Promise<ModelSetting> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  try {
    await connectDB();
    const doc = await AppSettingModel.findOne({ key: SETTING_KEY }).lean();
    const value = isModelSetting(doc?.value) ? doc.value : DEFAULT_MODEL_SETTING;
    cache = { value, at: Date.now() };
    return value;
  } catch {
    return cache?.value ?? DEFAULT_MODEL_SETTING; // 資料庫暫時不通時用上次的設定
  }
}

export async function setModelSetting(value: ModelSetting, updatedBy: string): Promise<void> {
  await connectDB();
  await AppSettingModel.updateOne(
    { key: SETTING_KEY },
    { $set: { value, updatedBy } },
    { upsert: true },
  );
  cache = { value, at: Date.now() };
}
