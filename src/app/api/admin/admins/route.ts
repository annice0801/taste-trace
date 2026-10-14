import mongoose from "mongoose";
import { listOwnerEmails, requireAdmin } from "@/lib/admin";
import { connectDB } from "@/lib/mongodb";
import { AdminMemberModel } from "@/models/AdminMember";

// 管理員名單：擁有者（ADMIN_EMAILS）與後台新增的管理員；只有擁有者能看
export async function GET(request: Request) {
  const admin = await requireAdmin(request, "owner");
  if (admin instanceof Response) return admin;

  await connectDB();
  const members = await AdminMemberModel.find().sort({ createdAt: 1 }).lean();
  const owners = listOwnerEmails();
  const emails = [...owners, ...members.map((m) => m.email)];
  // 對照有沒有登入過（Better Auth 的 user），顯示名稱
  const users = await mongoose.connection
    .db!.collection<{ email?: string; name?: string }>("user")
    .find({ email: { $in: emails.flatMap((e) => [e, e.toLowerCase()]) } }, { projection: { email: 1, name: 1 } })
    .toArray();
  const nameByEmail = new Map(users.map((u) => [String(u.email).toLowerCase(), u.name ?? ""]));

  return Response.json({
    owners: owners.map((email) => ({ email, name: nameByEmail.get(email) ?? "" })),
    members: members.map((m) => ({
      email: m.email,
      name: nameByEmail.get(m.email) ?? "",
      signedUp: nameByEmail.has(m.email),
      permissions: m.permissions ?? [],
      note: m.note ?? "",
      addedBy: m.addedBy ?? "",
      createdAt: m.createdAt.toISOString(),
    })),
  });
}
