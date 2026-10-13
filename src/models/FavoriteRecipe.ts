import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";
import { FAVORITE_LABELS, keysOf, TASTE_NOTES } from "@/lib/recipe-tags";
import { foodAttributesSchema } from "./attributes";

const favoriteRecipeSchema = new Schema(
  {
    userId: { type: String, required: true }, // Better Auth 的 user.id
    recipe: { type: Schema.Types.ObjectId, ref: "Recipe", required: true },
    // 收藏當下複製一份類別與屬性，依屬性分類收藏時不必再 join Recipe
    category: { type: String, trim: true },
    attributes: { type: foodAttributesSchema, default: () => ({}) },
    folder: { type: String, trim: true }, // 自訂收藏夾，例：「週末大餐」
    labels: [{ type: String, enum: keysOf(FAVORITE_LABELS) }], // 收藏分類，例：成功做過、最愛
    tasteNotes: [{ type: String, enum: keysOf(TASTE_NOTES) }], // 隨手記：太甜、太鹹…
    rating: { type: Number, min: 1, max: 5 },
    personalNotes: { type: String, trim: true, maxlength: 200 }, // 隨手記的一行筆記
  },
  { timestamps: true },
);

favoriteRecipeSchema.index({ userId: 1, recipe: 1 }, { unique: true });
favoriteRecipeSchema.index({ userId: 1, createdAt: -1 });
favoriteRecipeSchema.index({ userId: 1, category: 1 });
favoriteRecipeSchema.index({ userId: 1, "attributes.cuisine": 1 });
favoriteRecipeSchema.index({ userId: 1, folder: 1 });
favoriteRecipeSchema.index({ userId: 1, labels: 1 });

export type FavoriteRecipe = InferSchemaType<typeof favoriteRecipeSchema>;

export const FavoriteRecipeModel: Model<FavoriteRecipe> =
  (models.FavoriteRecipe as Model<FavoriteRecipe>) ??
  model<FavoriteRecipe>("FavoriteRecipe", favoriteRecipeSchema);
