import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

// 後台操作紀錄：誰在什麼時候做了什麼（刪除、停權、改 Prompt、換模型）
const adminAuditSchema = new Schema(
  {
    adminEmail: { type: String, required: true },
    action: { type: String, required: true },
    params: { type: Schema.Types.Mixed },
    result: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

adminAuditSchema.index({ createdAt: -1 });

export type AdminAudit = InferSchemaType<typeof adminAuditSchema>;

export const AdminAuditModel: Model<AdminAudit> =
  (models.AdminAudit as Model<AdminAudit>) ?? model<AdminAudit>("AdminAudit", adminAuditSchema);
