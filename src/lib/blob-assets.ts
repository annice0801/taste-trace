import "server-only";
import { list } from "@vercel/blob";
import { blobToken } from "./blob-token";
import { connectDB } from "./mongodb";
import { CreationModel } from "@/models/Creation";
import { IngredientImageModel } from "@/models/IngredientImage";
import { RecipeModel } from "@/models/Recipe";

export type BlobFile = { url: string; pathname: string; size: number; uploadedAt: string };

// 列出 Blob 裡的所有檔案（分頁讀完）
export async function listAllBlobs(): Promise<BlobFile[]> {
  const files: BlobFile[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ cursor, limit: 1000, token: blobToken() });
    for (const blob of page.blobs) {
      files.push({
        url: blob.url,
        pathname: blob.pathname,
        size: blob.size,
        uploadedAt: new Date(blob.uploadedAt).toISOString(),
      });
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return files;
}

// 資料庫裡有被引用的 Blob 網址：作品照、管理員上傳的食材與食譜照片
export async function referencedBlobUrls(): Promise<Set<string>> {
  await connectDB();
  const [creations, ingredients, recipes] = await Promise.all([
    CreationModel.find({}, { url: 1 }).lean(),
    IngredientImageModel.find({ "image.source": "custom" }, { image: 1 }).lean(),
    RecipeModel.find({ "image.source": "custom" }, { image: 1 }).lean(),
  ]);
  return new Set([
    ...creations.map((creation) => creation.url),
    ...ingredients.flatMap((doc) => (doc.image?.url ? [doc.image.url] : [])),
    ...recipes.flatMap((doc) => (doc.image?.url ? [doc.image.url] : [])),
  ]);
}

// 孤兒檔案：在 Blob 裡，但資料庫沒有任何地方引用
export async function findOrphanBlobs(): Promise<{ all: BlobFile[]; orphans: BlobFile[] }> {
  const [all, referenced] = await Promise.all([listAllBlobs(), referencedBlobUrls()]);
  return { all, orphans: all.filter((file) => !referenced.has(file.url)) };
}
