"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ERROR_CATEGORIES, type ErrorCategory } from "@/lib/error-categories";
import { adminFetch, dateTime } from "./api";
import { ErrorText, Loading, PageHeader } from "./ui";
import { useAdminData } from "./useAdminData";
import { useOperation } from "./useOperation";

type Log = {
  id: string;
  category: ErrorCategory;
  scope: string;
  message: string;
  status: number | null;
  meta: Record<string, unknown> | null;
  resolved: boolean;
  createdAt: string;
};
type LogsData = { logs: Log[]; hasMore: boolean; counts24h: Record<string, number>; counts7d: Record<string, number> };

export default function ErrorLogs() {
  const searchParams = useSearchParams();
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [status, setStatus] = useState("open");
  const [before, setBefore] = useState<string | null>(null);
  const query = new URLSearchParams({ ...(category && { category }), status, ...(before && { before }) });
  const { data, error, loading, reload } = useAdminData<LogsData>(`/api/admin/logs?${query}`);
  const { run, notify } = useOperation();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);

  async function mark(ids: string[], resolved: boolean) {
    try {
      await adminFetch("/api/admin/logs", { method: "PATCH", body: JSON.stringify({ ids, resolved }) });
      setSelected(new Set());
      reload();
    } catch (err) {
      notify({ type: "error", message: err instanceof Error ? err.message : "更新失敗" });
    }
  }

  const categories = Object.keys(ERROR_CATEGORIES) as ErrorCategory[];

  return (
    <>
      <PageHeader
        title="錯誤日誌"
        description="伺服器錯誤依分類記錄，保留 30 天。金鑰與 token 會自動遮蔽。處理完的錯誤標記為「已處理」，就不會出現在待處理清單。"
        actions={
          <button
            type="button"
            onClick={async () => (await run("db.clearErrorLogs", { ...(category && { category }), resolvedOnly: true })) && reload()}
            className="btn-secondary !py-2 !text-sm"
          >
            清除已處理的日誌
          </button>
        }
      />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <button type="button" aria-pressed={!category} onClick={() => { setCategory(""); setBefore(null); }} className="chip shrink-0">
          全部
        </button>
        {categories.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={category === key}
            onClick={() => { setCategory(key); setBefore(null); }}
            className="chip shrink-0"
          >
            {ERROR_CATEGORIES[key]}
            {data?.counts24h[key] ? <span className="ml-1.5 text-xs text-red-700 dark:text-red-400">{data.counts24h[key]}</span> : null}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">紅色數字是近 24 小時的錯誤數</p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full border border-border p-0.5 text-sm">
          {[
            ["open", "待處理"],
            ["resolved", "已處理"],
            ["all", "全部"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => { setStatus(value); setBefore(null); }}
              className={`rounded-full px-3 py-1 ${status === value ? "bg-foreground text-background" : "text-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {selected.size > 0 && (
          <div className="flex gap-2">
            <button type="button" onClick={() => mark([...selected], true)} className="btn-primary !py-1.5 !text-sm">
              標記 {selected.size} 筆為已處理
            </button>
            <button type="button" onClick={() => mark([...selected], false)} className="btn-secondary !py-1.5 !text-sm">
              改回待處理
            </button>
          </div>
        )}
      </div>

      <div className="mt-4">
        {error && <ErrorText message={error} />}
        {!data && loading && <Loading />}
        {data && data.logs.length === 0 && <p className="py-10 text-center text-sm text-muted">沒有符合的錯誤。</p>}
        {data && data.logs.length > 0 && (
          <ul className={`divide-y divide-border rounded-2xl border border-border bg-surface ${loading ? "opacity-60" : ""}`}>
            {data.logs.map((log) => (
              <li key={log.id} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(log.id)}
                    onChange={(event) =>
                      setSelected((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.add(log.id);
                        else next.delete(log.id);
                        return next;
                      })
                    }
                    className="mt-1 size-4 accent-[var(--foreground)]"
                    aria-label="選取"
                  />
                  <button type="button" onClick={() => setExpanded(expanded === log.id ? null : log.id)} className="min-w-0 flex-1 text-left">
                    <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-800 dark:bg-red-950 dark:text-red-300">
                        {ERROR_CATEGORIES[log.category] ?? log.category}
                      </span>
                      <code>{log.scope}</code>
                      {log.status && <span>HTTP {log.status}</span>}
                      <span>{dateTime.format(new Date(log.createdAt))}</span>
                      {log.resolved && <span className="text-green-700 dark:text-green-400">已處理</span>}
                    </p>
                    <p className={`mt-1 text-sm ${expanded === log.id ? "break-words whitespace-pre-wrap" : "truncate"}`}>{log.message}</p>
                  </button>
                </div>
                {expanded === log.id && log.meta && (
                  <pre className="mt-2 ml-7 overflow-x-auto rounded-lg bg-background p-3 text-xs">{JSON.stringify(log.meta, null, 2)}</pre>
                )}
              </li>
            ))}
          </ul>
        )}
        {data?.hasMore && (
          <button
            type="button"
            onClick={() => setBefore(data.logs[data.logs.length - 1]!.createdAt)}
            className="btn-secondary mt-4 w-full !py-2"
          >
            看更早的錯誤
          </button>
        )}
        {before && (
          <button type="button" onClick={() => setBefore(null)} className="mt-2 w-full text-center text-sm text-muted underline">
            回到最新
          </button>
        )}
      </div>
    </>
  );
}
