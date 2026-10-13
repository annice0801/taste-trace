import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { createConfirmToken, verifyConfirmToken } from "@/lib/admin-confirm";
import { audit, isOpName, OpError, OPS } from "@/lib/admin-ops";
import { logError } from "@/lib/error-log";

const bodySchema = z.object({
  action: z.string(),
  params: z.unknown(),
  phase: z.enum(["preview", "execute"]),
  token: z.string().optional(),
});

// 高風險操作的二階段確認：
//   phase=preview → 回傳影響範圍與確認憑證，不改任何資料
//   phase=execute → 驗證憑證（同一位管理員、同一個操作與參數、5 分鐘內）後才執行
export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success || !isOpName(body.data.action)) {
    return Response.json({ error: "請求格式錯誤" }, { status: 400 });
  }
  const { action, phase, token } = body.data;
  const op = OPS[action];
  const params = op.schema.safeParse(body.data.params ?? {});
  if (!params.success) {
    return Response.json({ error: "參數格式錯誤" }, { status: 400 });
  }

  try {
    if (phase === "preview") {
      // @ts-expect-error 各操作的參數型別不同，已經用對應的 schema 驗證過
      const preview = await op.preview(params.data);
      return Response.json({ preview, token: createConfirmToken(admin.id, action, params.data) });
    }

    const verified = verifyConfirmToken(token ?? "", admin.id, action, params.data);
    if (!verified.ok) {
      return Response.json({ error: verified.reason }, { status: 409 });
    }
    // @ts-expect-error 各操作的參數型別不同，已用對應的 schema 驗證
    const message: string = await op.execute(params.data, admin);
    await audit(admin, action, params.data, message);
    return Response.json({ ok: true, message });
  } catch (error) {
    if (error instanceof OpError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    void logError("database", `admin.${action}.${phase}`, error);
    return Response.json(
      { error: error instanceof Error ? error.message : "操作失敗" },
      { status: 500 },
    );
  }
}
