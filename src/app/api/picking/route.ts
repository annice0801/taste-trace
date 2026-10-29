import { z } from "zod";
import { MAX_PRODUCE_NAME_LENGTH } from "@/lib/picking";
import { findPickingGuide, listPickingGuides } from "@/lib/picking-guide";
import { logError } from "@/lib/error-log";

// 蔬果挑選標準（只讀資料庫，不呼叫 AI，不需要金鑰）
// GET /api/picking                      → 所有收錄的蔬果名稱
// GET /api/picking?name=西瓜&en=watermelon → 一種蔬果的挑選標準
const querySchema = z.object({
  name: z.string().trim().min(1).max(MAX_PRODUCE_NAME_LENGTH),
  en: z.string().trim().max(40).optional(),
});

// 內容只在重新匯入時才會變，讓 CDN 快取 10 分鐘
const CACHE_HEADERS = { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400" };

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  try {
    if (!params.has("name")) {
      return Response.json({ items: await listPickingGuides() }, { headers: CACHE_HEADERS });
    }
    const parsed = querySchema.safeParse({ name: params.get("name"), en: params.get("en") ?? undefined });
    if (!parsed.success) {
      return Response.json({ error: "請求格式錯誤" }, { status: 400 });
    }
    const guide = await findPickingGuide(parsed.data.name, parsed.data.en);
    if (!guide) {
      return Response.json({ error: "還沒有收錄這種蔬果的挑選方法" }, { status: 404 });
    }
    return Response.json(guide, { headers: CACHE_HEADERS });
  } catch (error) {
    await logError("database", "picking", error);
    return Response.json({ error: "暫時無法載入，請稍後再試" }, { status: 500 });
  }
}
