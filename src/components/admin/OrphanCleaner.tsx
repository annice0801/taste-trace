"use client";

import { useState } from "react";
import { dateTime, formatBytes } from "./api";
import { Card, ErrorText, Loading, Stat } from "./ui";
import { useAdminData } from "./useAdminData";
import { useOperation } from "./useOperation";

type AssetsData = {
  totalCount: number;
  totalBytes: number;
  orphanCount: number;
  orphanBytes: number;
  orphans: { url: string; pathname: string; size: number; uploadedAt: string }[];
};

// 孤兒圖片：比對 Blob 的檔案清單與資料庫裡實際引用的網址
export default function OrphanCleaner() {
  const { data, error, loading, reload } = useAdminData<AssetsData>("/api/admin/assets");
  const { run } = useOperation();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function remove(urls?: string[]) {
    const message = await run("blob.deleteOrphans", urls ? { urls } : {});
    if (message) {
      setSelected(new Set());
      reload();
    }
  }

  return (
    <Card
      title="孤兒圖片清理"
      actions={
        <button type="button" onClick={reload} disabled={loading} className="btn-secondary !px-3 !py-1.5 !text-xs">
          {loading ? "比對中…" : "重新比對"}
        </button>
      }
    >
      {error && <ErrorText message={error} />}
      {!data && !error && <Loading />}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Blob 檔案" value={data.totalCount} />
            <Stat label="使用容量" value={formatBytes(data.totalBytes)} />
            <Stat label="孤兒檔案" value={data.orphanCount} tone={data.orphanCount ? "warn" : undefined} />
            <Stat label="可釋放" value={formatBytes(data.orphanBytes)} />
          </div>
          <p className="mt-3 text-xs text-muted">
            孤兒檔案：在 Blob 裡，但沒有任何作品照紀錄引用。刪除時會再比對一次，預覽後才被引用的檔案不會被刪。CDN 快取可能讓已刪除的檔案短暫仍可開啟。
          </p>

          {data.orphans.length > 0 && (
            <>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={() => remove()} className="btn-primary !bg-red-700 !py-2 !text-sm !text-white">
                  刪除全部 {data.orphanCount} 個孤兒檔案
                </button>
                {selected.size > 0 && (
                  <button type="button" onClick={() => remove([...selected])} className="btn-secondary !py-2 !text-sm">
                    只刪除選取的 {selected.size} 個
                  </button>
                )}
              </div>
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {data.orphans.map((file) => {
                  const checked = selected.has(file.url);
                  return (
                    <li key={file.url}>
                      <label className={`block cursor-pointer overflow-hidden rounded-xl border-2 ${checked ? "border-red-600" : "border-transparent"}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- 孤兒檔案預覽，不經過圖片最佳化 */}
                        <img src={file.url} alt={file.pathname} loading="lazy" className="aspect-square w-full bg-border object-cover" />
                        <span className="flex items-center gap-2 bg-background px-2 py-1.5 text-[11px] text-muted">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) =>
                              setSelected((current) => {
                                const next = new Set(current);
                                if (event.target.checked) next.add(file.url);
                                else next.delete(file.url);
                                return next;
                              })
                            }
                            className="size-3.5 accent-red-600"
                          />
                          <span className="min-w-0 truncate">
                            {formatBytes(file.size)}・{dateTime.format(new Date(file.uploadedAt))}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </>
      )}
    </Card>
  );
}
