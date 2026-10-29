import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";
import { SENSES } from "@/lib/picking";

// 蔬果挑選標準的快取：同一種蔬果全站只請 AI 整理一次
const pickingGuideSchema = new Schema(
  {
    key: { type: String, required: true, unique: true }, // ingredientKey(名稱)，例：「西瓜」
    name: { type: String, required: true },
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

export type PickingGuideDoc = InferSchemaType<typeof pickingGuideSchema>;

export const PickingGuideModel: Model<PickingGuideDoc> =
  (models.PickingGuide as Model<PickingGuideDoc>) ??
  model<PickingGuideDoc>("PickingGuide", pickingGuideSchema);
