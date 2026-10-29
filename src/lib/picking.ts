import { z } from "zod";

// 蔬果挑選標準（前後端共用）：依感官（看、摸、聽、聞、掂重）與目的（想要甜、想要脆…）整理
// 內容寫在 data/picking-guides.json，用 npm run seed:picking 存進資料庫；網站只從資料庫讀取，不呼叫 AI

export const SENSES = ["look", "touch", "sound", "smell", "weight"] as const;
export type Sense = (typeof SENSES)[number];

export const MAX_PRODUCE_NAME_LENGTH = 20;

export const pickingEntrySchema = z.object({
  name: z.string().min(1), // 台灣常見的叫法
  aliases: z.array(z.string()), // 其他叫法，例：柚子 → 文旦、文旦柚
  englishNames: z.array(z.string()), // 小寫英文名，當季蔬果卡片用英文名對應
  type: z.enum(["vegetable", "fruit"]),
  summary: z.string().min(1), // 一句話：最重要的判斷
  senses: z
    .array(
      z.object({
        sense: z.enum(SENSES),
        good: z.string().min(1),
        avoid: z.string(), // 沒有就空字串
      }),
    )
    .min(1)
    .max(SENSES.length)
    .refine((list) => new Set(list.map((s) => s.sense)).size === list.length, "同一種感官只能出現一次"),
  goals: z.array(z.object({ goal: z.string().min(1), tips: z.array(z.string().min(1)).min(1) })).max(3),
  ripening: z.string(), // 買回家會不會繼續變熟；不適用寫空字串
  storage: z.string().min(1),
  myth: z.string(), // 常見迷思；沒有就空字串
});

export type PickingEntry = z.infer<typeof pickingEntrySchema>;
export type PickingGuide = Omit<PickingEntry, "aliases" | "englishNames">;
// 網站用來判斷哪些蔬果有挑選標準
export type PickingIndexItem = Pick<PickingEntry, "name" | "aliases" | "englishNames" | "type">;
