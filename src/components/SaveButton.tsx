"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { authClient, signInWithGoogle } from "@/lib/auth-client";

// 收藏／取消收藏；未登入時先導去 Google 登入
export default function SaveButton({
  recipeId,
  initialSaved,
  onChange,
}: {
  recipeId: string;
  initialSaved: boolean;
  onChange?: (saved: boolean) => void;
}) {
  const t = useTranslations("Save");
  const { data: session, isPending } = authClient.useSession();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    if (!session) {
      await signInWithGoogle();
      return;
    }

    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/favorites", {
        method: saved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("error"));
      setSaved(data.saved);
      onChange?.(data.saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={busy || isPending}
        aria-pressed={saved}
        className={`${saved ? "btn-primary" : "btn-secondary"} !px-4 !py-1.5 !text-[13px]`}
      >
        {saved ? t("saved") : session || isPending ? t("save") : t("signInToSave")}
      </button>
      {error && <span className="text-xs text-red-700 dark:text-red-300">{error}</span>}
    </span>
  );
}
