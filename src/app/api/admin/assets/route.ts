import { requireAdmin } from "@/lib/admin";
import { findOrphanBlobs } from "@/lib/blob-assets";
import { logError } from "@/lib/error-log";

// 儲存健康：Blob 檔案總數與容量，以及沒有被資料庫引用的孤兒檔案
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;

  try {
    const { all, orphans } = await findOrphanBlobs();
    const sum = (files: typeof all) => files.reduce((total, file) => total + file.size, 0);
    return Response.json({
      totalCount: all.length,
      totalBytes: sum(all),
      orphanCount: orphans.length,
      orphanBytes: sum(orphans),
      orphans: orphans
        .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
        .slice(0, 500),
    });
  } catch (error) {
    void logError("blob", "admin.assets", error);
    return Response.json({ error: "讀取 Blob 檔案清單失敗" }, { status: 502 });
  }
}
