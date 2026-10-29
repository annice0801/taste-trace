// 食材份量文字的解析、換算與合併，例：「200 公克」「1/2 小匙」「1又1/2 大匙」「2-3 瓣」「半顆」
// 「適量」「少許」這類沒有數字的份量不換算

export type ParsedAmount = {
  value: number;
  max: number | null; // 範圍上限，例：2-3 瓣
  unit: string; // 數字後面的文字，例：公克、小匙、顆（約略）
  approx: boolean; // 開頭有「約」
};

const NUMBER = String.raw`\d+\s*又\s*\d+\s*\/\s*\d+|\d+(?:\.\d+)?(?:\s*\/\s*\d+)?`; // 帶分數要放前面先比對
const AMOUNT_PATTERN = new RegExp(
  String.raw`^\s*(約)?\s*(${NUMBER}|半)(?:\s*[-~～至到]\s*(${NUMBER}))?\s*(.*)$`,
);

function toNumber(text: string): number {
  if (text === "半") return 0.5;
  const mixed = text.match(/^(\d+)\s*又\s*(\d+)\s*\/\s*(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const fraction = text.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  return Number(text);
}

export function parseAmount(amount: string): ParsedAmount | null {
  const match = amount.match(AMOUNT_PATTERN);
  if (!match) return null;
  const value = toNumber(match[2]);
  if (!Number.isFinite(value) || value <= 0) return null;
  return {
    value,
    max: match[3] ? toNumber(match[3]) : null,
    unit: match[4].trim(),
    approx: Boolean(match[1]),
  };
}

const FRACTIONS: Record<number, string> = { 0.25: "1/4", 0.5: "1/2", 0.75: "3/4" };

// 10 以上取整數；10 以下取到 1/4，並用分數顯示，例：1又1/2
export function formatNumber(value: number): string {
  if (value >= 10) return String(Math.round(value));
  const rounded = Math.max(0.25, Math.round(value * 4) / 4);
  const whole = Math.floor(rounded);
  const fraction = FRACTIONS[rounded - whole];
  if (!fraction) return String(whole);
  return whole > 0 ? `${whole}又${fraction}` : fraction;
}

export function formatAmount(parsed: ParsedAmount): string {
  const range =
    parsed.max != null
      ? `${formatNumber(parsed.value)}-${formatNumber(parsed.max)}`
      : formatNumber(parsed.value);
  return `${parsed.approx ? "約 " : ""}${range}${parsed.unit ? ` ${parsed.unit}` : ""}`;
}

export function scaleAmount(amount: string, factor: number): string {
  if (factor === 1) return amount;
  const parsed = parseAmount(amount);
  if (!parsed) return amount;
  return formatAmount({
    ...parsed,
    value: parsed.value * factor,
    max: parsed.max != null ? parsed.max * factor : null,
    // 括號內的重量、容量也要跟著換算，例：「3 顆（約 350 公克）」加倍為「6 顆（約 700 公克）」
    // 只換算後面接著重量或容量單位的數字，「2 號」這類型號不動
    unit: parsed.unit.replace(/[（(][^）)]*[）)]/g, (note) =>
      note.replace(NOTE_MEASURE, (_, n: string, unit: string) => `${formatMeasure(Number(n) * factor)}${unit}`),
    ),
  });
}

const NOTE_MEASURE = /(\d+(?:\.\d+)?)(\s*(?:公克|克|公斤|毫升|公升|kg|ml|cc|g|l)(?![a-z]))/gi;

// 括號內的重量容量用小數：10 以上取整數，以下取到小數一位，例：7.5 毫升
function formatMeasure(value: number): string {
  return value >= 10 ? String(Math.round(value)) : String(Math.round(value * 10) / 10);
}

// 採買清單合併用：同名食材（忽略空白與括號說明）視為同一項
export function ingredientKey(name: string): string {
  return name.replace(/[（(][^）)]*[）)]/g, "").replace(/\s+/g, "").trim();
}

// 合併同一食材的多個份量：同單位的數字相加，其餘並列，例：「300 公克 + 適量」
export function mergeAmounts(amounts: string[]): string {
  const totals = new Map<string, ParsedAmount>();
  const others: string[] = [];

  for (const amount of amounts) {
    const parsed = parseAmount(amount);
    if (!parsed) {
      if (amount && !others.includes(amount)) others.push(amount);
      continue;
    }
    const existing = totals.get(parsed.unit);
    totals.set(
      parsed.unit,
      existing
        ? {
            value: existing.value + parsed.value,
            max:
              existing.max != null || parsed.max != null
                ? (existing.max ?? existing.value) + (parsed.max ?? parsed.value)
                : null,
            unit: parsed.unit,
            approx: existing.approx || parsed.approx,
          }
        : parsed,
    );
  }

  return [...[...totals.values()].map(formatAmount), ...others].join(" + ");
}
