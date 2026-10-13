import "server-only";

// 用 Open-Meteo 取得目前天氣（免費、不需金鑰）
// https://open-meteo.com/en/docs

export type Weather = {
  temperature: number; // °C
  apparentTemperature: number; // 體感溫度 °C
  humidity: number; // %
  precipitation: number; // mm
  description: string;
  code: number; // WMO 天氣代碼，前端依語系顯示天氣文字
  isDay: boolean;
  timezone: string;
};

// WMO 天氣代碼對照
const WEATHER_CODES: Record<number, string> = {
  0: "晴朗",
  1: "大致晴朗",
  2: "局部多雲",
  3: "陰天",
  45: "有霧",
  48: "霧淞",
  51: "毛毛雨",
  53: "毛毛雨",
  55: "較大的毛毛雨",
  61: "小雨",
  63: "中雨",
  65: "大雨",
  66: "凍雨",
  67: "強凍雨",
  71: "小雪",
  73: "中雪",
  75: "大雪",
  77: "雪粒",
  80: "陣雨",
  81: "較強陣雨",
  82: "猛烈陣雨",
  85: "陣雪",
  86: "較強陣雪",
  95: "雷雨",
  96: "雷雨伴隨冰雹",
  99: "強雷雨伴隨冰雹",
};

type OpenMeteoResponse = {
  timezone: string;
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    precipitation: number;
    weather_code: number;
    is_day: number;
  };
};

export async function getCurrentWeather(
  latitude: number,
  longitude: number,
): Promise<Weather> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,is_day",
  );
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    throw new Error(`天氣服務回應錯誤：${res.status}`);
  }

  const data = (await res.json()) as OpenMeteoResponse;
  const { current } = data;

  return {
    temperature: current.temperature_2m,
    apparentTemperature: current.apparent_temperature,
    humidity: current.relative_humidity_2m,
    precipitation: current.precipitation,
    description: WEATHER_CODES[current.weather_code] ?? "未知",
    code: current.weather_code,
    isDay: current.is_day === 1,
    timezone: data.timezone,
  };
}
