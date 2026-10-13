// 食譜分類標籤與收藏標記：資料庫存英文 key，畫面顯示中文

export const SCENES = {
  home: "家常",
  party: "宴客",
  bento: "便當",
  "late-night": "宵夜",
  "afternoon-tea": "下午茶",
  brunch: "早午餐",
  "quick-meal": "快速上桌",
} as const;

export const ROLES = {
  main: "主菜",
  side: "配菜",
  staple: "主食",
  soup: "湯品",
  dessert: "甜點",
  snack: "小點",
  drink: "飲品",
} as const;

export const MAIN_INGREDIENTS = {
  pork: "豬肉",
  chicken: "雞肉",
  beef: "牛肉",
  lamb: "羊肉",
  seafood: "海鮮",
  egg: "蛋",
  "tofu-soy": "豆腐豆製品",
  vegetable: "蔬菜",
  mushroom: "菇類",
  rice: "米飯",
  noodle: "麵",
  "flour-bread": "麵粉烘焙",
  dairy: "乳製品",
  fruit: "水果",
} as const;

// 收藏分類（可複選）
export const FAVORITE_LABELS = {
  "want-to-try": "想試試",
  cooked: "成功做過",
  loved: "最愛",
  "to-improve": "要再改良",
} as const;

// 隨手記：做完後的口味標記（可複選）
export const TASTE_NOTES = {
  "too-sweet": "太甜",
  "too-salty": "太鹹",
  "too-bland": "太淡",
  "just-right": "剛好",
  "too-spicy": "太辣",
} as const;

export type Scene = keyof typeof SCENES;
export type Role = keyof typeof ROLES;
export type MainIngredient = keyof typeof MAIN_INGREDIENTS;
export type FavoriteLabel = keyof typeof FAVORITE_LABELS;
export type TasteNote = keyof typeof TASTE_NOTES;

export function keysOf<T extends Record<string, string>>(record: T) {
  return Object.keys(record) as [keyof T & string, ...(keyof T & string)[]];
}
