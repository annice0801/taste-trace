import OpenAI from "openai";
import { DEFAULT_OPENAI_MODEL as MODEL } from "@/lib/ai-settings";
import { isValidKeyFormat, OPENAI_KEY_HEADER } from "@/lib/openai-key";

// 驗證使用者貼上的金鑰：查詢模型資訊（不產生內容、不花 token），金鑰不儲存也不記錄
export async function POST(request: Request) {
  const key = request.headers.get(OPENAI_KEY_HEADER)?.trim() ?? "";
  if (!isValidKeyFormat(key)) {
    return Response.json(
      { ok: false, error: "格式不正確，OpenAI 金鑰應該是 sk- 開頭" },
      { status: 400 },
    );
  }

  try {
    await new OpenAI({ apiKey: key }).models.retrieve(MODEL);
    return Response.json({ ok: true });
  } catch (error) {
    const status = error instanceof OpenAI.APIError ? error.status : undefined;
    return Response.json(
      {
        ok: false,
        error:
          status === 401
            ? "OpenAI 回報這把金鑰無效或已被停用"
            : status === 403 || status === 404
              ? `這把金鑰無法使用 ${MODEL} 模型，請確認專案權限`
              : "暫時無法驗證，請稍後再試",
      },
      { status: status === 401 ? 401 : 400 },
    );
  }
}
