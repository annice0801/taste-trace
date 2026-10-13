import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Suspense } from "react";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminShell from "@/components/admin/AdminShell";
import { getAdmin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const displayLatin = Instrument_Serif({
  variable: "--font-display-latin",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Taste-Trace 管理後台",
  robots: { index: false, follow: false },
};

// 後台是獨立的根版面（不經過語系路由，也不顯示網站頁首）
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="zh-Hant-TW" className={`${geistSans.variable} ${geistMono.variable} ${displayLatin.variable} h-full antialiased`}>
      <body className="min-h-full bg-background font-sans">
        <Suspense fallback={<p className="p-8 text-sm text-muted">確認管理員身分中…</p>}>
          <AdminGate>{children}</AdminGate>
        </Suspense>
      </body>
    </html>
  );
}

// 只有 ADMIN_EMAILS 裡的帳號能進；其他已登入的帳號看到的是「找不到頁面」
async function AdminGate({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();
  if (admin) return <AdminShell admin={admin}>{children}</AdminShell>;
  const user = await getCurrentUser();
  return <AdminLogin signedInAs={user?.email ?? null} />;
}
