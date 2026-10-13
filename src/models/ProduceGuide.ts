import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

// 各地當季蔬果的快取：同一個地點全站只請 AI 整理一次
const produceItemSchema = new Schema(
  {
    name: { type: String, required: true },
    englishName: { type: String },
    type: { type: String, enum: ["vegetable", "fruit"], required: true },
    description: { type: String },
    peakMonths: [{ type: Number, min: 1, max: 12 }],
    mainAreas: { type: String },
    howToChoose: { type: String },
    howToEat: { type: String },
  },
  { _id: false },
);

const produceGuideSchema = new Schema(
  {
    key: { type: String, required: true, unique: true }, // 「loc:台灣」或「tz:Asia/Taipei」
    regionLabel: { type: String, required: true },
    climateNote: { type: String },
    items: [produceItemSchema],
  },
  { timestamps: true },
);

export type ProduceGuideDoc = InferSchemaType<typeof produceGuideSchema>;

export const ProduceGuideModel: Model<ProduceGuideDoc> =
  (models.ProduceGuide as Model<ProduceGuideDoc>) ??
  model<ProduceGuideDoc>("ProduceGuide", produceGuideSchema);
