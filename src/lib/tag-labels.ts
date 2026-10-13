import { MAIN_INGREDIENTS, ROLES, SCENES } from "./recipe-tags";

const DIFFICULTY: Record<string, string> = { easy: "簡單", medium: "中等", hard: "進階" };

// 統計標籤（scene:bento）轉成後台顯示的中文
export function tagLabel(tag: string): string {
  const [kind, value] = tag.split(":");
  switch (kind) {
    case "scene":
      return `場景・${SCENES[value as keyof typeof SCENES] ?? value}`;
    case "role":
      return `角色・${ROLES[value as keyof typeof ROLES] ?? value}`;
    case "main":
      return `食材・${MAIN_INGREDIENTS[value as keyof typeof MAIN_INGREDIENTS] ?? value}`;
    case "diff":
      return `難度・${DIFFICULTY[value] ?? value}`;
    case "time":
      return value === "under-20" ? "20 分鐘快手" : value;
    default:
      return tag;
  }
}
