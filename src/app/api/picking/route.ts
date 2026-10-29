import { getAIForRequest, openAIErrorResponse } from "@/lib/ai";
import { pickingRequestSchema } from "@/lib/picking";
import { getPickingGuide } from "@/lib/picking-guide";

// 蔬果挑選標準：POST { name: 蔬果名稱, englishName?: 英文名稱 }
// 已整理過的蔬果直接從資料庫回傳；第一次查詢才呼叫 OpenAI
export async function POST(request: Request) {
  const parsed = pickingRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  let userKey = false;
  try {
    const result = await getPickingGuide(parsed.data, async () => {
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
    return openAIErrorResponse("picking", error, userKey);
  }
}
