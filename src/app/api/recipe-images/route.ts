import { z } from "zod";
import { resolveRecipeImages } from "@/lib/recipes";
import { logError } from "@/lib/error-log";

const bodySchema = z.object({
  recipeIds: z.array(z.string().regex(/^[0-9a-f]{24}$/)).min(1).max(10),
});

// 推薦卡片顯示後再補照片，不拖慢推薦本身；每道菜只會找一次，結果存在資料庫
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  try {
    const images = await resolveRecipeImages(parsed.data.recipeIds);
    return Response.json({ images });
  } catch (error) {
    logError("image-search", "recipe-images", error);
    return Response.json({ error: "取得照片失敗" }, { status: 500 });
  }
}
