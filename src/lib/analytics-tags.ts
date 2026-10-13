import type { RecipeSummary } from "./recommendation";

// 用來統計點擊率的食譜標籤，格式「種類:值」，例：scene:bento、time:under-20
export const TAG_PATTERN = /^(scene|role|main|diff|time):[a-z0-9-]{1,30}$/;

export function recipeTags(recipe: Pick<RecipeSummary, "scenes" | "role" | "mainIngredients" | "difficulty" | "totalTimeMinutes">): string[] {
  return [
    ...recipe.scenes.map((scene) => `scene:${scene}`),
    ...(recipe.role ? [`role:${recipe.role}`] : []),
    ...recipe.mainIngredients.map((item) => `main:${item}`),
    ...(recipe.difficulty ? [`diff:${recipe.difficulty}`] : []),
    // 20 分鐘內完成的「快手菜」
    ...(recipe.totalTimeMinutes != null && recipe.totalTimeMinutes <= 20 ? ["time:under-20"] : []),
  ];
}
