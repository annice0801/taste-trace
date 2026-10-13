import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

// 系統設定（鍵值），例：預設 AI 模型
const appSettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed },
    updatedBy: { type: String },
  },
  { timestamps: true },
);

export type AppSetting = InferSchemaType<typeof appSettingSchema>;

export const AppSettingModel: Model<AppSetting> =
  (models.AppSetting as Model<AppSetting>) ?? model<AppSetting>("AppSetting", appSettingSchema);
