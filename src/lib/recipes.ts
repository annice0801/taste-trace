import "server-only";
import { Types } from "mongoose";
import { listCreations } from "./creations";
import { findRecipeImage, LOOKUP_INTERVAL_MS, sleep } from "./images";
import { connectDB } from "./mongodb";
import type {
  FavoriteLabel,
  MainIngredient,
  Role,
  Scene,
  TasteNote,
} from "./recipe-tags";
import type {
  Difficulty,
  FavoriteItem,
  FavoriteUpdate,
  Recommendation,
  RecipeDetail,
  RecipeImage,
  RecipeSummary,
  RecommendedRecipe,
  WeatherSummary,
} from "./recommendation";
import { FavoriteRecipeModel } from "@/models/FavoriteRecipe";
import { RecipeModel, type Recipe } from "@/models/Recipe";
import { SearchHistoryModel } from "@/models/SearchHistory";

type RecipeDoc = Recipe & { _id: Types.ObjectId };

// 找不到照片時，隔多久才再找一次
const IMAGE_RETRY_MS = 24 * 60 * 60 * 1000;

function toRecipeImage(recipe: RecipeDoc): RecipeImage | null {
  const image = recipe.image;
  if (!image) return null;
  return {
    url: image.url,
    source: image.source as RecipeImage["source"],
    provider: image.provider ?? "Wikimedia Commons",
    author: image.author ?? null,
    authorUrl: image.authorUrl ?? null,
    sourceUrl: image.sourceUrl,
    license: image.license ?? null,
    licenseUrl: image.licenseUrl ?? null,
  };
}

function toRecipeSummary(recipe: RecipeDoc): RecipeSummary {
  const attributes = recipe.attributes;
  return {
    title: recipe.title,
    description: recipe.description ?? "",
    cuisine: attributes?.cuisine ?? "",
    difficulty: (attributes?.difficulty as Difficulty | undefined) ?? null,
    totalTimeMinutes: recipe.totalTimeMinutes ?? null,
    servings: recipe.servings ?? null,
    flavors: recipe.tags,
    scenes: (attributes?.scenes ?? []) as Scene[],
    role: (attributes?.role as Role | undefined) ?? null,
    mainIngredients: (attributes?.mainIngredients ?? []) as MainIngredient[],
    image: toRecipeImage(recipe),
  };
}

// 把 AI 推薦的菜存進資料庫（同類別同菜名只存一份），並記錄這次推薦
export async function saveRecommendation({
  category,
  recommendation,
  mood,
  weather,
  userId,
}: {
  category: string;
  recommendation: Recommendation;
  mood: string | undefined;
  weather: WeatherSummary | null;
  userId: string | null;
}): Promise<RecommendedRecipe[]> {
  await connectDB();

  const docs = await Promise.all(
    recommendation.recipes.map(async (recipe) => {
      const tags = {
        englishName: recipe.englishName,
        imageKeywords: recipe.imageKeywords,
        "attributes.scenes": recipe.scenes,
        "attributes.role": recipe.role,
        "attributes.mainIngredients": recipe.mainIngredients,
      };
      // 舊資料缺英文名、照片關鍵字或標籤時補上
      await RecipeModel.updateOne(
        {
          category,
          title: recipe.title,
          $or: [
            { englishName: { $exists: false } },
            { imageKeywords: { $exists: false } },
            { "attributes.role": { $exists: false } },
          ],
        },
        { $set: tags },
      );
      return RecipeModel.findOneAndUpdate(
        { category, title: recipe.title },
        {
          $setOnInsert: {
            category,
            title: recipe.title,
            description: recipe.description,
            source: { type: "ai" },
            servings: recipe.servings,
            totalTimeMinutes: recipe.totalTimeMinutes,
            "attributes.cuisine": recipe.cuisine,
            "attributes.difficulty": recipe.difficulty,
            ...tags,
            tags: recipe.flavors,
          },
        },
        { upsert: true, returnDocument: "after" },
      ).lean<RecipeDoc>();
    }),
  );
  const ids = docs.map((doc) => doc!._id);

  await SearchHistoryModel.create({
    userId: userId ?? undefined,
    category,
    mood,
    weather: weather ?? undefined,
    message: recommendation.message,
    resultRecipes: ids,
    reasons: recommendation.recipes.map((recipe) => recipe.reason),
  });

  const savedIds = userId
    ? new Set(
        (
          await FavoriteRecipeModel.find(
            { userId, recipe: { $in: ids } },
            { recipe: 1 },
          ).lean()
        ).map((favorite) => favorite.recipe.toString()),
      )
    : new Set<string>();

  return recommendation.recipes.map((recipe, index) => ({
    title: recipe.title,
    description: recipe.description,
    cuisine: recipe.cuisine,
    difficulty: recipe.difficulty,
    totalTimeMinutes: recipe.totalTimeMinutes,
    servings: recipe.servings,
    flavors: recipe.flavors,
    scenes: recipe.scenes,
    role: recipe.role,
    mainIngredients: recipe.mainIngredients,
    image: toRecipeImage(docs[index]!),
    id: ids[index].toString(),
    reason: recipe.reason,
    saved: savedIds.has(ids[index].toString()),
  }));
}

// 為還沒有照片的食譜找照片，找到就存起來；回傳 id → 照片
export async function resolveRecipeImages(
  recipeIds: string[],
): Promise<Record<string, RecipeImage | null>> {
  await connectDB();
  const recipes = await RecipeModel.find({ _id: { $in: recipeIds } }).lean<RecipeDoc[]>();

  // Wikimedia 建議依序發送請求，同時發太多會被回 429，所以一道一道找
  const images: Record<string, RecipeImage | null> = {};
  let looked = false;
  for (const recipe of recipes) {
    const id = recipe._id.toString();
    const existing = toRecipeImage(recipe);
    const checkedRecently =
      recipe.imageCheckedAt &&
      Date.now() - recipe.imageCheckedAt.getTime() < IMAGE_RETRY_MS;
    if (existing || checkedRecently) {
      images[id] = existing;
      continue;
    }

    if (looked) await sleep(LOOKUP_INTERVAL_MS);
    looked = true;
    try {
      const image = await findRecipeImage(
        recipe.title,
        recipe.englishName ?? null,
        recipe.imageKeywords ?? null,
        // 調酒、飲料類別或角色是飲品時，要找飲料的照片
        recipe.category === "cocktail" || recipe.category === "drinks" || recipe.attributes?.role === "drink"
          ? "drink"
          : "food",
      );
      await RecipeModel.updateOne(
        { _id: recipe._id },
        { $set: { imageCheckedAt: new Date(), ...(image && { image }) } },
      );
      images[id] = image;
    } catch {
      images[id] = null; // 查詢出錯不記錄，下次再試
    }
  }
  return images;
}

export async function findRecipe(recipeId: string): Promise<RecipeDoc | null> {
  await connectDB();
  return RecipeModel.findById(recipeId).lean<RecipeDoc>();
}

export function toRecipeDetail(recipe: RecipeDoc): RecipeDetail | null {
  if (!recipe.detailGeneratedAt) return null;
  return {
    ingredients: recipe.ingredients.map((ingredient) => ({
      name: ingredient.name,
      amount: ingredient.amount ?? "",
      localSubstitute: ingredient.substitutions[0]?.name ?? null,
    })),
    steps: [...recipe.steps]
      .sort((a, b) => a.order - b.order)
      .map((step) => step.instruction),
    tip: recipe.tip ?? null,
    master: recipe.masterPrinciple
      ? {
          summary: recipe.masterPrinciple.summary ?? "",
          principles: recipe.masterPrinciple.principles.map(({ name, science }) => ({
            name,
            science,
          })),
          techniques: recipe.masterPrinciple.techniques,
        }
      : null,
    // 舊資料沒有這個欄位，lean() 讀出來是 undefined
    adaptations: (recipe.adaptations ?? []).map(({ original, home, reason }) => ({
      original,
      home,
      reason: reason ?? "",
    })),
  };
}

export async function saveRecipeDetail(
  recipeId: string,
  detail: RecipeDetail,
  timezone: string | undefined,
): Promise<void> {
  await connectDB();
  await RecipeModel.updateOne(
    { _id: recipeId },
    {
      $set: {
        ingredients: detail.ingredients.map((ingredient) => ({
          name: ingredient.name,
          amount: ingredient.amount,
          substitutions: ingredient.localSubstitute
            ? [
                {
                  name: ingredient.localSubstitute,
                  region: timezone,
                  reason: "unavailable-locally",
                },
              ]
            : [],
        })),
        steps: detail.steps.map((instruction, index) => ({
          order: index + 1,
          instruction,
        })),
        tip: detail.tip ?? undefined,
        ...(detail.master && { masterPrinciple: detail.master }),
        adaptations: detail.adaptations,
        detailGeneratedAt: new Date(),
      },
    },
  );
}

export async function addFavorite(userId: string, recipe: RecipeDoc) {
  await connectDB();
  await FavoriteRecipeModel.updateOne(
    { userId, recipe: recipe._id },
    {
      $setOnInsert: {
        userId,
        recipe: recipe._id,
        category: recipe.category,
        attributes: recipe.attributes,
        labels: ["want-to-try"],
      },
    },
    { upsert: true },
  );
}

export async function removeFavorite(userId: string, recipeId: string) {
  await connectDB();
  await FavoriteRecipeModel.deleteOne({ userId, recipe: recipeId });
}

// 更新收藏分類與隨手記；回傳 false 代表沒有這筆收藏
export async function updateFavorite(
  userId: string,
  { recipeId, labels, tasteNotes, note }: FavoriteUpdate,
): Promise<boolean> {
  await connectDB();
  const result = await FavoriteRecipeModel.updateOne(
    { userId, recipe: recipeId },
    {
      $set: {
        ...(labels && { labels }),
        ...(tasteNotes && { tasteNotes }),
        ...(note !== undefined && { personalNotes: note }),
      },
    },
    { runValidators: true },
  );
  return result.matchedCount > 0;
}

export async function listFavorites(userId: string): Promise<FavoriteItem[]> {
  await connectDB();
  const favorites = await FavoriteRecipeModel.find({ userId })
    .sort({ createdAt: -1 })
    .populate<{ recipe: RecipeDoc | null }>("recipe")
    .lean();
  const creations = await listCreations(
    userId,
    favorites.flatMap((favorite) => (favorite.recipe ? [favorite.recipe._id] : [])),
  );

  return favorites.flatMap((favorite) => {
    const recipe = favorite.recipe;
    if (!recipe) return []; // 食譜已被刪除
    return [
      {
        ...toRecipeSummary(recipe),
        recipeId: recipe._id.toString(),
        category: recipe.category ?? "",
        detail: toRecipeDetail(recipe),
        // 舊收藏沒有這兩個欄位，lean() 讀出來是 undefined
        labels: (favorite.labels ?? []) as FavoriteLabel[],
        tasteNotes: (favorite.tasteNotes ?? []) as TasteNote[],
        note: favorite.personalNotes ?? "",
        savedAt: favorite.createdAt.toISOString(),
        creations: creations.filter((c) => c.recipeId === recipe._id.toString()),
      },
    ];
  });
}
