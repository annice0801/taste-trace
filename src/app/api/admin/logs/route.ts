import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { audit } from "@/lib/admin-ops";
import { connectDB } from "@/lib/mongodb";
import { ERROR_CATEGORIES, ErrorLogModel } from "@/models/ErrorLog";

const PAGE_SIZE = 50;
const categorySchema = z.enum(Object.keys(ERROR_CATEGORIES) as [string, ...string[]]);

// 錯誤日誌：依分類、處理狀態篩選；用 before 往前翻頁
export async function GET(request: Request) {
  const admin = await requireAdmin(request, "logs");
  if (admin instanceof Response) return admin;

  const url = new URL(request.url);
  const category = categorySchema.safeParse(url.searchParams.get("category")).data;
  const status = url.searchParams.get("status"); // open | resolved | all
  const before = url.searchParams.get("before");
  const filter = {
    ...(category && { category }),
    ...(status === "open" && { resolved: false }),
    ...(status === "resolved" && { resolved: true }),
    ...(before && !Number.isNaN(Date.parse(before)) && { createdAt: { $lt: new Date(before) } }),
  };

  await connectDB();
  const since = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000);
  const [logs, counts24h, counts7d] = await Promise.all([
    ErrorLogModel.find(filter).sort({ createdAt: -1 }).limit(PAGE_SIZE + 1).lean(),
    ErrorLogModel.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: since(24) } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]),
    ErrorLogModel.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: since(24 * 7) } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]),
  ]);

  return Response.json({
    logs: logs.slice(0, PAGE_SIZE).map((log) => ({
      id: log._id.toString(),
      category: log.category,
      scope: log.scope,
      message: log.message,
      status: log.status ?? null,
      meta: log.meta ?? null,
      resolved: Boolean(log.resolved),
      createdAt: log.createdAt.toISOString(),
    })),
    hasMore: logs.length > PAGE_SIZE,
    counts24h: Object.fromEntries(counts24h.map((row) => [row._id, row.count])),
    counts7d: Object.fromEntries(counts7d.map((row) => [row._id, row.count])),
  });
}

const patchSchema = z.object({
  ids: z.array(z.string().regex(/^[0-9a-f]{24}$/)).min(1).max(200),
  resolved: z.boolean(),
});

// 標記已處理／未處理（低風險，不需要二階段確認）
export async function PATCH(request: Request) {
  const admin = await requireAdmin(request, "logs");
  if (admin instanceof Response) return admin;
  const body = patchSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "請求格式錯誤" }, { status: 400 });

  await connectDB();
  const { modifiedCount } = await ErrorLogModel.updateMany(
    { _id: { $in: body.data.ids } },
    { $set: { resolved: body.data.resolved } },
  );
  await audit(admin, "logs.markResolved", body.data, `更新 ${modifiedCount} 筆`);
  return Response.json({ ok: true, modified: modifiedCount });
}
