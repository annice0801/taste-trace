import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";
import { PERMISSION_KEYS } from "@/lib/admin-permissions";

// 從後台新增的管理員（擁有者寫在 ADMIN_EMAILS，不在這裡）
const adminMemberSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    permissions: [{ type: String, enum: PERMISSION_KEYS }],
    note: { type: String, trim: true, maxlength: 100 }, // 備註，例：負責照片審核
    addedBy: { type: String },
  },
  { timestamps: true },
);

export type AdminMember = InferSchemaType<typeof adminMemberSchema>;

export const AdminMemberModel: Model<AdminMember> =
  (models.AdminMember as Model<AdminMember>) ?? model<AdminMember>("AdminMember", adminMemberSchema);
