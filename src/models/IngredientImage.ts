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
      source: { type: String, enum: ["unsplash", "custom"] }, // 舊資料沒有這個欄位，視為 unsplash
      author: { type: String },
      authorUrl: { type: String },
      sourceUrl: { type: String },
      license: { type: String }, // 管理員上傳時填的授權，例：自行拍攝、CC BY 4.0
      pathname: { type: String }, // 管理員上傳的照片在 Blob 內的路徑
    },
    manual: { type: Boolean }, // 管理員手動上傳，自動搜尋與檢查都不會覆蓋
    imageCheckedAt: { type: Date }, // 上次找照片的時間；找不到時避免每次重找
  },
  { timestamps: true },
);

export type IngredientImage = InferSchemaType<typeof ingredientImageSchema>;

export const IngredientImageModel: Model<IngredientImage> =
  (models.IngredientImage as Model<IngredientImage>) ??
  model<IngredientImage>("IngredientImage", ingredientImageSchema);
