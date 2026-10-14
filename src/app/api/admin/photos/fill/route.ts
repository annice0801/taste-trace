import { requireAdmin } from "@/lib/admin";
import { audit } from "@/lib/admin-ops";
import { resolveIngredientImages } from "@/lib/ingredient-images";
import { connectDB } from "@/lib/mongodb";
import { IngredientImageModel } from "@/models/IngredientImage";

const BATCH = 12; // 一次最多處理幾種食材（每輪最多找 6 種，跑兩輪）

// 手動觸發找照片：處理還沒找過照片的食材（Unsplash → 維基百科），不用等有人打開頁面
export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;

  await connectDB();
  // 剛查過維基百科也沒找到的（等 Unsplash 額度恢復）排到最後，避免一直重找同幾種
  const pending = await IngredientImageModel.find(
    { "image.url": { $exists: false }, imageCheckedAt: { $exists: false }, englishName: { $exists: true }, manual: { $ne: true } },
    { key: 1 },
  )
    .sort({ wikiCheckedAt: 1 })
    .limit(BATCH)
    .lean();
  let names = pending.map((doc) => doc.key);
  let found = 0;
  for (let round = 0; round < 2 && names.length > 0; round++) {
    const { images, pending: left } = await resolveIngredientImages(names, null);
    found += Object.entries(images).filter(([name, photo]) => photo && !left.includes(name)).length;
    names = left;
  }
  const remaining = await IngredientImageModel.countDocuments({
    "image.url": { $exists: false },
    imageCheckedAt: { $exists: false },
    manual: { $ne: true },
  });
  await audit(admin, "photos.fill", { tried: pending.length }, `補上 ${found} 張，還有 ${remaining} 種沒找`);
  return Response.json({ tried: pending.length, found, remaining });
}
