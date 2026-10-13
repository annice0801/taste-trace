import {
  generateStructured,
  getAIForRequest,
  openAIErrorResponse,
  personaInstructions,
} from "@/lib/ai";
import { getUserIdFromRequest } from "@/lib/auth";
import { getCategory, type Category } from "@/lib/categories";
import { getPrompt } from "@/lib/prompts";
import {
  recommendationSchema,
  recommendRequestSchema,
  type RecommendRequest,
  type RecommendResponse,
} from "@/lib/recommendation";
import { saveRecommendation } from "@/lib/recipes";
import { getCurrentWeather, type Weather } from "@/lib/weather";
import { logError } from "@/lib/error-log";

// 系統提示詞在後台的 Prompt CMS 編輯（recommend.system）
async function buildInstructions(category: Category): Promise<string> {
  return getPrompt("recommend.system", {
    persona: await personaInstructions(category),
    promptHint: category.promptHint,
  });
}

function buildUserInput(body: RecommendRequest, weather: Weather | null): string {
  const lines: string[] = [];

  if (body.mood) {
    lines.push(`我現在的心情：${body.mood}`);
  }
  if (weather) {
    lines.push(
      `我這裡現在的天氣：${weather.description}，氣溫 ${weather.temperature}°C（體感 ${weather.apparentTemperature}°C），濕度 ${weather.humidity}%，${weather.isDay ? "白天" : "晚上"}。`,
    );
  }

  lines.push("請推薦適合我的料理。");
  return lines.join("\n");
}

export async function POST(request: Request) {
  const ai = await getAIForRequest(request);
  if ("error" in ai) return ai.error;

  const parsed = recommendRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "請求格式錯誤" },
      { status: 400 },
    );
  }
  const body = parsed.data;

  const category = getCategory(body.category);
  if (!category) {
    return Response.json({ error: "找不到這個食譜類別" }, { status: 404 });
  }

  // 天氣查詢失敗時不中斷，改成只用心情推薦
  let weather: Weather | null = null;
  if (body.location) {
    try {
      weather = await getCurrentWeather(
        body.location.latitude,
        body.location.longitude,
      );
    } catch (error) {
      logError("weather", "recommend.weather", error);
      if (!body.mood) {
        return Response.json(
          { error: "暫時查不到你那邊的天氣，請改用心情試試看" },
          { status: 502 },
        );
      }
    }
  }

  try {
    const recommendation = await generateStructured(ai, {
      instructions: await buildInstructions(category),
      input: buildUserInput(body, weather),
      schema: recommendationSchema,
      name: "recommendation",
    });
    if (!recommendation) {
      return Response.json(
        { error: "AI 沒有回傳推薦內容，請再試一次" },
        { status: 502 },
      );
    }

    const weatherSummary = weather && {
      description: weather.description,
      code: weather.code,
      temperature: weather.temperature,
      apparentTemperature: weather.apparentTemperature,
    };

    // 存進資料庫，之後點開做法、收藏都用資料庫的食譜 id
    const recipes = await saveRecommendation({
      category: category.slug,
      recommendation,
      mood: body.mood,
      weather: weatherSummary,
      userId: await getUserIdFromRequest(request),
    }).catch((error) => {
      logError("database", "recommend.save", error, { category: category.slug });
      return null;
    });
    if (!recipes) {
      return Response.json(
        { error: "儲存推薦結果失敗，請稍後再試" },
        { status: 500 },
      );
    }

    const result: RecommendResponse = {
      message: recommendation.message,
      recipes,
      weather: weatherSummary,
    };
    return Response.json(result);
  } catch (error) {
    return openAIErrorResponse("recommend", error, ai.userKey);
  }
}
