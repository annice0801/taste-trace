import {
  generateStructured,
  getAIForRequest,
  openAIErrorResponse,
  personaInstructions,
} from "@/lib/ai";
import { getCategory, type Category } from "@/lib/categories";
import { getPrompt } from "@/lib/prompts";
import {
  findRecipe,
  saveRecipeDetail,
  toRecipeDetail,
} from "@/lib/recipes";
import {
  chefRecipeDetailSchema,
  recipeDetailRequestSchema,
  recipeDetailSchema,
  type RecipeDetail,
} from "@/lib/recommendation";
import { logError } from "@/lib/error-log";

// 系統提示詞在後台的 Prompt CMS 編輯（recipeDetail.system、recipeDetail.chef）
async function buildInstructions(category: Category): Promise<string> {
  const base = await getPrompt("recipeDetail.system", {
    persona: await personaInstructions(category),
  });
  if (!category.chef) return base;
  const chef = await getPrompt("recipeDetail.chef", { chefName: category.chef.englishName });
  return `${base}\n\n${chef}`;
}

function buildUserInput(
  recipe: { title: string; description?: string | null; servings?: number | null },
  timezone: string | undefined,
): string {
  const lines = [`料理：${recipe.title}`];
  if (recipe.description) lines.push(`介紹：${recipe.description}`);
  if (recipe.servings) lines.push(`份數：${recipe.servings} 人份`);
  if (timezone) {
    lines.push(`我所在的時區：${timezone}（請據此推估我所在的地區，提供當地替代食材）。`);
  }
  lines.push("請告訴我這道菜的食材與做法。");
  return lines.join("\n");
}

export async function POST(request: Request) {
  const parsed = recipeDetailRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return Response.json({ error: "請求格式錯誤" }, { status: 400 });
  }
  const { recipeId, timezone } = parsed.data;

  const recipe = await findRecipe(recipeId);
  if (!recipe) {
    return Response.json({ error: "找不到這道食譜" }, { status: 404 });
  }

  // 資料庫已經有做法就直接回傳，不再呼叫 OpenAI
  const stored = toRecipeDetail(recipe);
  if (stored) {
    return Response.json({ ...stored, fromCache: true });
  }

  const category = getCategory(recipe.category ?? "");
  if (!category) {
    return Response.json({ error: "找不到這個食譜類別" }, { status: 404 });
  }

  const ai = await getAIForRequest(request);
  if ("error" in ai) return ai.error;

  try {
    const baseParams = {
      instructions: await buildInstructions(category),
      input: buildUserInput(recipe, timezone),
    };
    const detail: RecipeDetail | null = category.chef
      ? await generateStructured(ai, {
          ...baseParams,
          schema: chefRecipeDetailSchema,
          name: "chef_recipe_detail",
        })
      : await generateStructured(ai, {
          ...baseParams,
          schema: recipeDetailSchema,
          name: "recipe_detail",
        }).then((parsed) => parsed && { ...parsed, master: null, adaptations: [] });
    if (!detail) {
      return Response.json(
        { error: "AI 沒有回傳食譜內容，請再試一次" },
        { status: 502 },
      );
    }

    // 存檔失敗不影響這次顯示，下次點開會重新產生
    await saveRecipeDetail(recipeId, detail, timezone).catch((error) =>
      logError("database", "recipe-detail.save", error, { recipeId }),
    );
    return Response.json({ ...detail, fromCache: false });
  } catch (error) {
    return openAIErrorResponse("recipe-detail", error, ai.userKey);
  }
}
