"use client";

import { useRef, useState } from "react";
import { compressImage } from "@/lib/compress-image";
import { ErrorText, Loading, PageHeader } from "./ui";
import { useAdminData } from "./useAdminData";
import { useOperation } from "./useOperation";

type Status = "manual" | "auto" | "missing" | "pending";
type Row = {
  id: string;
  name: string;
  subtitle: string;
  image: { url: string; source: string; author: string; license: string; licenseUrl: string } | null;
  status: Status;
};
type PhotosData = { rows: Row[]; counts: Record<Status, number>; regions: { id: string; label: string }[] };

const STATUS_LABELS: Record<Status, string> = {
  manual: "手動上傳",
  auto: "自動找到",
  missing: "找不到合格照片",
  pending: "還沒找",
};
// 常用授權與條款連結
const LICENSE_PRESETS: Record<string, string> = {
  自行拍攝: "",
  CC0: "https://creativecommons.org/publicdomain/zero/1.0/",
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
  "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
  "CC BY-SA 3.0": "https://creativecommons.org/licenses/by-sa/3.0/",
};
const SOURCE_LABELS: Record<string, string> = { unsplash: "Unsplash", wikimedia: "Wikimedia", custom: "手動", openverse: "Openverse" };

// 照片管理：自動搜尋找不到或找錯的照片，由管理員上傳自己的照片遞補（存在 Vercel Blob）
export default function PhotoManager() {
  const [type, setType] = useState<"ingredient" | "recipe">("ingredient");
  const [status, setStatus] = useState("missing");
  const [region, setRegion] = useState("");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const params = new URLSearchParams({ type, status, ...(region && type === "ingredient" && { region }), ...(query && { q: query }) });
  const { data, error, loading, reload } = useAdminData<PhotosData>(`/api/admin/photos?${params}`);
  const [editing, setEditing] = useState<Row | null>(null);
  const [filling, setFilling] = useState(false);
  const { notify } = useOperation();

  // 立即替還沒找過的食材找照片（不用等有人打開頁面）
  async function autoFill() {
    setFilling(true);
    try {
      const res = await fetch("/api/admin/photos/fill", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "自動補照片失敗");
      notify({
        type: "success",
        message: data.tried === 0 ? "沒有還沒找過的食材" : `找了 ${data.tried} 種，補上 ${data.found} 張；還有 ${data.remaining} 種沒找`,
      });
      reload();
    } catch (err) {
      notify({ type: "error", message: err instanceof Error ? err.message : "自動補照片失敗" });
    } finally {
      setFilling(false);
    }
  }

  return (
    <>
      <PageHeader
        title="照片管理"
        description="自動搜尋找不到或找錯的照片，可以上傳自己的照片遞補。照片存在 Vercel Blob，標記為手動後，自動搜尋與照片檢查都不會覆蓋。請只上傳自己拍攝或授權允許使用的照片。"
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-full border border-border p-0.5 text-sm">
          {[
            ["ingredient", "食材與當季蔬果"],
            ["recipe", "食譜封面"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value as "ingredient" | "recipe")}
              className={`rounded-full px-3 py-1 ${type === value ? "bg-foreground text-background" : "text-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {type === "ingredient" && data && data.regions.length > 0 && (
          <select value={region} onChange={(event) => setRegion(event.target.value)} className="field !w-auto !py-1.5 text-sm">
            <option value="">所有食材</option>
            {data.regions.map((r) => (
              <option key={r.id} value={r.id}>當季蔬果・{r.label}</option>
            ))}
          </select>
        )}
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(q.trim());
          }}
        >
          <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="搜尋名稱" className="field !w-40 !py-1.5 text-sm" />
          <button type="submit" className="btn-secondary !px-3 !py-1.5 !text-sm">搜尋</button>
        </form>
      </div>

      {type === "ingredient" && (data?.counts.pending ?? 0) > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
          <span className="text-muted">
            有 {data!.counts.pending} 種食材還沒找過照片（要等有人打開頁面才會找）。
          </span>
          <button type="button" onClick={autoFill} disabled={filling} className="btn-primary !px-4 !py-1.5 !text-sm">
            {filling ? "找照片中…（約 30 秒）" : "立即自動補照片（一次 12 種）"}
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          ["missing", `缺照片（${(data?.counts.missing ?? 0) + (data?.counts.pending ?? 0)}）`],
          ["manual", `手動上傳（${data?.counts.manual ?? 0}）`],
          ["auto", `自動找到（${data?.counts.auto ?? 0}）`],
          ["all", "全部"],
        ].map(([value, label]) => (
          <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)} className="chip">
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {error && <ErrorText message={error} />}
        {!data && !error && <Loading />}
        {data && data.rows.length === 0 && <p className="py-10 text-center text-sm text-muted">沒有符合的項目。</p>}
        {data && data.rows.length > 0 && (
          <ul className={`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 ${loading ? "opacity-60" : ""}`}>
            {data.rows.map((row) => (
              <li key={row.id} className="overflow-hidden rounded-xl border border-border bg-surface">
                <button type="button" onClick={() => setEditing(row)} className="block w-full text-left" aria-label={`編輯 ${row.name} 的照片`}>
                  {row.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- 後台預覽
                    <img src={row.image.url} alt={row.name} loading="lazy" className="aspect-square w-full bg-border object-cover" />
                  ) : (
                    <span className="flex aspect-square w-full items-center justify-center bg-accent-soft font-serif text-4xl text-accent/70">
                      {row.name.slice(0, 1)}
                    </span>
                  )}
                  <span className="block p-2.5">
                    <span className="block truncate text-sm font-medium">{row.name}</span>
                    <span className="block truncate text-[11px] text-muted">{row.subtitle || "—"}</span>
                    {row.image && row.status === "auto" && (
                      <span className="mt-1 mr-1 inline-block rounded-full bg-background px-2 py-0.5 text-[10px] text-muted">
                        {SOURCE_LABELS[row.image.source] ?? row.image.source}
                      </span>
                    )}
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] ${
                      row.status === "manual" ? "bg-olive text-on-olive" : row.status === "auto" ? "bg-background text-muted" : "bg-accent-soft text-accent"
                    }`}>
                      {STATUS_LABELS[row.status]}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <UploadDialog
          key={editing.id}
          type={type}
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function UploadDialog({
  type,
  row,
  onClose,
  onSaved,
}: {
  type: "ingredient" | "recipe";
  row: Row;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { run, notify } = useOperation();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [author, setAuthor] = useState(row.status === "manual" ? row.image?.author ?? "" : "");
  const [license, setLicense] = useState(row.status === "manual" ? row.image?.license ?? "自行拍攝" : "自行拍攝");
  const [licenseUrl, setLicenseUrl] = useState(row.status === "manual" ? row.image?.licenseUrl ?? "" : "");
  const [busy, setBusy] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(picked: File | undefined) {
    if (!picked?.type.startsWith("image/")) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  }

  async function upload() {
    if (!file) return;
    try {
      setBusy("壓縮中…");
      // 食材用方形卡片，1200px 就夠；食譜封面是橫幅，保留 1600px
      const { blob } = await compressImage(file, type === "ingredient" ? 1200 : 1600, 0.85);
      setBusy("上傳中…");
      const form = new FormData();
      form.set("file", new File([blob], "photo.jpg", { type: "image/jpeg" }));
      form.set("type", type);
      form.set("id", row.id);
      form.set("author", author.trim());
      form.set("license", license.trim());
      form.set("licenseUrl", licenseUrl.trim());
      const res = await fetch("/api/admin/photos", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "上傳失敗");
      notify({ type: "success", message: `已更新「${row.name}」的照片` });
      onSaved();
    } catch (err) {
      notify({ type: "error", message: err instanceof Error ? err.message : "上傳失敗" });
      setBusy("");
    }
  }

  async function removeManual() {
    if (await run("photos.removeCurated", { type, id: row.id })) onSaved();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="presentation" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`${row.name} 的照片`} className="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-5" onClick={(event) => event.stopPropagation()}>
        <h2 className="font-serif text-2xl">{row.name}</h2>
        <p className="text-sm text-muted">{row.subtitle}・{STATUS_LABELS[row.status]}</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <figure>
            <figcaption className="mb-1 text-xs text-muted">目前</figcaption>
            {row.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- 後台預覽
              <img src={row.image.url} alt="目前的照片" className="aspect-square w-full rounded-lg bg-border object-cover" />
            ) : (
              <span className="flex aspect-square items-center justify-center rounded-lg bg-accent-soft text-sm text-muted">沒有照片</span>
            )}
            {row.image && (row.image.author || row.image.license) && (
              <p className="mt-1 truncate text-[11px] text-muted">{[row.image.author, row.image.license].filter(Boolean).join("・")}</p>
            )}
          </figure>
          <figure>
            <figcaption className="mb-1 text-xs text-muted">新照片</figcaption>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-background text-sm text-muted hover:border-foreground"
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- 本機預覽
                <img src={preview} alt="準備上傳的照片" className="size-full object-cover" />
              ) : (
                "選擇照片"
              )}
            </button>
            <input ref={inputRef} type="file" accept="image/*" className="sr-only" onChange={(event) => pick(event.target.files?.[0])} />
          </figure>
        </div>
        {type === "ingredient" && <p className="mt-2 text-[11px] text-muted">食材照片會裁成正方形顯示，請讓食材在畫面中央。</p>}

        <label className="mt-4 block text-sm">
          攝影者（選填）
          <input value={author} onChange={(event) => setAuthor(event.target.value)} maxLength={80} placeholder="例：王小明" className="field mt-1 !py-2" />
        </label>
        <label className="mt-3 block text-sm">
          授權
          <input
            value={license}
            onChange={(event) => {
              setLicense(event.target.value);
              // 選了常用授權時自動帶入條款連結
              if (event.target.value in LICENSE_PRESETS) setLicenseUrl(LICENSE_PRESETS[event.target.value]!);
            }}
            maxLength={80}
            list="license-presets"
            className="field mt-1 !py-2"
          />
          <datalist id="license-presets">
            {Object.keys(LICENSE_PRESETS).map((preset) => (
              <option key={preset} value={preset} />
            ))}
          </datalist>
        </label>
        <label className="mt-3 block text-sm">
          授權條款連結（選填）
          <input
            value={licenseUrl}
            onChange={(event) => setLicenseUrl(event.target.value)}
            maxLength={300}
            placeholder="https://creativecommons.org/licenses/by-sa/4.0/"
            className="field mt-1 !py-2 font-mono text-xs"
          />
        </label>
        <p className="mt-2 text-[11px] text-muted">
          網站上會顯示「攝影者・授權」，授權文字會連到條款。使用 Wikimedia Commons 等 CC 授權照片時，請填原作者、授權與條款連結。
        </p>

        <div className="mt-5 flex flex-wrap justify-between gap-2">
          {row.status === "manual" ? (
            <button type="button" onClick={removeManual} disabled={Boolean(busy)} className="text-sm text-red-700 underline underline-offset-4 dark:text-red-400">
              移除手動照片，改回自動搜尋
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={Boolean(busy)} className="btn-secondary !py-2">取消</button>
            <button type="button" onClick={upload} disabled={!file || Boolean(busy)} className="btn-primary !py-2">
              {busy || (row.image ? "上傳並取代" : "上傳")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
