import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

// 食材照片快取：同一種食材（例：洋蔥）全站只找一次照片，所有食譜共用
const ingredientImageSchema = new Schema(
  {
    key: { type: String, required: true, unique: true }, // 去掉括號說明的中文名稱，例：「洋蔥」
    englishName: { type: String, trim: true }, // 搜尋照片用的英文名稱
    image: {
      url: { type: String },
      author: { type: String },
      authorUrl: { type: String },
      sourceUrl: { type: String },
    },
    imageCheckedAt: { type: Date }, // 上次找照片的時間；找不到時避免每次重找
  },
  { timestamps: true },
);

export type IngredientImage = InferSchemaType<typeof ingredientImageSchema>;

export const IngredientImageModel: Model<IngredientImage> =
  (models.IngredientImage as Model<IngredientImage>) ??
  model<IngredientImage>("IngredientImage", ingredientImageSchema);
