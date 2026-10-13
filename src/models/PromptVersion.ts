import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

// 給 AI 的系統提示詞版本：後台每次儲存就新增一個版本，active 的那個立即生效
const promptVersionSchema = new Schema(
  {
    key: { type: String, required: true }, // 例：recommend.system
    version: { type: Number, required: true },
    content: { type: String, required: true, maxlength: 20000 },
    note: { type: String, trim: true, maxlength: 200 }, // 這次改了什麼
    createdBy: { type: String },
    active: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

promptVersionSchema.index({ key: 1, version: -1 }, { unique: true });
promptVersionSchema.index({ key: 1, active: 1 });

export type PromptVersion = InferSchemaType<typeof promptVersionSchema>;

export const PromptVersionModel: Model<PromptVersion> =
  (models.PromptVersion as Model<PromptVersion>) ??
  model<PromptVersion>("PromptVersion", promptVersionSchema);
