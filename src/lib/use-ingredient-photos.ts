"use client";

import { useEffect, useState } from "react";
import { openAIKeyHeaders } from "./openai-key-store";

export type IngredientPhoto = {
  url: string;
  source: "unsplash" | "wikimedia" | "custom"; // custom：管理員上傳
  author: string;
  authorUrl: string;
  sourceUrl: string;
  license: string | null;
  licenseUrl: string | null;
};
export type PhotoState = Record<string, IngredientPhoto | null | undefined>; // undefined：還在找

// 食材照片：每種食材全站只找一次；一次沒找完（額度保護）就再要一次，最多 3 輪
export function useIngredientPhotos(names: string[]): PhotoState {
  const [photos, setPhotos] = useState<PhotoState>({});
  const namesKey = names.join("\n");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let pending = namesKey.split("\n");
      for (let round = 0; round < 3 && pending.length > 0 && !cancelled; round++) {
        try {
          const res = await fetch("/api/ingredient-images", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...openAIKeyHeaders() },
            body: JSON.stringify({ names: pending.slice(0, 40) }),
          });
          if (!res.ok) break;
          const data = (await res.json()) as {
            images: Record<string, IngredientPhoto | null>;
            pending: string[];
          };
          if (cancelled) return;
          setPhotos((current) => {
            const next = { ...current };
            for (const [name, photo] of Object.entries(data.images)) {
              if (photo || !data.pending.includes(name)) next[name] = photo;
            }
            return next;
          });
          if (data.pending.length >= pending.length) break; // 沒有進展就不再重試
          pending = data.pending;
        } catch {
          break;
        }
      }
      // 結束後還沒有結果的，一律顯示文字卡
      if (!cancelled) {
        setPhotos((current) => {
          const next = { ...current };
          for (const name of namesKey.split("\n")) if (next[name] === undefined) next[name] = null;
          return next;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [namesKey]);

  return photos;
}
