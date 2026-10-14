import "server-only";
import { canAccess, PERMISSION_KEYS, type AdminInfo, type AdminPermission } from "./admin-permissions";
import { getCurrentUser, getUserFromRequest } from "./auth";
import { connectDB } from "./mongodb";
import { AdminMemberModel } from "@/models/AdminMember";

// 擁有者名單：.env.local 的 ADMIN_EMAILS（逗號分隔），擁有全部權限，不能從後台移除
function ownerEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .replace(/^["']|["']$/g, "")
      .split(",")
      // 去掉多餘的空白與引號（例如從 .env.local 複製到 Vercel 時連引號一起貼上）
      .map((email) => email.trim().replace(/^["']|["']$/g, "").trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  return Boolean(email && ownerEmails().has(email.toLowerCase()));
}

export function listOwnerEmails(): string[] {
  return [...ownerEmails()];
}

// 擁有者或後台新增的管理員
export async function isAnyAdminEmail(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  if (isOwnerEmail(email)) return true;
  await connectDB();
  return Boolean(await AdminMemberModel.exists({ email: email.toLowerCase() }));
}

export type Admin = AdminInfo;

async function resolveAdmin(user: { id: string; email: string; name: string } | null): Promise<Admin | null> {
  if (!user?.email) return null;
  if (isOwnerEmail(user.email)) {
    return { id: user.id, email: user.email, name: user.name, isOwner: true, permissions: [...PERMISSION_KEYS] };
  }
  await connectDB();
  const member = await AdminMemberModel.findOne({ email: user.email.toLowerCase() }).lean();
  if (!member) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isOwner: false,
    permissions: (member.permissions ?? []) as AdminPermission[],
  };
}

// Server Component 用：不是管理員回傳 null
export async function getAdmin(): Promise<Admin | null> {
  return resolveAdmin(await getCurrentUser());
}

// 後台 API 用：不是管理員回 404（不透露後台存在）；是管理員但沒有這項權限回 403
export async function requireAdmin(
  request: Request,
  need: AdminPermission | "owner" | null = null,
): Promise<Admin | Response> {
  const admin = await resolveAdmin(await getUserFromRequest(request));
  if (!admin) return Response.json({ error: "Not found" }, { status: 404 });
  if (!canAccess(admin, need)) {
    return Response.json({ error: "你沒有這項功能的權限，請聯絡網站擁有者" }, { status: 403 });
  }
  return admin;
}
