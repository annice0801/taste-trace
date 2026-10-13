import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

// 每次 AI 推薦的紀錄：誰、在哪個類別、什麼心情與天氣、推薦了哪些菜
const searchHistorySchema = new Schema(
  {
    userId: { type: String, index: true }, // 未登入時為空
    category: { type: String, required: true, trim: true },
    mood: { type: String, trim: true },
    weather: {
      description: { type: String },
      temperature: { type: Number },
      apparentTemperature: { type: Number },
    },
    message: { type: String, trim: true }, // 主廚當次的回覆
    resultRecipes: [{ type: Schema.Types.ObjectId, ref: "Recipe" }],
    reasons: [{ type: String }], // 與 resultRecipes 同順序，每道菜的推薦理由
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

searchHistorySchema.index({ userId: 1, createdAt: -1 });
searchHistorySchema.index({ category: 1, createdAt: -1 });

export type SearchHistory = InferSchemaType<typeof searchHistorySchema>;

export const SearchHistoryModel: Model<SearchHistory> =
  (models.SearchHistory as Model<SearchHistory>) ??
  model<SearchHistory>("SearchHistory", searchHistorySchema);
