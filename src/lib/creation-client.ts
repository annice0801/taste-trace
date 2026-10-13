"use client";

import { compressImage } from "./compress-image";
import type {
  CreationItem,
  CreationUpdate,
  CreationVisibility,
} from "./recommendation";

export type CreationFieldsValue = {
  caption: string;
  note: string;
  visibility: CreationVisibility;
};

async function readJson(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "generic");
  return data;
}

// 壓縮後上傳作品照；onStatus 回報目前進度（messages 的 Creations.status 底下的 key）
export async function uploadCreationFile({
  file,
  recipeId,
  fields,
  markCooked,
  onStatus,
}: {
  file: File;
  recipeId: string;
  fields: CreationFieldsValue;
  markCooked: boolean;
  onStatus: (step: "compressing" | "uploading") => void;
}): Promise<CreationItem> {
  onStatus("compressing");
  const { blob, width, height } = await compressImage(file);

  onStatus("uploading");
  const form = new FormData();
  form.set("file", new File([blob], "creation.jpg", { type: "image/jpeg" }));
  form.set("recipeId", recipeId);
  form.set("caption", fields.caption.trim());
  form.set("note", fields.note.trim());
  form.set("visibility", fields.visibility);
  form.set("width", String(width));
  form.set("height", String(height));
  form.set("markCooked", String(markCooked));

  const data = await readJson(await fetch("/api/creations", { method: "POST", body: form }));
  return data.creation as CreationItem;
}

export async function patchCreation(update: CreationUpdate): Promise<CreationItem> {
  const data = await readJson(
    await fetch("/api/creations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    }),
  );
  return data.creation as CreationItem;
}

export async function deleteCreationRequest(id: string): Promise<void> {
  await readJson(
    await fetch("/api/creations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }),
  );
}
