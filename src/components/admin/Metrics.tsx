"use client";

import { useState } from "react";
import { tagLabel } from "@/lib/tag-labels";
import { BarRow, Card, ErrorText, Loading, PageHeader, Stat } from "./ui";
import { useAdminData } from "./useAdminData";

type MetricsData = {
  days: number;
  cuisines: { slug: string; label: string; group: "country" | "course" | "chef"; searches: number; favorites: number }[];
  tags: { tag: string; impressions: number; opens: number; ctr: number | null; favorites: number }[];
  daily: { date: string; searches: number }[];
  totals: { searches: number; favorites: number; impressions: number; opens: number };
};

const GROUP_LABELS = { country: "依國家", course: "依料理類型", chef: "名廚" } as const;

export default function Metrics() {
  const [days, setDays] = useState(30);
  const { data, error, loading } = useAdminData<MetricsData>(`/api/admin/metrics?days=${days}`);

  return (
    <>
      <PageHeader
        title="使用統計"
        description="菜系熱度與標籤點擊率，可作為首頁策展的參考。點擊率 = 點開「食材與做法」的次數 ÷ 推薦結果中出現的次數（匿名統計）。"
        actions={
          <div className="flex gap-1 rounded-full border border-border p-0.5 text-sm">
            {[7, 30, 90, 365].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setDays(value)}
                className={`rounded-full px-3 py-1 ${days === value ? "bg-foreground text-background" : "text-muted"}`}
              >
                {value === 365 ? "一年" : `${value} 天`}
              </button>
            ))}
          </div>
        }
      />
      {error && <ErrorText message={error} />}
      {!data && !error && <Loading />}
      {data && (
        <div className={`space-y-6 ${loading ? "opacity-60" : ""}`}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="推薦次數" value={data.totals.searches} />
            <Stat label="新增收藏" value={data.totals.favorites} />
            <Stat label="推薦曝光（道）" value={data.totals.impressions} />
            <Stat
              label="整體點擊率"
              value={data.totals.impressions ? `${Math.round((data.totals.opens / data.totals.impressions) * 100)}%` : "—"}
              note={`點開 ${data.totals.opens} 次`}
            />
          </div>

          {data.daily.length > 1 && <DailyChart daily={data.daily} />}

          <div className="grid gap-6 xl:grid-cols-2">
            {(["country", "course", "chef"] as const).map((group) => {
              const rows = data.cuisines.filter((row) => row.group === group);
              const max = Math.max(1, ...rows.map((row) => Math.max(row.searches, row.favorites)));
              const totalSearches = rows.reduce((sum, row) => sum + row.searches, 0);
              return (
                <Card key={group} title={`熱門${GROUP_LABELS[group]}`}>
                  <div className="mb-3 flex gap-4 text-xs text-muted">
                    <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-olive" />查詢</span>
                    <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-accent" />收藏</span>
                  </div>
                  <ul className="space-y-3">
                    {rows.map((row) => (
                      <li key={row.slug}>
                        <BarRow
                          label={row.label}
                          value={row.searches}
                          max={max}
                          suffix={totalSearches ? `・${Math.round((row.searches / totalSearches) * 100)}%` : ""}
                        />
                        <div className="mt-1 grid grid-cols-[7rem_1fr_3.5rem] items-center gap-3">
                          <span />
                          <span className="h-1.5 overflow-hidden rounded-full bg-background">
                            <span className="block h-full rounded-full bg-accent" style={{ width: `${(row.favorites / max) * 100}%` }} />
                          </span>
                          <span className="text-right text-xs text-muted tabular-nums">{row.favorites}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}

            <div className="xl:col-span-2">
            <Card title="標籤點擊率">
              {data.tags.length === 0 ? (
                <p className="text-sm text-muted">這段期間還沒有資料。使用者看到推薦、點開做法後就會開始累積。</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[28rem] text-sm">
                    <thead className="text-xs text-muted">
                      <tr>
                        <th className="pb-2 text-left font-normal">標籤</th>
                        <th className="pb-2 text-right font-normal">曝光</th>
                        <th className="pb-2 text-right font-normal">點開</th>
                        <th className="pb-2 text-right font-normal">點擊率</th>
                        <th className="pb-2 text-right font-normal">收藏</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.tags.map((row) => (
                        <tr key={row.tag}>
                          <td className="py-2">{tagLabel(row.tag)}</td>
                          <td className="py-2 text-right tabular-nums">{row.impressions}</td>
                          <td className="py-2 text-right tabular-nums">{row.opens}</td>
                          <td className="py-2 text-right tabular-nums">
                            {row.ctr === null ? "—" : `${Math.round(row.ctr * 100)}%`}
                          </td>
                          <td className="py-2 text-right tabular-nums">{row.favorites}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// 每日推薦次數（簡單長條圖）
function DailyChart({ daily }: { daily: { date: string; searches: number }[] }) {
  const max = Math.max(1, ...daily.map((row) => row.searches));
  return (
    <Card title="每日推薦次數">
      <div className="flex h-32 items-end gap-0.5" role="img" aria-label="每日推薦次數長條圖">
        {daily.map((row) => (
          <div key={row.date} className="group relative flex-1">
            <div className="rounded-t bg-olive/80 group-hover:bg-olive" style={{ height: `${Math.max(2, (row.searches / max) * 128)}px` }} />
            <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background group-hover:block">
              {row.date.slice(5)}：{row.searches}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>{daily[0]!.date}</span>
        <span>{daily[daily.length - 1]!.date}</span>
      </div>
    </Card>
  );
}
