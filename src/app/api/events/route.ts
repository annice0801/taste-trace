import { z } from "zod";
import { TAG_PATTERN } from "@/lib/analytics-tags";
import { CATEGORIES } from "@/lib/categories";
import { connectDB } from "@/lib/mongodb";
import { AnalyticsEventModel, EVENT_TYPES } from "@/models/AnalyticsEvent";

const slugs = new Set(CATEGORIES.map((category) => category.slug));

const bodySchema = z.object({
  events: z
    .array(
      z.object({
        type: z.enum(EVENT_TYPES),
        recipeId: z.string().regex(/^[0-9a-f]{24}$/),
        category: z.string().refine((slug) => slugs.has(slug)),
        tags: z.array(z.string().regex(TAG_PATTERN)).max(20),
      }),
    )
    .min(1)
    .max(10),
});

// 匿名事件收集：只記錄類別、食譜與標籤，給後台算點擊率
export async function POST(request: Request) {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return new Response(null, { status: 400 });
  await connectDB();
  await AnalyticsEventModel.insertMany(body.data.events);
  return new Response(null, { status: 204 });
}
