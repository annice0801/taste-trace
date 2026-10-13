import { z } from "zod";
import { getUserIdFromRequest } from "@/lib/auth";
import {
  addFavorite,
  findRecipe,
  removeFavorite,
  updateFavorite,
} from "@/lib/recipes";
import { favoriteUpdateSchema } from "@/lib/recommendation";

const bodySchema = z.object({
  recipeId: z.string().regex(/^[0-9a-f]{24}$/),
});

async function parseRequest(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return { error: Response.json({ error: "請先登入" }, { status: 401 }) };
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return { error: Response.json({ error: "請求格式錯誤" }, { status: 400 }) };
  }
  return { userId, recipeId: parsed.data.recipeId };
}

// 收藏食譜
export async function POST(request: Request) {
  const result = await parseRequest(request);
  if ("error" in result) return result.error;

  const recipe = await findRecipe(result.recipeId);
  if (!recipe) {
    return Response.json({ error: "找不到這道食譜" }, { status: 404 });
  }

  await addFavorite(result.userId, recipe);
  return Response.json({ saved: true });
}

// 取消收藏
export async function DELETE(request: Request) {
  const result = await parseRequest(request);
  if ("error" in result) return result.error;

  await removeFavorite(result.userId, result.recipeId);
  return Response.json({ saved: false });
}

// 更新收藏分類與隨手記
export async function PATCH(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return Response.json({ error: "請先登入" }, { status: 401 });
  }
  const parsed = favoriteUpdateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return Response.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const updated = await updateFavorite(userId, parsed.data);
  if (!updated) {
    return Response.json({ error: "找不到這筆收藏" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
