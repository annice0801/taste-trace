"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Admin } from "@/lib/admin";
import { authClient } from "@/lib/auth-client";
import { OperationProvider } from "./useOperation";

const NAV = [
  { href: "/admin", label: "總覽" },
  { href: "/admin/logs", label: "錯誤日誌" },
  { href: "/admin/prompts", label: "Prompt 與模型" },
  { href: "/admin/photos", label: "照片管理" },
  { href: "/admin/assets", label: "圖片與儲存" },
  { href: "/admin/users", label: "使用者" },
  { href: "/admin/metrics", label: "使用統計" },
  { href: "/admin/maintenance", label: "資料維護" },
];

export default function AdminShell({ admin, children }: { admin: Admin; children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

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
              {NAV.map((item) => {
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
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-10">{children}</main>
      </div>
    </OperationProvider>
  );
}
