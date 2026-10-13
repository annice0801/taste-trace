"use client";

// 上傳前在瀏覽器壓縮：最長邊縮到 maxSize、轉成 JPEG。
// 重新繪製會一併移除 EXIF（包含拍照位置），也讓檔案小於 Vercel 的請求上限。
export async function compressImage(
  file: File,
  maxSize = 1600,
  quality = 0.85,
): Promise<{ blob: Blob; width: number; height: number }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("photoUnreadable"); // 錯誤訊息是 messages 的 Errors 底下的 key
  }

  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("photoUnsupported");
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!blob) throw new Error("photoCompress");
  return { blob, width, height };
}
