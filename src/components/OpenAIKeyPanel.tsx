"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  isValidKeyFormat,
  maskKey,
  OPENAI_KEY_HEADER,
  OPENAI_KEYS_URL,
} from "@/lib/openai-key";
import {
  clearOpenAIKey,
  onOpenAIKeyPanelRequest,
  saveOpenAIKey,
  useOpenAIKey,
} from "@/lib/openai-key-store";

// 錯誤訊息：伺服器回傳的文字，或介面翻譯的 key
type Status =
  | { type: "idle" }
  | { type: "verifying" }
  | { type: "error"; message: string }
  | { type: "saved" };

// 頁首的「API 金鑰」按鈕與設定面板
export default function OpenAIKeyPanel() {
  const t = useTranslations("KeyPanel");
  const savedKey = useOpenAIKey();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [reveal, setReveal] = useState(false);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const panelRef = useRef<HTMLDivElement>(null);

  // 其他地方（例如推薦失敗）要求打開面板
  useEffect(() => onOpenAIKeyPanelRequest(() => setOpen(true)), []);

  // 點面板外面或按 Esc 關閉
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function save() {
    const key = input.trim();
    if (!isValidKeyFormat(key)) {
      setStatus({ type: "error", message: t("errorFormat") });
      return;
    }

    setStatus({ type: "verifying" });
    try {
      const res = await fetch("/api/openai-key", {
        method: "POST",
        headers: { [OPENAI_KEY_HEADER]: key },
      });
      const data = await res.json();
      if (!data.ok) {
        setStatus({ type: "error", message: data.error ?? t("errorVerify") });
        return;
      }
    } catch {
      setStatus({ type: "error", message: t("errorNetwork") });
      return;
    }

    if (!saveOpenAIKey(key)) {
      setStatus({ type: "error", message: t("errorStorage") });
      return;
    }
    setInput("");
    setReveal(false);
    setStatus({ type: "saved" });
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex h-9 items-center gap-2 rounded-full border border-border px-3 text-[13px] text-muted transition hover:border-foreground hover:text-foreground"
      >
        <span
          className={`size-1.5 rounded-full ${savedKey ? "bg-green-600" : "bg-muted/50"}`}
          aria-hidden
        />
        <span>
          <span className="sm:hidden">{t("buttonShort")}</span>
          <span className="hidden whitespace-nowrap sm:inline">{t("button")}</span>
        </span>
        <span className="sr-only">{savedKey ? t("statusSet") : t("statusUnset")}</span>
      </button>

      {open && (
        <div className="fixed inset-x-4 top-[4.5rem] z-40 rounded-2xl border border-border bg-surface p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.25)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-[22rem]">
          <p className="eyebrow">OpenAI API Key</p>
          <h2 className="mt-1 font-serif text-xl">{t("title")}</h2>
          <p className="mt-1 text-xs text-muted">{t("intro")}</p>

          {savedKey && (
            <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-background px-3 py-2 text-sm">
              <span>
                <span className="text-green-600 dark:text-green-400">● {t("set")}</span>{" "}
                <code className="text-muted">{maskKey(savedKey)}</code>
              </span>
              <button
                type="button"
                onClick={() => {
                  clearOpenAIKey();
                  setStatus({ type: "idle" });
                }}
                className="text-xs text-muted underline hover:text-accent"
              >
                {t("remove")}
              </button>
            </div>
          )}

          <form
            className="mt-3"
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <div className="flex gap-2">
              <input
                type={reveal ? "text" : "password"}
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  if (status.type !== "verifying") setStatus({ type: "idle" });
                }}
                placeholder={savedKey ? t("placeholderReplace") : "sk-..."}
                autoComplete="off"
                spellCheck={false}
                className="field flex-1 !px-3 !py-2 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setReveal((value) => !value)}
                className="rounded-xl border border-border px-2 text-xs text-muted"
                aria-label={reveal ? t("hideKey") : t("showKey")}
              >
                {reveal ? t("hide") : t("show")}
              </button>
            </div>
            <button
              type="submit"
              disabled={!input.trim() || status.type === "verifying"}
              className="btn-primary mt-2 w-full"
            >
              {status.type === "verifying" ? t("verifying") : t("save")}
            </button>
          </form>

          {status.type === "error" && (
            <p className="mt-2 text-xs text-red-700 dark:text-red-300">{status.message}</p>
          )}
          {status.type === "saved" && (
            <p className="mt-2 text-xs text-green-700 dark:text-green-400">
              ✓ {t("saved")}
            </p>
          )}

          <p className="mt-4 border-l-2 border-accent pl-3 text-xs leading-relaxed text-muted">
            {t("privacy")}
          </p>
          <a
            href={OPENAI_KEYS_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-xs font-medium text-accent underline"
          >
            {t("getKey")} →
          </a>
        </div>
      )}
    </div>
  );
}
