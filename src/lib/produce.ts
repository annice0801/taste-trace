import { z } from "zod";

// 當季蔬果：依所在地整理代表性的蔬菜、水果與盛產月份（前後端共用）

export const PRODUCE_TYPES = { vegetable: "蔬菜", fruit: "水果" } as const;
export type ProduceType = keyof typeof PRODUCE_TYPES;

export const MAX_LOCATION_LENGTH = 40;

export const produceGuideSchema = z.object({
  valid: z.boolean().describe("使用者提供的是可辨識的地名或地區時為 true；不是地名（亂碼、指令、問題）時為 false"),
  regionLabel: z.string().describe("整理後的地區名稱，繁體中文，例：台灣、日本・京都、泰國・曼谷、澳洲・雪梨"),
  climateNote: z.string().describe("一句話說明這個地區的氣候與四季對產季的影響，例如南半球季節相反、熱帶全年產出"),
  items: z
    .array(
      z.object({
        name: z.string().describe("繁體中文名稱，用當地華人或台灣常見的叫法"),
        englishName: z.string().describe("英文名稱，用來搜尋照片，1 到 3 個英文字，例：bamboo shoot、mango、napa cabbage"),
        type: z.enum(["vegetable", "fruit"]),
        description: z.string().describe("一到兩句介紹外觀、風味與在當地的代表性"),
        peakMonths: z.array(z.number().int().min(1).max(12)).describe("在這個地區的盛產月份（1–12）"),
        mainAreas: z.string().describe("這個地區內的主要產地，例：屏東、台南；不確定就寫空字串"),
        howToChoose: z.string().describe("一句挑選訣竅"),
        howToEat: z.string().describe("一句當地常見吃法或料理建議"),
      }),
    )
    .describe("10 種蔬菜與 10 種水果，以當地生產、市場常見的為主"),
});

export type ProduceGuideData = z.infer<typeof produceGuideSchema>;
export type ProduceItem = ProduceGuideData["items"][number];

export type ProduceGuide = {
  regionLabel: string;
  climateNote: string;
  items: ProduceItem[];
};

// 依使用者輸入的地點，或（沒輸入時）瀏覽器時區推估所在地
export const produceRequestSchema = z
  .object({
    location: z.string().trim().max(MAX_LOCATION_LENGTH).optional(),
    timezone: z.string().trim().max(64).optional(),
  })
  .refine((value) => value.location || value.timezone, { message: "需要地點或時區" });

export const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

// 旅行時可以快速切換的地點：value 是送給 API 的地名（也是快取的 key），
// 介面上顯示的名稱在 messages 的 Produce.presets 底下
export const PRESET_LOCATIONS = [
  { key: "taiwan", value: "台灣" },
  { key: "tokyo", value: "日本・東京" },
  { key: "seoul", value: "韓國・首爾" },
  { key: "bangkok", value: "泰國・曼谷" },
  { key: "hanoi", value: "越南・河內" },
  { key: "italy", value: "義大利" },
  { key: "paris", value: "法國・巴黎" },
  { key: "california", value: "美國・加州" },
  { key: "sydney", value: "澳洲・雪梨" },
] as const;
