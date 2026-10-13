"use client";

import { useState } from "react";
import { dateTime } from "./api";
import { Card, ErrorText, Loading } from "./ui";
import { useAdminData } from "./useAdminData";
import { useOperation } from "./useOperation";

type CreationRow = {
  id: string;
  url: string;
  caption: string;
  visibility: "public" | "private";
  recipeTitle: string;
  userName: string;
  userEmail: string;
  createdAt: string;
};

// 作品照審核：最新上傳在前，可以一次選多張從 Blob 與資料庫同步下架
export default function ModerationWall() {
  const [visibility, setVisibility] = useState("public");
  const [before, setBefore] = useState<string | null>(null);
  const query = new URLSearchParams({ visibility, ...(before && { before }) });
  const { data, error, loading, reload } = useAdminData<{ creations: CreationRow[]; hasMore: boolean }>(
    `/api/admin/creations?${query}`,
  );
  const { run } = useOperation();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<CreationRow | null>(null);

  async function takedown(ids: string[]) {
    const message = await run("creations.takedown", { ids });
    if (message) {
      setSelected(new Set());
      setPreview(null);
      reload();
    }
  }

  return (
    <Card
      title="作品照審核"
      actions={
        <div className="flex gap-1 rounded-full border border-border p-0.5 text-xs">
          {[
            ["public", "公開的"],
            ["private", "私人的"],
            ["all", "全部"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => { setVisibility(value); setBefore(null); setSelected(new Set()); }}
              className={`rounded-full px-3 py-1 ${visibility === value ? "bg-foreground text-background" : "text-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
      }
    >
      <p className="text-xs text-muted">公開的作品會出現在食譜頁，其他人看得到；發現不雅或侵權內容時，選取後下架。</p>
      {selected.size > 0 && (
        <button type="button" onClick={() => takedown([...selected])} className="btn-primary mt-4 !bg-red-700 !py-2 !text-sm !text-white">
          下架選取的 {selected.size} 張
        </button>
      )}
      <div className="mt-4">
        {error && <ErrorText message={error} />}
        {!data && !error && <Loading />}
        {data && data.creations.length === 0 && <p className="py-8 text-center text-sm text-muted">沒有作品照。</p>}
        {data && data.creations.length > 0 && (
          <ul className={`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 ${loading ? "opacity-60" : ""}`}>
            {data.creations.map((creation) => {
              const checked = selected.has(creation.id);
              return (
                <li key={creation.id} className={`overflow-hidden rounded-xl border-2 bg-background ${checked ? "border-red-600" : "border-transparent"}`}>
                  <button type="button" onClick={() => setPreview(creation)} className="block w-full" aria-label="放大檢視">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 審核預覽 */}
                    <img src={creation.url} alt={creation.caption || creation.recipeTitle} loading="lazy" className="aspect-square w-full bg-border object-cover" />
                  </button>
                  <div className="p-2 text-xs">
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          setSelected((current) => {
                            const next = new Set(current);
                            if (event.target.checked) next.add(creation.id);
                            else next.delete(creation.id);
                            return next;
                          })
                        }
                        className="mt-0.5 size-3.5 accent-red-600"
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{creation.recipeTitle}</span>
                        <span className="block truncate text-muted">{creation.userName}</span>
                        <span className="block text-muted">
                          {creation.visibility === "public" ? "公開" : "私人"}・{dateTime.format(new Date(creation.createdAt))}
                        </span>
                      </span>
                    </label>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {data?.hasMore && (
          <button type="button" onClick={() => setBefore(data.creations[data.creations.length - 1]!.createdAt)} className="btn-secondary mt-4 w-full !py-2">
            看更早的作品
          </button>
        )}
      </div>

      {preview && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4" onClick={() => setPreview(null)} role="presentation">
          <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl bg-surface p-4" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="作品照">
            {/* eslint-disable-next-line @next/next/no-img-element -- 審核預覽 */}
            <img src={preview.url} alt={preview.caption || preview.recipeTitle} className="max-h-[60vh] w-full rounded-lg object-contain" />
            <p className="mt-3 font-medium">{preview.recipeTitle}</p>
            <p className="text-sm text-muted">{preview.userName}・{preview.userEmail}</p>
            {preview.caption && <p className="mt-2 text-sm whitespace-pre-line">{preview.caption}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setPreview(null)} className="btn-secondary !py-2">關閉</button>
              <button type="button" onClick={() => takedown([preview.id])} className="btn-primary !bg-red-700 !py-2 !text-white">下架這張</button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
