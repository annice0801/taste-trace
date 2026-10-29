import "server-only";
import { McpServer } from "@modelcontextprotocol/server";
import { isValidObjectId, type Types } from "mongoose";
import { z } from "zod";
import { CATEGORIES, CATEGORY_GROUPS } from "./categories";
import { connectDB } from "./mongodb";
import { findPickingGuide } from "./picking-guide";
import { ingredientKey, mergeAmounts, scaleAmount } from "./quantity";
import { MAIN_INGREDIENTS, ROLES, SCENES, keysOf } from "./recipe-tags";
import { RecipeModel, type Recipe } from "@/models/Recipe";

// MCP 伺服器：讓 Claude 等 AI 助理直接查詢 Taste-Trace 的食譜
// 原則：只讀、不呼叫 AI（不產生費用）、不碰任何使用者資料（收藏、作品、搜尋紀錄都不開放）
// 挑選標準來自資料庫，同樣不呼叫 AI
// 還沒產生過做法的食譜只回傳摘要與網站連結，請使用者到網站點開產生

type RecipeDoc = Recipe & { _id: Types.ObjectId };

const MAX_RESULTS = 10;
const MAX_LIST_RECIPES = 8;

const categoryLabel = (slug?: string | null) => CATEGORIES.find((c) => c.slug === slug)?.label ?? null;

// 搜尋字串放進正規表達式前先跳脫，避免特殊字元被當成語法
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function fail(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

export function buildMcpServer(siteUrl: string) {
  const server = new McpServer({ name: "taste-trace", title: "Taste-Trace 食譜", version: "1.0.0" });
  const link = (category?: string | null) => (category ? `${siteUrl}/recipes/${category}` : siteUrl);

  function summary(recipe: RecipeDoc) {
    const attributes = recipe.attributes;
    return {
      recipeId: String(recipe._id),
      title: recipe.title,
      description: recipe.description ?? "",
      category: recipe.category ?? null,
      categoryLabel: categoryLabel(recipe.category),
      role: attributes?.role ? ROLES[attributes.role as keyof typeof ROLES] : null,
      scenes: (attributes?.scenes ?? []).map((s) => SCENES[s as keyof typeof SCENES] ?? s),
      totalTimeMinutes: recipe.totalTimeMinutes ?? null,
      servings: recipe.servings ?? null,
      flavors: recipe.tags,
      hasSteps: Boolean(recipe.detailGeneratedAt),
      // 照片需標示作者與授權
      image: recipe.image
        ? { url: recipe.image.url, author: recipe.image.author ?? null, license: recipe.image.license ?? null, sourceUrl: recipe.image.sourceUrl }
        : null,
      url: link(recipe.category),
    };
  }

  // 依份量換算；食譜沒有記錄份量時不換算
  function scaleFactor(recipe: RecipeDoc, servings?: number) {
    return servings && recipe.servings ? servings / recipe.servings : 1;
  }

  server.registerTool(
    "list_categories",
    {
      title: "列出食譜分類",
      description: "列出 Taste-Trace 的所有食譜分類（國家料理、料理類型、名廚靈感），回傳 slug 可用於 search_recipes。",
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () =>
      json(
        CATEGORIES.map((c) => ({ slug: c.slug, group: CATEGORY_GROUPS[c.group], label: c.label, description: c.description, url: link(c.slug) })),
      ),
  );

  server.registerTool(
    "search_recipes",
    {
      title: "搜尋食譜",
      description:
        "依關鍵字、分類、料理角色、場景、主要食材或時間搜尋 Taste-Trace 已收錄的食譜。hasSteps 為 false 的食譜還沒有做法，需到網站點開產生。",
      inputSchema: z.object({
        query: z.string().trim().max(40).optional().describe("菜名、描述或口味關鍵字，例：咖哩、微辣"),
        category: z.string().max(40).optional().describe("分類 slug，可用 list_categories 查詢，例：taiwanese"),
        role: z.enum(keysOf(ROLES)).optional().describe("料理角色：main 主菜、side 配菜、staple 主食、soup 湯品、dessert 甜點、snack 小點、drink 飲品"),
        scene: z.enum(keysOf(SCENES)).optional().describe("場景：home 家常、party 宴客、bento 便當、late-night 宵夜、afternoon-tea 下午茶、brunch 早午餐、quick-meal 快速上桌"),
        mainIngredient: z.enum(keysOf(MAIN_INGREDIENTS)).optional().describe("主要食材，例：chicken、seafood、tofu-soy"),
        maxMinutes: z.number().int().min(5).max(600).optional().describe("總時間上限（分鐘）"),
        onlyWithSteps: z.boolean().optional().describe("只回傳已有做法的食譜"),
        limit: z.number().int().min(1).max(MAX_RESULTS).optional().describe(`筆數，預設 5，最多 ${MAX_RESULTS}`),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ query, category, role, scene, mainIngredient, maxMinutes, onlyWithSteps, limit }) => {
      const filter: Record<string, unknown> = {};
      if (query) {
        const pattern = new RegExp(escapeRegExp(query), "i");
        filter.$or = [{ title: pattern }, { description: pattern }, { tags: pattern }];
      }
      if (category) filter.category = category;
      if (role) filter["attributes.role"] = role;
      if (scene) filter["attributes.scenes"] = scene;
      if (mainIngredient) filter["attributes.mainIngredients"] = mainIngredient;
      if (maxMinutes) filter.totalTimeMinutes = { $lte: maxMinutes };
      if (onlyWithSteps) filter.detailGeneratedAt = { $exists: true };

      await connectDB();
      const recipes = await RecipeModel.find(filter)
        .sort({ detailGeneratedAt: -1, updatedAt: -1 })
        .limit(limit ?? 5)
        .lean<RecipeDoc[]>();
      return json({ count: recipes.length, recipes: recipes.map(summary) });
    },
  );

  server.registerTool(
    "get_recipe",
    {
      title: "取得食譜做法",
      description: "取得一道食譜的食材（含台灣在地替代食材）、步驟與小撇步；可指定份量自動換算。還沒產生做法的食譜只回傳摘要與網站連結。",
      inputSchema: z.object({
        recipeId: z.string().describe("search_recipes 回傳的 recipeId"),
        servings: z.number().int().min(1).max(20).optional().describe("想做幾人份，會依原份量換算食材"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ recipeId, servings }) => {
      if (!isValidObjectId(recipeId)) return fail("recipeId 格式不正確，請先用 search_recipes 取得。");
      await connectDB();
      const recipe = await RecipeModel.findById(recipeId).lean<RecipeDoc>();
      if (!recipe) return fail("找不到這道食譜。");
      if (!recipe.detailGeneratedAt) {
        return json({ ...summary(recipe), note: "這道食譜還沒有做法，請到網站點開「食材與做法」產生後再查詢。" });
      }

      const factor = scaleFactor(recipe, servings);
      return json({
        ...summary(recipe),
        servings: servings && recipe.servings ? servings : (recipe.servings ?? null),
        scaled: factor !== 1,
        ingredients: recipe.ingredients.map((i) => ({
          name: i.name,
          amount: scaleAmount(i.amount ?? "", factor),
          localSubstitute: i.substitutions[0]?.name ?? null,
        })),
        steps: [...recipe.steps].sort((a, b) => a.order - b.order).map((s) => s.instruction),
        tip: recipe.tip ?? null,
        masterPrinciple: recipe.masterPrinciple?.summary ?? null,
      });
    },
  );

  server.registerTool(
    "build_shopping_list",
    {
      title: "產生合併採買清單",
      description: `把多道食譜的食材依份量換算後合併成一份採買清單，同名食材的份量會相加。一次最多 ${MAX_LIST_RECIPES} 道。`,
      inputSchema: z.object({
        recipes: z
          .array(
            z.object({
              recipeId: z.string(),
              servings: z.number().int().min(1).max(20).optional(),
            }),
          )
          .min(1)
          .max(MAX_LIST_RECIPES),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ recipes: requested }) => {
      const ids = requested.map((r) => r.recipeId).filter((id) => isValidObjectId(id));
      await connectDB();
      const docs = await RecipeModel.find({ _id: { $in: ids } }).lean<RecipeDoc[]>();
      const byId = new Map(docs.map((d) => [String(d._id), d]));

      const items = new Map<string, { name: string; amounts: string[]; recipes: string[]; localSubstitute: string | null }>();
      const included: string[] = [];
      const missing: { recipeId: string; title: string | null; reason: string; url?: string }[] = [];

      for (const { recipeId, servings } of requested) {
        const recipe = byId.get(recipeId);
        if (!recipe) {
          missing.push({ recipeId, title: null, reason: "找不到這道食譜" });
          continue;
        }
        if (!recipe.detailGeneratedAt) {
          missing.push({ recipeId, title: recipe.title, reason: "還沒有做法，請先到網站產生", url: link(recipe.category) });
          continue;
        }
        included.push(recipe.title);
        const factor = scaleFactor(recipe, servings);
        for (const i of recipe.ingredients) {
          const key = ingredientKey(i.name);
          const item = items.get(key) ?? { name: i.name, amounts: [], recipes: [], localSubstitute: i.substitutions[0]?.name ?? null };
          if (i.amount) item.amounts.push(scaleAmount(i.amount, factor));
          if (!item.recipes.includes(recipe.title)) item.recipes.push(recipe.title);
          items.set(key, item);
        }
      }

      return json({
        included,
        missing,
        items: [...items.values()].map(({ name, amounts, recipes, localSubstitute }) => ({
          name,
          amount: amounts.length ? mergeAmounts(amounts) : "適量",
          forRecipes: recipes,
          localSubstitute,
        })),
      });
    },
  );

  server.registerTool(
    "get_picking_guide",
    {
      title: "蔬果挑選標準",
      description:
        "查詢一種蔬菜或水果怎麼挑：依感官（看、摸、聽、聞、掂重）與目的（想要甜、想要脆）整理，附保存方式。可用中文名稱或其他叫法查詢，例：文旦、柚子。",
      inputSchema: z.object({
        name: z.string().trim().min(1).max(20).describe("蔬果的繁體中文名稱，例：西瓜、蘋果"),
        englishName: z.string().trim().max(40).optional().describe("英文名稱，中文名稱找不到時用來比對，例：watermelon"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ name, englishName }) => {
      const guide = await findPickingGuide(name, englishName);
      if (!guide) {
        return json({ found: false, note: `網站上還沒有收錄「${name}」的挑選標準。` });
      }
      return json({ found: true, ...guide, url: `${siteUrl}/produce` });
    },
  );

  return server;
}
