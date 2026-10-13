"use client";

import { useTranslations } from "next-intl";
import { signInWithGoogle } from "@/lib/auth-client";

export default function LoginPrompt({
  message,
  callbackURL, // 預設回到目前頁面（含語系前綴）
}: {
  message?: string;
  callbackURL?: string;
}) {
  const t = useTranslations("Login");
  return (
    <div className="mt-10 rounded-2xl border border-border bg-surface px-6 py-12 text-center">
      <p className="font-serif text-2xl">{t("title")}</p>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">{message ?? t("favorites")}</p>
      <button
        type="button"
        onClick={() => signInWithGoogle(callbackURL)}
        className="btn-primary mt-6"
      >
        {t("google")}
      </button>
    </div>
  );
}
