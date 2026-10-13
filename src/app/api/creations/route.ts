import { z } from "zod";
import { getUserIdFromRequest } from "@/lib/auth";
import {
  deleteCreation,
  listRecipeCreations,
  updateCreation,
  uploadCreation,
} from "@/lib/creations";
import { addFavorite, findRecipe } from "@/lib/recipes";
import {
  creationUpdateSchema,
  creationUploadSchema,
  MAX_UPLOAD_BYTES,
  UPLOAD_TYPES,
} from "@/lib/recommendation";
import { logError } from "@/lib/error-log";

// 檢查檔頭，確認真的是 JPEG / PNG / WebP，而不是改了副檔名的其他檔案
async function hasImageSignature(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.slice(start, end));
  switch (file.type) {
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return ascii(1, 4) === "PNG";
    case "image/webp":
      return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
    default:
      return false;
  }
}

const recipeIdSchema = z.string().regex(/^[0-9a-f]{24}$/);

// 食譜頁的「大家的作品」：公開作品 + 自己的作品（未登入只看得到公開的）
export async function GET(request: Request) {
  const parsed = recipeIdSchema.safeParse(new URL(request.url).searchParams.get("recipeId"));
  if (!parsed.success) {
    return Response.json({ error: "請求格式錯誤" }, { status: 400 });
  }
  try {
    const viewerId = await getUserIdFromRequest(request);
    const creations = await listRecipeCreations(parsed.data, viewerId);
    return Response.json({ creations, signedIn: Boolean(viewerId) });
  } catch (error) {
    logError("database", "creations.list", error);
    return Response.json({ error: "暫時無法載入作品" }, { status: 500 });
  }
}

// 上傳作品照（multipart/form-data：file、recipeId、caption、note、visibility、width、height、markCooked）
export async function POST(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return Response.json({ error: "請先登入" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const parsed = creationUploadSchema.safeParse(
    form && Object.fromEntries([...form.entries()].filter(([, value]) => typeof value === "string")),
  );
  if (!parsed.success || !(file instanceof File)) {
    return Response.json({ error: "請求格式錯誤" }, { status: 400 });
  }
  if (!(UPLOAD_TYPES as readonly string[]).includes(file.type) || !(await hasImageSignature(file))) {
    return Response.json({ error: "只能上傳 JPG、PNG 或 WebP 照片" }, { status: 415 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json({ error: "照片太大，請小於 4MB" }, { status: 413 });
  }

  try {
    // 從食譜頁直接上傳時，還沒收藏的食譜先自動收藏
    const recipe = await findRecipe(parsed.data.recipeId);
    if (!recipe) {
      return Response.json({ error: "找不到這道食譜" }, { status: 404 });
    }
    await addFavorite(userId, recipe);

    const result = await uploadCreation({
      userId,
      file,
      ...parsed.data,
      markCooked: parsed.data.markCooked === "true",
    });
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }
    return Response.json({ creation: result.creation });
  } catch (error) {
    logError("blob", "creations.upload", error, { recipeId: parsed.data.recipeId });
    return Response.json({ error: "上傳失敗，請稍後再試" }, { status: 500 });
  }
}

// 修改過程說明、私人備註或公開設定
export async function PATCH(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return Response.json({ error: "請先登入" }, { status: 401 });
  }
  const parsed = creationUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "請求格式錯誤" }, { status: 400 });
  }
  try {
    const creation = await updateCreation(userId, parsed.data);
    if (!creation) {
      return Response.json({ error: "找不到這張作品照" }, { status: 404 });
    }
    return Response.json({ creation });
  } catch (error) {
    logError("database", "creations.update", error);
    return Response.json({ error: "儲存失敗，請稍後再試" }, { status: 500 });
  }
}

const deleteSchema = z.object({ id: recipeIdSchema });

// 刪除作品照
export async function DELETE(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return Response.json({ error: "請先登入" }, { status: 401 });
  }
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  try {
    const deleted = await deleteCreation(userId, parsed.data.id);
    if (!deleted) {
      return Response.json({ error: "找不到這張作品照" }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    logError("blob", "creations.delete", error);
    return Response.json({ error: "刪除失敗，請稍後再試" }, { status: 500 });
  }
}
