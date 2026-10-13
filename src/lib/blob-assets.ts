import "server-only";
import { list } from "@vercel/blob";
import { connectDB } from "./mongodb";
import { CreationModel } from "@/models/Creation";

export type BlobFile = { url: string; pathname: string; size: number; uploadedAt: string };

// 列出 Blob 裡的所有檔案（分頁讀完）
export async function listAllBlobs(): Promise<BlobFile[]> {
  const files: BlobFile[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ cursor, limit: 1000 });
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

// 資料庫裡有被引用的 Blob 網址（目前只有作品照）
export async function referencedBlobUrls(): Promise<Set<string>> {
  await connectDB();
  const creations = await CreationModel.find({}, { url: 1 }).lean();
  return new Set(creations.map((creation) => creation.url));
}

// 孤兒檔案：在 Blob 裡，但資料庫沒有任何地方引用
export async function findOrphanBlobs(): Promise<{ all: BlobFile[]; orphans: BlobFile[] }> {
  const [all, referenced] = await Promise.all([listAllBlobs(), referencedBlobUrls()]);
  return { all, orphans: all.filter((file) => !referenced.has(file.url)) };
}
