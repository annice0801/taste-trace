import { Schema } from "mongoose";
import {
  keysOf,
  MAIN_INGREDIENTS,
  ROLES,
  SCENES,
} from "@/lib/recipe-tags";

// 食物屬性：食譜、收藏、搜尋篩選共用同一組欄位，方便依屬性分類與查詢

export const MEAL_TYPES = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "dessert",
  "drink",
] as const;

export const DIETARY_TAGS = [
  "vegetarian", // 蛋奶素
  "vegan", // 全素
  "pescatarian", // 海鮮素
  "gluten-free",
  "dairy-free",
  "nut-free",
  "low-carb",
  "high-protein",
  "halal",
] as const;

export const FLAVORS = [
  "sweet",
  "salty",
  "sour",
  "spicy",
  "umami",
  "bitter",
  "savory",
] as const;

export const COOKING_METHODS = [
  "stir-fry",
  "deep-fry",
  "pan-fry",
  "boil",
  "steam",
  "braise",
  "roast",
  "bake",
  "grill",
  "raw",
] as const;

export const INGREDIENT_CATEGORIES = [
  "meat",
  "poultry",
  "seafood",
  "egg",
  "dairy",
  "tofu-soy",
  "vegetable",
  "fruit",
  "grain",
  "noodle",
  "legume",
  "nut-seed",
  "herb",
  "spice",
  "sauce-condiment",
  "oil-fat",
  "other",
] as const;

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;

export const foodAttributesSchema = new Schema(
  {
    cuisine: { type: String, trim: true }, // 例：taiwanese、japanese、italian
    mealTypes: [{ type: String, enum: MEAL_TYPES }],
    dietaryTags: [{ type: String, enum: DIETARY_TAGS }],
    flavors: [{ type: String, enum: FLAVORS }],
    cookingMethods: [{ type: String, enum: COOKING_METHODS }],
    mainIngredientCategories: [{ type: String, enum: INGREDIENT_CATEGORIES }],
    difficulty: { type: String, enum: DIFFICULTIES },
    spiceLevel: { type: Number, min: 0, max: 5 },
    scenes: [{ type: String, enum: keysOf(SCENES) }], // 料理場景，例：家常、宴客
    role: { type: String, enum: keysOf(ROLES) }, // 在一餐中的角色，例：主菜、湯品
    mainIngredients: [{ type: String, enum: keysOf(MAIN_INGREDIENTS) }], // 主食材類別
  },
  { _id: false },
);
