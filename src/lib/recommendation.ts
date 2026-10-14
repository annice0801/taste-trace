import { z } from "zod";
import {
  FAVORITE_LABELS,
  keysOf,
  MAIN_INGREDIENTS,
  ROLES,
  SCENES,
  TASTE_NOTES,
  type FavoriteLabel,
  type MainIngredient,
  type Role,
  type Scene,
  type TasteNote,
} from "./recipe-tags";

// 前端 → /api/recommend 的請求格式
export const recommendRequestSchema = z
  .object({
    category: z.string().min(1),
    mood: z.string().trim().max(200).optional(),
    location: z
      .object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      })
      .optional(),
  })
  .refine((body) => body.mood || body.location, {
    message: "請提供心情或位置其中一項",
  });

export type RecommendRequest = z.infer<typeof recommendRequestSchema>;

// OpenAI 回傳的 JSON 結構（Structured Outputs 會強制符合這個 schema）
// 注意：Structured Outputs 不支援選填欄位，可能沒有值的欄位一律用 nullable
const ingredientSchema = z.object({
  name: z.string(),
  amount: z.string().describe("份量與單位，例如「200 公克」「1 大匙」"),
  localSubstitute: z
    .string()
    .nullable()
    .describe("若此食材在使用者所在地較難取得，建議的當地替代食材；容易取得則為 null"),
});

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

const recipeSchema = z.object({
  title: z.string(),
  englishName: z
    .string()
    .describe("這道菜在英文維基百科上最常見的名稱，例如 Lu rou fan、Oyakodon、Tiramisu；沒有固定英文名就用簡短英文描述"),
  imageKeywords: z
    .string()
    .describe("搜尋示意照片用的 2 到 4 個英文關鍵字，以主食材與料理型態為主，例如 pasta shrimp lemon、chicken rice soup"),
  description: z.string().describe("一兩句話介紹這道菜"),
  reason: z.string().describe("以人設口吻說明為什麼這道菜適合使用者現在的心情或天氣"),
  cuisine: z.string().describe("菜系，例如：台灣、日本"),
  difficulty: z.enum(DIFFICULTIES),
  totalTimeMinutes: z.number().int(),
  servings: z.number().int(),
  flavors: z.array(z.string()).describe("口味標籤，例如：鹹香、微辣"),
  scenes: z.array(z.enum(keysOf(SCENES))).describe("適合的料理場景，1 到 2 個"),
  role: z.enum(keysOf(ROLES)).describe("這道菜在一餐中的角色"),
  mainIngredients: z
    .array(z.enum(keysOf(MAIN_INGREDIENTS)))
    .describe("主食材類別，1 到 2 個"),
});

export const recommendationSchema = z.object({
  message: z.string().describe("以人設口吻回應使用者的心情或天氣，2 到 3 句"),
  recipes: z.array(recipeSchema).describe("推薦 3 道料理"),
});

export type Recommendation = z.infer<typeof recommendationSchema>;
export type Difficulty = (typeof DIFFICULTIES)[number];

// 食譜照片（只存網址與授權資訊）
export type RecipeImage = {
  url: string;
  source: "unsplash" | "wikimedia" | "openverse" | "custom"; // 找到照片的管道；custom 是管理員上傳
  provider: string; // 照片實際所在的網站，例：Wikimedia Commons、Flickr
  author: string | null;
  authorUrl: string | null;
  sourceUrl: string; // 照片原始頁面
  license: string | null; // 例：CC BY 2.0
  licenseUrl: string | null;
};

// 推薦卡片與收藏頁共用的食譜概要
export type RecipeSummary = {
  title: string;
  description: string;
  cuisine: string;
  difficulty: Difficulty | null;
  totalTimeMinutes: number | null;
  servings: number | null;
  flavors: string[];
  scenes: Scene[];
  role: Role | null;
  mainIngredients: MainIngredient[];
  image: RecipeImage | null;
};

export type RecommendedRecipe = RecipeSummary & {
  id: string; // 資料庫中的食譜 id
  reason: string;
  saved: boolean; // 目前使用者是否已收藏
};

// 點開某道菜時才取得的詳細內容（/api/recipe-detail）：資料庫有就直接用，沒有才請 AI 產生
export const recipeDetailRequestSchema = z.object({
  recipeId: z.string().regex(/^[0-9a-f]{24}$/),
  timezone: z.string().max(64).optional(), // 瀏覽器時區，用來推估所在地區
});

export type RecipeDetailRequest = z.infer<typeof recipeDetailRequestSchema>;

export const recipeDetailSchema = z.object({
  ingredients: z.array(ingredientSchema),
  steps: z.array(z.string()),
  tip: z.string().nullable().describe("人設的私房小撇步，直接寫內容，不要加「小撇步：」之類的開頭"),
});

// 名廚類別多兩個區塊：大師精髓（原理與技法）與家庭版的調整
const masterPrincipleSchema = z.object({
  summary: z
    .string()
    .describe("這道菜與這位主廚料理風格的關聯，以及經典做法的特色，2 到 3 句；不要宣稱是主廚本人的食譜"),
  principles: z
    .array(
      z.object({
        name: z.string().describe("核心科學原理名稱，例：梅納反應、乳化、膠原蛋白水解"),
        science: z.string().describe("用科學解釋這個原理在這道菜裡如何作用，1 到 2 句"),
      }),
    )
    .describe("2 到 4 個核心科學原理"),
  techniques: z
    .array(z.string())
    .describe("這位主廚的技法特徵，2 到 4 項，可附原文術語，例：以冷奶油收汁（monter au beurre）"),
});

const adaptationSchema = z.object({
  original: z.string().describe("經典做法的步驟、器材或食材"),
  home: z.string().describe("現代家庭廚房的改法"),
  reason: z.string().describe("為什麼這樣改仍能保留大師的原理"),
});

export const chefRecipeDetailSchema = recipeDetailSchema.extend({
  master: masterPrincipleSchema,
  adaptations: z.array(adaptationSchema).describe("原版到家庭版的主要調整，2 到 4 項"),
});

export type MasterPrinciple = z.infer<typeof masterPrincipleSchema>;
export type Adaptation = z.infer<typeof adaptationSchema>;

// 一般類別的 master 為 null、adaptations 為空陣列
export type RecipeDetail = z.infer<typeof recipeDetailSchema> & {
  master: MasterPrinciple | null;
  adaptations: Adaptation[];
};

export type WeatherSummary = {
  description: string;
  code?: number; // WMO 天氣代碼（舊資料沒有）
  temperature: number;
  apparentTemperature: number;
};

// /api/recommend → 前端的回應格式
export type RecommendResponse = {
  message: string;
  recipes: RecommendedRecipe[];
  weather: WeatherSummary | null;
};

// 收藏的分類與隨手記（/api/favorites PATCH）
export const favoriteUpdateSchema = z.object({
  recipeId: z.string().regex(/^[0-9a-f]{24}$/),
  labels: z.array(z.enum(keysOf(FAVORITE_LABELS))).max(10).optional(),
  tasteNotes: z.array(z.enum(keysOf(TASTE_NOTES))).max(10).optional(),
  note: z.string().trim().max(200).optional(),
});

export type FavoriteUpdate = z.infer<typeof favoriteUpdateSchema>;

// 使用者上傳的作品照
export type CreationItem = {
  id: string;
  recipeId: string;
  recipeTitle: string;
  url: string;
  width: number | null;
  height: number | null;
  caption: string; // 做的過程與心得（公開時大家看得到）
  note: string; // 私人備註：只會回傳給上傳者本人，其他人拿到的一律是空字串
  visibility: CreationVisibility;
  createdAt: string;
};

// 食譜頁「大家的作品」：多了作者名稱，以及是不是自己的
export type RecipeCreation = CreationItem & { authorName: string; mine: boolean };

export const CREATION_VISIBILITY = ["public", "private"] as const;
export type CreationVisibility = (typeof CREATION_VISIBILITY)[number];
export const MAX_CAPTION_LENGTH = 300;
export const MAX_NOTE_LENGTH = 500;

export const MAX_CREATIONS_PER_RECIPE = 6;
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // Vercel Functions 請求上限約 4.5MB
export const UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

// 上傳作品照時一起送出的欄位（multipart 的文字欄位）
export const creationUploadSchema = z.object({
  recipeId: z.string().regex(/^[0-9a-f]{24}$/),
  caption: z.string().trim().max(MAX_CAPTION_LENGTH).default(""),
  note: z.string().trim().max(MAX_NOTE_LENGTH).default(""),
  visibility: z.enum(CREATION_VISIBILITY).default("private"),
  width: z.coerce.number().int().min(1).max(10000).optional(),
  height: z.coerce.number().int().min(1).max(10000).optional(),
  markCooked: z.enum(["true", "false"]).default("false"),
});

// 修改作品的文字與公開設定（/api/creations PATCH）
export const creationUpdateSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{24}$/),
  caption: z.string().trim().max(MAX_CAPTION_LENGTH).optional(),
  note: z.string().trim().max(MAX_NOTE_LENGTH).optional(),
  visibility: z.enum(CREATION_VISIBILITY).optional(),
});

export type CreationUpdate = z.infer<typeof creationUpdateSchema>;

// 收藏頁顯示用
export type FavoriteItem = RecipeSummary & {
  recipeId: string;
  category: string;
  detail: RecipeDetail | null;
  labels: FavoriteLabel[];
  tasteNotes: TasteNote[];
  note: string;
  savedAt: string;
  creations: CreationItem[];
};
