import "server-only";

// Vercel Blob 的讀寫金鑰。去掉頭尾的空白與引號：
// 從 .env.local 複製到 Vercel 時常連引號一起貼上，會造成「Access denied」
export function blobToken(): string | undefined {
  const raw = process.env.BLOB_READ_WRITE_TOKEN;
  return raw ? raw.trim().replace(/^["']|["']$/g, "").trim() : undefined;
}
