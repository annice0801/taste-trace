import { getAIForRequest, openAIErrorResponse } from "@/lib/ai";
import { produceRequestSchema } from "@/lib/produce";
import { getProduceGuide } from "@/lib/produce-guide";

// 當季蔬果：POST { location?: 地名, timezone?: 瀏覽器時區 }
// 已整理過的地點直接從資料庫回傳；第一次查詢才呼叫 OpenAI
export async function POST(request: Request) {
  const parsed = produceRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  let userKey = false;
  try {
    const result = await getProduceGuide(parsed.data, async () => {
      const ai = await getAIForRequest(request);
      if ("error" in ai) return ai.error;
      userKey = ai.userKey;
      return ai;
    });
    if (result instanceof Response) return result;
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }
    return Response.json({ ...result.guide, fromCache: result.fromCache });
  } catch (error) {
    return openAIErrorResponse("produce", error, userKey);
  }
}
