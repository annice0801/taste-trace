"use client";

import { useState } from "react";
import { dateTime } from "./api";
import { ErrorText, Loading, PageHeader } from "./ui";
import { useAdminData } from "./useAdminData";
import { useOperation } from "./useOperation";

type UserRow = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: string | null;
  banned: boolean;
  banReason: string | null;
  isAdmin: boolean;
  favorites: number;
  creations: number;
  searches: number;
};

export default function UserList() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const params = new URLSearchParams({ q: query, status, page: String(page) });
  const { data, error, loading, reload } = useAdminData<{ total: number; pageSize: number; users: UserRow[] }>(
    `/api/admin/users?${params}`,
  );
  const { run } = useOperation();

  async function ban(user: UserRow) {
    const reason = window.prompt(`停權原因（會記錄在操作紀錄）：${user.email}`, "大量洗請求");
    if (reason === null) return;
    if (await run("user.ban", { userId: user.id, reason })) reload();
  }

  const pages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <>
      <PageHeader title="使用者" description="用 Google 登入註冊的帳號。停權後會立即登出所有裝置，也無法再登入；管理員帳號不能被停權。" />
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(q.trim());
          setPage(0);
        }}
      >
        <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="搜尋姓名或 Email" className="field flex-1" />
        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }} className="field sm:w-36">
          <option value="all">全部</option>
          <option value="banned">已停權</option>
        </select>
        <button type="submit" className="btn-primary">搜尋</button>
      </form>

      <div className="mt-5">
        {error && <ErrorText message={error} />}
        {!data && !error && <Loading />}
        {data && (
          <>
            <p className="mb-2 text-xs text-muted">共 {data.total} 位</p>
            <div className={`overflow-x-auto rounded-2xl border border-border bg-surface ${loading ? "opacity-60" : ""}`}>
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs text-muted">
                  <tr>
                    <th className="px-4 py-3 font-normal">使用者</th>
                    <th className="hidden px-3 py-3 font-normal md:table-cell">建立時間</th>
                    <th className="hidden px-3 py-3 text-right font-normal sm:table-cell">推薦</th>
                    <th className="hidden px-3 py-3 text-right font-normal sm:table-cell">收藏</th>
                    <th className="hidden px-3 py-3 text-right font-normal sm:table-cell">作品</th>
                    <th className="px-4 py-3 text-right font-normal">狀態</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.users.map((user) => (
                    <tr key={user.id} className={user.banned ? "bg-red-50/60 dark:bg-red-950/20" : ""}>
                      <td className="max-w-0 px-4 py-3 sm:max-w-none">
                        <div className="flex items-center gap-3">
                          {user.image ? (
                            // eslint-disable-next-line @next/next/no-img-element -- Google 頭像，不經過圖片最佳化
                            <img src={user.image} alt="" referrerPolicy="no-referrer" className="size-8 rounded-full bg-border" />
                          ) : (
                            <span className="flex size-8 items-center justify-center rounded-full bg-accent-soft font-serif text-accent">{user.name.slice(0, 1)}</span>
                          )}
                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {user.name}
                              {user.isAdmin && <span className="ml-2 rounded-full bg-olive px-2 py-0.5 text-[10px] text-on-olive">管理員</span>}
                            </span>
                            <span className="block truncate text-xs text-muted">{user.email}</span>
                            {/* 手機只顯示一欄，數字放在名稱下面 */}
                            <span className="block text-[11px] text-muted sm:hidden">
                              推薦 {user.searches}・收藏 {user.favorites}・作品 {user.creations}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="hidden px-3 py-3 text-xs text-muted md:table-cell">{user.createdAt ? dateTime.format(new Date(user.createdAt)) : "—"}</td>
                      <td className="hidden px-3 py-3 text-right tabular-nums sm:table-cell">{user.searches}</td>
                      <td className="hidden px-3 py-3 text-right tabular-nums sm:table-cell">{user.favorites}</td>
                      <td className="hidden px-3 py-3 text-right tabular-nums sm:table-cell">{user.creations}</td>
                      <td className="px-4 py-3 text-right">
                        {user.isAdmin ? (
                          <span className="text-xs text-muted">—</span>
                        ) : user.banned ? (
                          <span className="inline-flex flex-col items-end gap-1">
                            <span className="text-xs text-red-700 dark:text-red-400" title={user.banReason ?? ""}>已停權</span>
                            <button type="button" onClick={async () => (await run("user.unban", { userId: user.id })) && reload()} className="text-xs underline underline-offset-4">
                              解除停權
                            </button>
                          </span>
                        ) : (
                          <button type="button" onClick={() => ban(user)} className="text-xs text-red-700 underline underline-offset-4 dark:text-red-400">
                            停權
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-3 text-sm">
                <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="btn-secondary !py-1.5">上一頁</button>
                <span className="text-muted tabular-nums">{page + 1} / {pages}</span>
                <button type="button" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} className="btn-secondary !py-1.5">下一頁</button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
