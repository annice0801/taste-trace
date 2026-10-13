import { z } from "zod";
import { getAIForRequest } from "@/lib/ai";
import { resolveIngredientImages } from "@/lib/ingredient-images";
import { logError } from "@/lib/error-log";

const bodySchema = z.object({
  names: z.array(z.string().trim().min(1).max(60)).min(1).max(40),
});

// 食材卡片的照片：每種食材全站只找一次（Unsplash），找不到就顯示文字卡
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  // 翻譯食材名稱需要 OpenAI；沒有可用金鑰時只回傳已經找過的照片
  const ai = await getAIForRequest(request);
  try {
    const result = await resolveIngredientImages(
      parsed.data.names,
      "error" in ai ? null : ai,
    );
    return Response.json(result);
  } catch (error) {
    logError("database", "ingredient-images", error);
    return Response.json({ error: "取得食材照片失敗" }, { status: 500 });
  }
}
