"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { canAccess, PAGE_PERMISSIONS, type AdminInfo, type AdminPermission } from "@/lib/admin-permissions";
import { authClient } from "@/lib/auth-client";
import { OperationProvider } from "./useOperation";

const NAV: { href: string; label: string; need: AdminPermission | "owner" | null }[] = [
  { href: "/admin", label: "總覽", need: null },
  { href: "/admin/logs", label: "錯誤日誌", need: "logs" },
  { href: "/admin/prompts", label: "Prompt 與模型", need: "prompts" },
  { href: "/admin/photos", label: "照片管理", need: "photos" },
  { href: "/admin/assets", label: "圖片與儲存", need: "assets" },
  { href: "/admin/users", label: "使用者", need: "users" },
  { href: "/admin/metrics", label: "使用統計", need: "metrics" },
  { href: "/admin/maintenance", label: "資料維護", need: "maintenance" },
  { href: "/admin/admins", label: "管理員與權限", need: "owner" },
];

export default function AdminShell({ admin, children }: { admin: AdminInfo; children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  // 只顯示有權限的功能；直接輸入網址進沒有權限的頁面時顯示提示
  const nav = NAV.filter((item) => canAccess(admin, item.need));
  const pageNeed = PAGE_PERMISSIONS.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? null;
  const allowed = canAccess(admin, pageNeed);

  return (
    <OperationProvider>
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="border-b border-border bg-surface lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0">
          <div className="flex items-center justify-between px-5 py-4 lg:block lg:py-6">
            <div>
              <p className="font-serif text-xl">
                Taste<span className="text-accent italic">—</span>Trace
              </p>
              <p className="text-xs text-muted">管理後台</p>
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="btn-secondary !px-3 !py-1.5 !text-xs lg:hidden"
              aria-expanded={menuOpen}
            >
              {menuOpen ? "收起" : "選單"}
            </button>
          </div>
          <nav className={`${menuOpen ? "block" : "hidden"} px-3 pb-4 lg:block`} aria-label="後台導覽">
            <ul className="space-y-0.5 text-sm">
              {nav.map((item) => {
                const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={`block rounded-lg px-3 py-2 transition ${
                        active ? "bg-foreground text-background" : "text-muted hover:bg-background hover:text-foreground"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6 border-t border-border px-3 pt-4 text-xs text-muted">
              <p className="truncate">{admin.email}</p>
              <p className="mt-0.5">{admin.isOwner ? "擁有者" : "管理員"}</p>
              <div className="mt-2 flex gap-3">
                <Link href="/" className="underline underline-offset-4 hover:text-foreground">回網站</Link>
                <button
                  type="button"
                  onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => window.location.reload() } })}
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  登出
                </button>
              </div>
            </div>
          </nav>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-10">
          {allowed ? (
            children
          ) : (
            <div className="mx-auto mt-16 max-w-md text-center">
              <h1 className="font-serif text-3xl">沒有這項功能的權限</h1>
              <p className="mt-3 text-sm text-muted">請聯絡網站擁有者幫你開啟。</p>
            </div>
          )}
        </main>
      </div>
    </OperationProvider>
  );
}
