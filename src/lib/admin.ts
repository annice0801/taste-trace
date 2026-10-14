import "server-only";
import { getCurrentUser, getUserFromRequest } from "./auth";

// 管理員名單：.env.local 的 ADMIN_EMAILS（逗號分隔），必須用這些 Google 帳號登入
function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .replace(/^["']|["']$/g, "")
      .split(",")
      // 去掉多餘的空白與引號（例如從 .env.local 複製到 Vercel 時連引號一起貼上）
      .map((email) => email.trim().replace(/^["']|["']$/g, "").trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email && adminEmails().has(email.toLowerCase()));
}

export type Admin = { id: string; email: string; name: string };

// Server Component 用：不是管理員回傳 null
export async function getAdmin(): Promise<Admin | null> {
  const user = await getCurrentUser();
  return user && isAdminEmail(user.email) ? { id: user.id, email: user.email, name: user.name } : null;
}

// 後台 API 用：不是管理員時回傳 404（不透露後台存在）
export async function requireAdmin(request: Request): Promise<Admin | Response> {
  const user = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return { id: user.id, email: user.email, name: user.name };
}
