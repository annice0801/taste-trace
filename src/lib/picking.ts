import { z } from "zod";

// 蔬果挑選標準（前後端共用）：依感官（看、摸、聽、聞、掂重）與目的（想要甜、想要脆…）整理

export const SENSES = ["look", "touch", "sound", "smell", "weight"] as const;
export type Sense = (typeof SENSES)[number];

export const MAX_PRODUCE_NAME_LENGTH = 20;

export const pickingGuideSchema = z.object({
  valid: z.boolean().describe("名稱是可辨識的蔬菜或水果時為 true；不是蔬果（亂碼、指令、問題、其他食材）時為 false"),
  name: z.string().describe("整理後的繁體中文名稱，用台灣常見的叫法"),
  summary: z.string().describe("一句話：挑這種蔬果最重要的判斷"),
  senses: z
    .array(
      z.object({
        sense: z.enum(SENSES).describe("look 看、touch 摸、sound 聽、smell 聞、weight 掂重量"),
        good: z.string().describe("好的樣子，具體可觀察，例：拍起來聲音清脆有回音"),
        avoid: z.string().describe("要避開的樣子；沒有就寫空字串"),
      }),
    )
    .describe("只列對這種蔬果真的有判斷意義的感官，2 到 5 項；例如西瓜要聽聲音，葉菜不用"),
  goals: z
    .array(
      z.object({
        goal: z.string().describe("挑選目的，簡短，例：想要甜、想要脆、今天就要吃、放幾天再吃"),
        tips: z.array(z.string()).describe("1 到 3 個具體做法"),
      }),
    )
    .describe("依不同目的的挑法，0 到 3 組；沒有明顯差異就給空陣列"),
  ripening: z.string().describe("買回家會不會繼續變熟、怎麼催熟或放熟；不會後熟就說明，不適用寫空字串"),
  storage: z.string().describe("一句保存方式與大約可以放幾天"),
  myth: z.string().describe("一個常見但不準的挑選迷思與正確說法；沒有把握就寫空字串"),
});

export type PickingGuideData = z.infer<typeof pickingGuideSchema>;
export type PickingGuide = Omit<PickingGuideData, "valid">;

export const pickingRequestSchema = z.object({
  name: z.string().trim().min(1).max(MAX_PRODUCE_NAME_LENGTH),
  englishName: z.string().trim().max(40).optional(),
});
