import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { audit } from "@/lib/admin-ops";
import { isObjectId, normalizeIngredientKey, saveCuratedPhoto } from "@/lib/curated-photos";
import { logError } from "@/lib/error-log";
import { hasImageSignature } from "@/lib/image-signature";
import { connectDB } from "@/lib/mongodb";
import { MAX_UPLOAD_BYTES, UPLOAD_TYPES } from "@/lib/recommendation";
import { IngredientImageModel } from "@/models/IngredientImage";
import { ProduceGuideModel } from "@/models/ProduceGuide";
import { RecipeModel } from "@/models/Recipe";

type Status = "manual" | "auto" | "missing" | "pending";
type PhotoRow = {
  id: string;
  name: string;
  subtitle: string;
  image: { url: string; source: string; author: string; license: string; licenseUrl: string } | null;
  status: Status;
};

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 照片管理清單：食材（含當季蔬果）或食譜，依狀態、地區、關鍵字篩選
export async function GET(request: Request) {
  const admin = await requireAdmin(request, "photos");
  if (admin instanceof Response) return admin;

  const url = new URL(request.url);
  const type = url.searchParams.get("type") === "recipe" ? "recipe" : "ingredient";
  const status = url.searchParams.get("status") ?? "missing";
  const region = url.searchParams.get("region") ?? "";
  const q = url.searchParams.get("q")?.trim().slice(0, 50) ?? "";

  await connectDB();
  const guides = await ProduceGuideModel.find({}, { regionLabel: 1, items: 1 }).sort({ updatedAt: -1 }).lean();
  let rows: PhotoRow[];

  if (type === "ingredient") {
    // 地區篩選時只列那個地區的蔬果；否則列出所有找過照片的食材，加上各地蔬果
    const guide = guides.find((g) => g._id.toString() === region);
    const produceNames = (guide ? [guide] : guides).flatMap((g) => g.items.map((item) => item.name));
    const produceEnglish = new Map(
      (guide ? [guide] : guides).flatMap((g) => g.items.map((item) => [normalizeIngredientKey(item.name), item.englishName ?? ""])),
    );
    const docs = await IngredientImageModel.find(guide ? { key: { $in: produceNames.map(normalizeIngredientKey) } } : {}).lean();
    const docByKey = new Map(docs.map((doc) => [doc.key, doc]));
    const keys = [...new Set([...(guide ? [] : docs.map((doc) => doc.key)), ...produceNames.map(normalizeIngredientKey)])];
    rows = keys.map((key) => {
      const doc = docByKey.get(key);
      const image = doc?.image?.url ? doc.image : null;
      return {
        id: key,
        name: key,
        subtitle: doc?.englishName ?? produceEnglish.get(key) ?? "",
        image: image
          ? { url: image.url!, source: image.source ?? "unsplash", author: image.author ?? "", license: image.license ?? "", licenseUrl: image.licenseUrl ?? "" }
          : null,
        status: doc?.manual ? "manual" : image ? "auto" : doc?.imageCheckedAt ? "missing" : "pending",
      };
    });
    if (q) rows = rows.filter((row) => row.name.includes(q) || row.subtitle.toLowerCase().includes(q.toLowerCase()));
  } else {
    const recipes = await RecipeModel.find(
      q ? { $or: [{ title: { $regex: escapeRegex(q), $options: "i" } }, { englishName: { $regex: escapeRegex(q), $options: "i" } }] } : {},
      { title: 1, englishName: 1, category: 1, image: 1, imageManual: 1, imageCheckedAt: 1 },
    )
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    rows = recipes.map((recipe) => ({
      id: recipe._id.toString(),
      name: recipe.title,
      subtitle: [recipe.englishName, recipe.category].filter(Boolean).join("・"),
      image: recipe.image?.url
        ? { url: recipe.image.url, source: recipe.image.source, author: recipe.image.author ?? "", license: recipe.image.license ?? "", licenseUrl: recipe.image.licenseUrl ?? "" }
        : null,
      status: recipe.imageManual ? "manual" : recipe.image?.url ? "auto" : recipe.imageCheckedAt ? "missing" : "pending",
    }));
  }

  const counts = { manual: 0, auto: 0, missing: 0, pending: 0 };
  for (const row of rows) counts[row.status]++;
  const filtered =
    status === "all"
      ? rows
      : status === "missing"
        ? rows.filter((row) => row.status === "missing" || row.status === "pending")
        : rows.filter((row) => row.status === status);

  return Response.json({
    rows: filtered.sort((a, b) => a.name.localeCompare(b.name, "zh-Hant")),
    counts,
    regions: guides.map((g) => ({ id: g._id.toString(), label: g.regionLabel })),
  });
}

const uploadSchema = z.object({
  type: z.enum(["ingredient", "recipe"]),
  id: z.string().trim().min(1).max(60),
  author: z.string().trim().max(80).default(""),
  license: z.string().trim().max(80).default(""),
  // 授權條款連結，例：https://creativecommons.org/licenses/by-sa/4.0
  licenseUrl: z.union([z.string().trim().url().max(300).startsWith("https://"), z.literal("")]).default(""),
});

// 上傳手動照片（multipart：file、type、id、author、license），存進 Blob 並取代目前的照片
export async function POST(request: Request) {
  const admin = await requireAdmin(request, "photos");
  if (admin instanceof Response) return admin;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const parsed = uploadSchema.safeParse(
    form && Object.fromEntries([...form.entries()].filter(([, value]) => typeof value === "string")),
  );
  if (!parsed.success || !(file instanceof File)) {
    return Response.json({ error: "請求格式錯誤" }, { status: 400 });
  }
  if (!(UPLOAD_TYPES as readonly string[]).includes(file.type) || !(await hasImageSignature(file))) {
    return Response.json({ error: "只能上傳 JPG、PNG 或 WebP 照片" }, { status: 415 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json({ error: "照片太大，請小於 4MB" }, { status: 413 });
  }
  const { type, id, author, license, licenseUrl } = parsed.data;
  if (type === "recipe" && !isObjectId(id)) {
    return Response.json({ error: "食譜 id 格式錯誤" }, { status: 400 });
  }

  try {
    const target =
      type === "ingredient"
        ? { type: "ingredient" as const, key: normalizeIngredientKey(id) }
        : { type: "recipe" as const, recipeId: id };
    const { url } = await saveCuratedPhoto(target, file, { author, license, licenseUrl });
    await audit(admin, "photos.upload", { type, id, author, license }, `上傳 ${id} 的照片`);
    return Response.json({ ok: true, url });
  } catch (error) {
    void logError("blob", "admin.photos.upload", error, { type, id });
    return Response.json({ error: error instanceof Error ? error.message : "上傳失敗" }, { status: 500 });
  }
}
