"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { authClient, signInWithGoogle } from "@/lib/auth-client";
import { NAV_LINKS } from "@/lib/nav";
import BasketDrawer from "./BasketDrawer";
import LanguageSwitcher from "./LanguageSwitcher";
import OpenAIKeyPanel from "./OpenAIKeyPanel";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-serif text-xl tracking-tight ${className}`}>
      Taste<span className="text-accent italic">—</span>Trace
    </span>
  );
}

export default function SiteHeader() {
  const t = useTranslations("Header");
  const tn = useTranslations("Nav");
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  // 換頁後選單自動收起
  const menuOpen = menuOpenOn === pathname;

  function signOut() {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
          router.refresh();
        },
      },
    });
  }

  const linkClass = (href: string) =>
    `transition hover:text-foreground ${
      pathname === href.split("#")[0] && !href.includes("#") ? "text-foreground" : "text-muted"
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" aria-label={t("home")}>
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-6 text-sm lg:flex xl:gap-7" aria-label={t("mainNav")}>
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={`${linkClass(link.href)} whitespace-nowrap`}>
              {tn(link.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 text-sm">
          <BasketDrawer />
          <OpenAIKeyPanel />
          <div className="hidden items-center gap-3 lg:flex">
            {isPending ? null : session ? (
              <>
                <span className="max-w-32 truncate text-muted">{session.user.name}</span>
                <button type="button" onClick={signOut} className="whitespace-nowrap text-muted hover:text-foreground">
                  {t("signOut")}
                </button>
              </>
            ) : (
              <button type="button" onClick={() => signInWithGoogle()} className="whitespace-nowrap text-muted hover:text-foreground">
                {t("signIn")}
              </button>
            )}
          </div>
          {/* 語言切換放在最右邊（原本「開始使用」的位置）；手機上在選單按鈕左邊 */}
          <LanguageSwitcher />

          <button
            type="button"
            onClick={() => setMenuOpenOn(menuOpen ? null : pathname)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
            className="flex size-9 items-center justify-center rounded-full border border-border lg:hidden"
          >
            <span className="relative block h-2.5 w-4" aria-hidden>
              <span
                className={`absolute left-0 h-px w-4 bg-foreground transition ${menuOpen ? "top-1 rotate-45" : "top-0"}`}
              />
              <span
                className={`absolute left-0 h-px w-4 bg-foreground transition ${menuOpen ? "top-1 -rotate-45" : "top-2.5"}`}
              />
            </span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          className="border-t border-border bg-background px-4 pb-6 pt-2 lg:hidden"
          aria-label={t("mobileNav")}
        >
          <ul className="divide-y divide-border">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMenuOpenOn(null)}
                  className="flex items-center justify-between py-3.5 font-serif text-lg"
                >
                  {tn(link.key)}
                  <span className="text-muted" aria-hidden>→</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
            {isPending ? (
              <span />
            ) : session ? (
              <>
                <span className="min-w-0 truncate text-muted">{session.user.name}</span>
                <button type="button" onClick={signOut} className="btn-secondary !py-2">
                  {t("signOut")}
                </button>
              </>
            ) : (
              <button type="button" onClick={() => signInWithGoogle()} className="btn-primary w-full">
                {t("signInGoogle")}
              </button>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
