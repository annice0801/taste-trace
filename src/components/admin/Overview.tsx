"use client";

import Link from "next/link";
import { ERROR_CATEGORIES, type ErrorCategory } from "@/lib/error-categories";
import { dateTime } from "./api";
import { Card, ErrorText, Loading, PageHeader, Stat } from "./ui";
import { useAdminData } from "./useAdminData";

type OverviewData = {
  counts: Record<string, number>;
  errorsByCategory: { category: ErrorCategory; count: number }[];
  recentAudit: { id: string; adminEmail: string; action: string; result: string; createdAt: string }[];
  model: { provider: string; model: string };
};

export default function Overview() {
  const { data, error } = useAdminData<OverviewData>("/api/admin/overview");
  if (error) return <ErrorText message={error} />;
  if (!data) return <Loading />;
  const { counts } = data;
  const errors24h = data.errorsByCategory.reduce((sum, row) => sum + row.count, 0);

  return (
    <>
      <PageHeader title="總覽" description="網站目前的資料量、近 24 小時的錯誤與最近的管理操作。" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="使用者" value={counts.users} note={counts.banned ? `停權 ${counts.banned} 人` : undefined} />
        <Stat label="食譜" value={counts.recipes} note={`已產生做法 ${counts.recipesWithDetail}`} />
        <Stat label="收藏" value={counts.favorites} />
        <Stat label="作品照" value={counts.creations} note={`公開 ${counts.publicCreations}`} />
        <Stat label="推薦次數・24 小時" value={counts.searches24h} note={`7 天 ${counts.searches7d}`} />
        <Stat label="錯誤・24 小時" value={errors24h} tone={errors24h > 0 ? "warn" : undefined} />
        <Stat label="未處理的錯誤" value={counts.unresolvedErrors} tone={counts.unresolvedErrors > 0 ? "warn" : undefined} />
        <Stat label="預設模型" value={<span className="text-lg">{data.model.model}</span>} note={data.model.provider === "gemini" ? "Google Gemini" : "OpenAI"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="近 24 小時錯誤" actions={<Link href="/admin/logs" className="text-sm underline underline-offset-4">看日誌 →</Link>}>
          {data.errorsByCategory.length === 0 ? (
            <p className="text-sm text-muted">沒有錯誤。</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {data.errorsByCategory.map((row) => (
                <li key={row.category} className="flex justify-between py-2">
                  <Link href={`/admin/logs?category=${row.category}`} className="hover:underline">
                    {ERROR_CATEGORIES[row.category] ?? row.category}
                  </Link>
                  <span className="tabular-nums text-red-700 dark:text-red-400">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="最近的管理操作">
          {data.recentAudit.length === 0 ? (
            <p className="text-sm text-muted">還沒有操作紀錄。</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {data.recentAudit.map((row) => (
                <li key={row.id} className="py-2">
                  <p>{row.result || row.action}</p>
                  <p className="text-xs text-muted">
                    {dateTime.format(new Date(row.createdAt))}・{row.adminEmail}・<code>{row.action}</code>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
