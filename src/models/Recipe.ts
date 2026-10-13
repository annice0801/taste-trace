import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";
import { foodAttributesSchema, INGREDIENT_CATEGORIES } from "./attributes";

export const SUBSTITUTION_REASONS = [
  "unavailable-locally", // 當地買不到
  "dietary", // 飲食限制
  "cost", // 價格考量
  "seasonal", // 季節性
  "preference", // 個人口味
] as const;

export const CORRECTION_TYPES = [
  "spelling", // 錯字
  "translation", // 翻譯錯誤或直譯
  "ambiguous", // 名稱模糊，可能指多種食材
  "unit", // 單位錯誤
  "quantity", // 份量不合理
] as const;

// 當地替換食材建議
const substitutionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    region: { type: String, trim: true }, // 適用地區，例：TW、JP、US
    ratio: { type: Number, default: 1 }, // 替換比例，1 表示等量
    reason: { type: String, enum: SUBSTITUTION_REASONS },
    flavorImpact: { type: String, trim: true }, // 對風味的影響說明
    notes: { type: String, trim: true },
    confidence: { type: Number, min: 0, max: 1 },
  },
  { _id: false },
);

// 食材名稱或份量的糾錯紀錄
const correctionSchema = new Schema(
  {
    type: { type: String, enum: CORRECTION_TYPES, required: true },
    original: { type: String, required: true }, // 修正前
    corrected: { type: String, required: true }, // 修正後
    reason: { type: String, trim: true },
    confidence: { type: Number, min: 0, max: 1 },
  },
  { _id: false },
);

const ingredientSchema = new Schema(
  {
    name: { type: String, required: true, trim: true }, // 顯示用名稱（已修正）
    originalText: { type: String, trim: true }, // 來源中的原始寫法，例：「2 cups cilantro」
    normalizedName: { type: String, trim: true, lowercase: true }, // 標準化名稱，供比對替換資料
    localNames: [
      {
        _id: false,
        region: { type: String, required: true },
        name: { type: String, required: true },
      },
    ], // 各地叫法，例：TW 香菜、CN 芫荽
    quantity: { type: Number, min: 0 },
    unit: { type: String, trim: true },
    amount: { type: String, trim: true }, // 份量原文，例：「200 公克」「1 大匙」（AI 產生的食譜用這個）
    category: { type: String, enum: INGREDIENT_CATEGORIES },
    isOptional: { type: Boolean, default: false },
    notes: { type: String, trim: true },
    corrections: [correctionSchema],
    substitutions: [substitutionSchema],
  },
  { _id: false },
);

// 只存網址與授權資訊，不存圖檔本身
const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    source: { type: String, enum: ["unsplash", "wikimedia", "openverse"], required: true },
    provider: { type: String }, // 照片實際所在的網站，例：Flickr
    author: { type: String },
    authorUrl: { type: String },
    sourceUrl: { type: String, required: true },
    license: { type: String },
    licenseUrl: { type: String },
  },
  { _id: false },
);

const stepSchema = new Schema(
  {
    order: { type: Number, required: true },
    instruction: { type: String, required: true },
    durationMinutes: { type: Number, min: 0 },
  },
  { _id: false },
);

// 名廚類別：大師精髓（核心科學原理與技法特徵）
const masterPrincipleSchema = new Schema(
  {
    summary: { type: String, trim: true },
    principles: [
      {
        _id: false,
        name: { type: String, required: true, trim: true },
        science: { type: String, required: true, trim: true },
      },
    ],
    techniques: [{ type: String, trim: true }],
  },
  { _id: false },
);

// 名廚類別：原版 → 現代家庭版的調整
const adaptationSchema = new Schema(
  {
    original: { type: String, required: true, trim: true },
    home: { type: String, required: true, trim: true },
    reason: { type: String, trim: true },
  },
  { _id: false },
);

const recipeSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, trim: true }, // 食譜類別 slug，對應 src/lib/categories.ts
    englishName: { type: String, trim: true }, // 找照片用的英文名稱
    imageKeywords: { type: String, trim: true }, // 找照片用的英文食材關鍵字，例：pasta shrimp lemon
    description: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
    image: { type: imageSchema },
    imageCheckedAt: { type: Date }, // 上次找照片的時間；找不到時避免每次都重找
    source: {
      type: {
        type: String,
        enum: ["web", "ai", "user"],
        default: "user",
      },
      url: { type: String, trim: true },
      name: { type: String, trim: true },
    },
    originRegion: { type: String, trim: true }, // 食譜發源地，例：TW、IT
    servings: { type: Number, min: 1 },
    prepTimeMinutes: { type: Number, min: 0 },
    cookTimeMinutes: { type: Number, min: 0 },
    totalTimeMinutes: { type: Number, min: 0 },
    attributes: { type: foodAttributesSchema, default: () => ({}) },
    ingredients: [ingredientSchema],
    steps: [stepSchema],
    tip: { type: String, trim: true }, // 主廚小撇步
    masterPrinciple: { type: masterPrincipleSchema }, // 只有名廚類別有
    adaptations: [adaptationSchema],
    detailGeneratedAt: { type: Date }, // 食材與做法產生的時間；沒有值代表還沒產生過
    tags: [{ type: String, trim: true }], // 自由標籤，例：AI 給的口味「鹹香」「微辣」
  },
  { timestamps: true },
);

recipeSchema.index({ title: "text", description: "text", tags: "text" });
// 同類別同菜名視為同一道菜，推薦時重複出現就沿用既有的食譜與做法
recipeSchema.index(
  { category: 1, title: 1 },
  { unique: true, partialFilterExpression: { category: { $type: "string" } } },
);
recipeSchema.index({ "attributes.cuisine": 1 });
recipeSchema.index({ "attributes.mealTypes": 1 });
recipeSchema.index({ "attributes.dietaryTags": 1 });
recipeSchema.index({ "ingredients.normalizedName": 1 });

export type Recipe = InferSchemaType<typeof recipeSchema>;

export const RecipeModel: Model<Recipe> =
  (models.Recipe as Model<Recipe>) ?? model<Recipe>("Recipe", recipeSchema);
