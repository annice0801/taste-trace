import OpenAI from "openai";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { audit } from "@/lib/admin-ops";
import { generateStructured } from "@/lib/ai";
import {
  AI_PROVIDERS,
  DEFAULT_OPENAI_MODEL,
  GEMINI_BASE_URL,
  getModelSetting,
  setModelSetting,
  type AIProvider,
} from "@/lib/ai-settings";

function clientFor(provider: AIProvider): OpenAI | null {
  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY;
    return apiKey ? new OpenAI({ apiKey, baseURL: GEMINI_BASE_URL }) : null;
  }
  const apiKey = process.env.OPENAI_API_KEY;
  return apiKey ? new OpenAI({ apiKey }) : null;
}

// 從供應商即時讀取可用的文字模型，不寫死型號
async function listModels(provider: AIProvider): Promise<string[]> {
  const client = clientFor(provider);
  if (!client) return [];
  const ids: string[] = [];
  for await (const model of client.models.list()) ids.push(model.id.replace(/^models\//, ""));
  const pattern = provider === "gemini" ? /^gemini-/ : /^(gpt-|o\d)/;
  const excluded = /(audio|realtime|transcribe|tts|image|search|embedding|instruct|moderation|live|vision)/;
  // gpt 系列排前面，同系列新的在前
  return ids
    .filter((id) => pattern.test(id) && !excluded.test(id))
    .sort((a, b) => Number(b.startsWith("gpt-")) - Number(a.startsWith("gpt-")) || b.localeCompare(a));
}

// 目前的預設模型，以及兩家供應商可以選的模型
export async function GET(request: Request) {
  const admin = await requireAdmin(request, "prompts");
  if (admin instanceof Response) return admin;

  const [current, openai, gemini] = await Promise.all([
    getModelSetting(),
    listModels("openai").catch(() => null),
    listModels("gemini").catch(() => null),
  ]);
  return Response.json({
    current,
    defaultOpenAIModel: DEFAULT_OPENAI_MODEL,
    providers: (Object.keys(AI_PROVIDERS) as AIProvider[]).map((provider) => ({
      provider,
      label: AI_PROVIDERS[provider],
      configured: Boolean(clientFor(provider)),
      models: provider === "openai" ? openai : gemini, // null 代表讀取模型清單失敗
    })),
  });
}

const bodySchema = z.object({
  provider: z.enum(["openai", "gemini"]),
  model: z.string().trim().min(1).max(100),
});

const testSchema = z.object({ ok: z.boolean(), dish: z.string() });

// 切換前先用這個模型實際產生一次結構化回應，成功才儲存，避免換成不能用的模型
export async function POST(request: Request) {
  const admin = await requireAdmin(request, "prompts");
  if (admin instanceof Response) return admin;
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "請求格式錯誤" }, { status: 400 });
  const { provider, model } = body.data;

  const client = clientFor(provider);
  if (!client) {
    return Response.json(
      { error: provider === "gemini" ? "伺服器沒有設定 GEMINI_API_KEY" : "伺服器沒有設定 OPENAI_API_KEY" },
      { status: 422 },
    );
  }

  const started = Date.now();
  try {
    const result = await generateStructured(
      { client, provider, model, userKey: false },
      {
        instructions: "這是連線測試。ok 回答 true，dish 回答一道台灣家常菜的名稱。",
        input: "測試",
        schema: testSchema,
        name: "connection_test",
      },
    );
    if (!result?.ok) throw new Error("模型沒有回傳正確的結構化資料");
  } catch (error) {
    const message = error instanceof Error ? error.message : "測試失敗";
    return Response.json({ error: `測試失敗，未切換：${message.slice(0, 300)}` }, { status: 422 });
  }

  await setModelSetting({ provider, model }, admin.email);
  const elapsed = Date.now() - started;
  await audit(admin, "model.switch", { provider, model }, `切換為 ${AI_PROVIDERS[provider]} ${model}（測試 ${elapsed}ms）`);
  return Response.json({ ok: true, elapsedMs: elapsed });
}
