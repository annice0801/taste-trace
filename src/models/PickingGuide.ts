import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";
import { SENSES } from "@/lib/picking";

// 蔬果挑選標準：內容來自 data/picking-guides.json，用 npm run seed:picking 寫入
const pickingGuideSchema = new Schema(
  {
    key: { type: String, required: true, unique: true }, // ingredientKey(名稱)，例：「西瓜」
    name: { type: String, required: true },
    aliases: [{ type: String }], // 其他叫法的 ingredientKey
    englishNames: [{ type: String }], // 小寫英文名
    type: { type: String, enum: ["vegetable", "fruit"], required: true },
    summary: { type: String },
    senses: [
      {
        _id: false,
        sense: { type: String, enum: SENSES, required: true },
        good: { type: String, required: true },
        avoid: { type: String },
      },
    ],
    goals: [
      {
        _id: false,
        goal: { type: String, required: true },
        tips: [{ type: String }],
      },
    ],
    ripening: { type: String },
    storage: { type: String },
    myth: { type: String },
  },
  { timestamps: true },
);

pickingGuideSchema.index({ aliases: 1 });
pickingGuideSchema.index({ englishNames: 1 });

export type PickingGuideDoc = InferSchemaType<typeof pickingGuideSchema>;

export const PickingGuideModel: Model<PickingGuideDoc> =
  (models.PickingGuide as Model<PickingGuideDoc>) ??
  model<PickingGuideDoc>("PickingGuide", pickingGuideSchema);
