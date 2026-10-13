import type { RecipeSummary } from "@/lib/recommendation";

// 介面翻譯函式（useTranslations("Tags") 的回傳值）
type TagTranslator = (key: string, values?: Record<string, number>) => string;

// 照片上的分類標籤：烹調時間 / 難度、場景 / 角色、主食材
export function recipeBadges(recipe: RecipeSummary, t: TagTranslator): string[] {
  return [
    recipe.totalTimeMinutes != null && t("minutes", { count: recipe.totalTimeMinutes }),
    recipe.difficulty && t(`difficulty.${recipe.difficulty}`),
    recipe.role && t(`roles.${recipe.role}`),
    ...recipe.scenes.map((scene) => t(`scenes.${scene}`)),
    ...recipe.mainIngredients.map((item) => t(`mainIngredients.${item}`)),
  ].filter((badge): badge is string => Boolean(badge));
}
