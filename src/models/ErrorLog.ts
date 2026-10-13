import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

import { ERROR_CATEGORIES } from "@/lib/error-categories";

export { ERROR_CATEGORIES, type ErrorCategory } from "@/lib/error-categories";

const errorLogSchema = new Schema(
  {
    category: { type: String, enum: Object.keys(ERROR_CATEGORIES), required: true },
    scope: { type: String, required: true }, // 發生的地方，例：recommend、creations.upload
    message: { type: String, required: true, maxlength: 2000 },
    status: { type: Number }, // 外部服務的 HTTP 狀態碼
    meta: { type: Schema.Types.Mixed }, // 排錯用的補充資料（不含金鑰與個資）
    resolved: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

errorLogSchema.index({ createdAt: -1 });
errorLogSchema.index({ category: 1, createdAt: -1 });
// 只保留 30 天
errorLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60, name: "ttl_30d" });

export type ErrorLog = InferSchemaType<typeof errorLogSchema>;

export const ErrorLogModel: Model<ErrorLog> =
  (models.ErrorLog as Model<ErrorLog>) ?? model<ErrorLog>("ErrorLog", errorLogSchema);
