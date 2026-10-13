import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

// 匿名的使用行為事件（不記錄使用者），用來算標籤的點擊率
//   recipe_impression：推薦結果顯示了這道菜
//   recipe_open：使用者點開這道菜的食材與做法
export const EVENT_TYPES = ["recipe_impression", "recipe_open"] as const;

const analyticsEventSchema = new Schema(
  {
    type: { type: String, enum: EVENT_TYPES, required: true },
    category: { type: String },
    recipeId: { type: Schema.Types.ObjectId, ref: "Recipe" },
    tags: [{ type: String }],
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

analyticsEventSchema.index({ type: 1, createdAt: -1 });
// 保留 180 天
analyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60, name: "ttl_180d" });

export type AnalyticsEvent = InferSchemaType<typeof analyticsEventSchema>;

export const AnalyticsEventModel: Model<AnalyticsEvent> =
  (models.AnalyticsEvent as Model<AnalyticsEvent>) ??
  model<AnalyticsEvent>("AnalyticsEvent", analyticsEventSchema);
