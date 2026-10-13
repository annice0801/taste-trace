import "server-only";
import OpenAI from "openai";
import { zodResponseFormat, zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";
import {
  DEFAULT_OPENAI_MODEL,
  GEMINI_BASE_URL,
  getModelSetting,
  type AIProvider,
} from "./ai-settings";
import type { Category } from "./categories";
import { logError } from "./error-log";
import { isValidKeyFormat, KEY_ERROR_CODES, OPENAI_KEY_HEADER } from "./openai-key";
import { getPrompt } from "./prompts";

// 推薦菜單、做法、當季蔬果共用的 AI 設定

// 推薦菜單不需要深度推理，調低思考程度以加快回應
export const REASONING = { effort: "low" } as const;

export type AIClient = {
  client: OpenAI;
  provider: AIProvider;
  model: string;
  userKey: boolean; // 是否使用使用者自己的 OpenAI 金鑰
};

const serverClients = new Map<string, OpenAI>();

function serverClient(provider: AIProvider): OpenAI | null {
  const apiKey = provider === "gemini" ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  let client = serverClients.get(provider);
  if (!client) {
    client = new OpenAI({ apiKey, ...(provider === "gemini" && { baseURL: GEMINI_BASE_URL }) });
    serverClients.set(provider, client);
  }
  return client;
}

// 決定這次請求用哪個模型：
// 1. 使用者在瀏覽器設定了自己的 OpenAI 金鑰 → 用他的金鑰（後台選的是 Gemini 時改用預設 OpenAI 模型）
// 2. 否則用後台選的預設模型與伺服器的金鑰；Gemini 沒設定金鑰時退回 OpenAI
export async function getAIForRequest(request: Request): Promise<AIClient | { error: Response }> {
  const setting = await getModelSetting();
  const userKey = request.headers.get(OPENAI_KEY_HEADER)?.trim();
  if (userKey) {
    if (!isValidKeyFormat(userKey)) {
      return {
        error: Response.json(
          { error: "OpenAI 金鑰格式不正確，請重新貼上", code: KEY_ERROR_CODES.invalid },
          { status: 400 },
        ),
      };
    }
    return {
      client: new OpenAI({ apiKey: userKey }),
      provider: "openai",
      model: setting.provider === "openai" ? setting.model : DEFAULT_OPENAI_MODEL,
      userKey: true,
    };
  }

  const preferred = serverClient(setting.provider);
  if (preferred) {
    return { client: preferred, provider: setting.provider, model: setting.model, userKey: false };
  }
  if (setting.provider === "gemini") {
    void logError("ai", "ai.gemini", new Error("後台選了 Gemini，但伺服器沒有設定 GEMINI_API_KEY，改用 OpenAI"));
  }
  const fallback = serverClient("openai");
  if (fallback) {
    return { client: fallback, provider: "openai", model: DEFAULT_OPENAI_MODEL, userKey: false };
  }

  return {
    error: Response.json(
      { error: "請先設定你的 OpenAI API 金鑰", code: KEY_ERROR_CODES.missing },
      { status: 401 },
    ),
  };
}

// 依模型供應商產生結構化回應：OpenAI 用 Responses API，Gemini 用相容的 Chat Completions
export async function generateStructured<T extends z.ZodType>(
  ai: AIClient,
  {
    instructions,
    input,
    schema,
    name,
    reasoning = REASONING,
  }: {
    instructions: string;
    input: string;
    schema: T;
    name: string;
    reasoning?: { effort: "none" | "low" | "medium" | "high" };
  },
): Promise<z.infer<T> | null> {
  if (ai.provider === "openai") {
    const response = await ai.client.responses.parse({
      model: ai.model,
      instructions,
      input,
      reasoning,
      text: { format: zodTextFormat(schema, name) },
    });
    return response.output_parsed as z.infer<T> | null;
  }
  const completion = await ai.client.chat.completions.parse({
    model: ai.model,
    messages: [
      { role: "system", content: instructions },
      { role: "user", content: input },
    ],
    response_format: zodResponseFormat(schema, name),
  });
  return (completion.choices[0]?.message.parsed ?? null) as z.infer<T> | null;
}

// 主廚人設；名廚類別另外加上後台可編輯的「名廚視角規範」
export async function personaInstructions(category: Category): Promise<string> {
  const { persona } = category;
  const guardrails = category.chef ? await getPrompt("chef.guardrails") : "";
  return [
    `你的身分：${persona.title}「${persona.name}」。`,
    persona.style,
    guardrails,
    "全程使用繁體中文，語氣維持上述人設。",
  ]
    .filter(Boolean)
    .join("\n");
}

export function openAIErrorResponse(scope: string, error: unknown, userKey: boolean): Response {
  const status = error instanceof OpenAI.APIError ? error.status : undefined;
  // 日誌會自動遮掉錯誤訊息裡的金鑰片段
  void logError("ai", scope, error, {
    code: error instanceof OpenAI.APIError ? error.code : undefined,
    userKey,
  });

  if (status === 401) {
    return Response.json(
      userKey
        ? { error: "你的 OpenAI 金鑰無效或已被停用，請重新設定", code: KEY_ERROR_CODES.invalid }
        : { error: "伺服器的 AI 金鑰無效" },
      { status: 401 },
    );
  }
  return Response.json(
    {
      error:
        status === 429
          ? userKey
            ? "你的 OpenAI 帳戶額度不足或請求太頻繁，請到 OpenAI 後台確認"
            : "AI 額度不足或請求太頻繁，請稍後再試"
          : "AI 暫時無法使用，請稍後再試",
    },
    { status: 502 },
  );
}
