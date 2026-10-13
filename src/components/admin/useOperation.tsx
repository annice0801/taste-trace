"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { adminFetch } from "./api";

type Preview = {
  title: string;
  summary: string;
  count: number;
  items: string[];
  risk: "high" | "medium";
  confirmPhrase: string | null;
};

type Pending = {
  action: string;
  params: unknown;
  preview: Preview;
  token: string;
  resolve: (message: string | null) => void;
};

type Toast = { type: "success" | "error"; message: string } | null;

const OperationContext = createContext<{
  run: (action: string, params?: unknown) => Promise<string | null>;
  notify: (toast: NonNullable<Toast>) => void;
} | null>(null);

// 高風險操作的二階段確認：
//   第一段：向伺服器要「預覽」（會影響多少資料），彈窗顯示
//   第二段：管理員按下確認（高風險還要輸入確認文字）後，帶著預覽的憑證執行
export function OperationProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  const notify = useCallback((next: NonNullable<Toast>) => {
    setToast(next);
    window.setTimeout(() => setToast((current) => (current === next ? null : current)), 5000);
  }, []);

  const run = useCallback(
    async (action: string, params: unknown = {}) => {
      try {
        const { preview, token } = await adminFetch<{ preview: Preview; token: string }>("/api/admin/ops", {
          method: "POST",
          body: JSON.stringify({ action, params, phase: "preview" }),
        });
        return await new Promise<string | null>((resolve) =>
          setPending({ action, params, preview, token, resolve }),
        );
      } catch (error) {
        notify({ type: "error", message: error instanceof Error ? error.message : "預覽失敗" });
        return null;
      }
    },
    [notify],
  );

  return (
    <OperationContext.Provider value={{ run, notify }}>
      {children}
      {pending && (
        <ConfirmDialog
          key={pending.token}
          pending={pending}
          onClose={(message) => {
            pending.resolve(message);
            setPending(null);
            if (message) notify({ type: "success", message });
          }}
          onError={(message) => notify({ type: "error", message })}
        />
      )}
      {toast && (
        <div
          role="status"
          className={`fixed right-4 bottom-4 z-[60] max-w-sm rounded-xl px-4 py-3 text-sm shadow-lg ${
            toast.type === "success" ? "bg-foreground text-background" : "bg-red-700 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </OperationContext.Provider>
  );
}

export function useOperation() {
  const context = useContext(OperationContext);
  if (!context) throw new Error("useOperation 必須在 OperationProvider 裡使用");
  return context;
}

function ConfirmDialog({
  pending,
  onClose,
  onError,
}: {
  pending: Pending;
  onClose: (message: string | null) => void;
  onError: (message: string) => void;
}) {
  const { preview } = pending;
  const [typed, setTyped] = useState("");
  const [running, setRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const phraseOk = !preview.confirmPhrase || typed.trim() === preview.confirmPhrase;
  const nothingToDo = preview.count === 0;

  useEffect(() => {
    // 預設焦點放在「取消」或輸入框，避免按 Enter 就直接執行
    (preview.confirmPhrase ? inputRef.current : cancelRef.current)?.focus();
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && !running && onClose(null);
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [preview.confirmPhrase, running, onClose]);

  async function execute() {
    setRunning(true);
    try {
      const { message } = await adminFetch<{ message: string }>("/api/admin/ops", {
        method: "POST",
        body: JSON.stringify({
          action: pending.action,
          params: pending.params,
          phase: "execute",
          token: pending.token,
        }),
      });
      onClose(message);
    } catch (error) {
      onError(error instanceof Error ? error.message : "執行失敗");
      setRunning(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="presentation">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-summary"
        className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl"
      >
        <p className={`text-xs font-medium tracking-wide ${preview.risk === "high" ? "text-red-700 dark:text-red-400" : "text-accent"}`}>
          {preview.risk === "high" ? "高風險操作・需要確認" : "請確認"}
        </p>
        <h2 id="confirm-title" className="mt-1 font-serif text-2xl">{preview.title}</h2>
        <p id="confirm-summary" className="mt-3 text-sm leading-relaxed">{preview.summary}</p>

        {preview.items.length > 0 && (
          <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-lg bg-background p-3 text-xs text-muted">
            {preview.items.map((item) => (
              <li key={item} className="truncate">{item}</li>
            ))}
            {preview.count > preview.items.length && <li>…還有 {preview.count - preview.items.length} 筆</li>}
          </ul>
        )}

        {nothingToDo ? (
          <p className="mt-4 text-sm text-muted">沒有需要處理的資料。</p>
        ) : (
          preview.confirmPhrase && (
            <label className="mt-5 block text-sm">
              請輸入 <code className="rounded bg-background px-1.5 py-0.5 font-mono text-red-700 dark:text-red-400">{preview.confirmPhrase}</code> 確認
              <input
                ref={inputRef}
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                onPaste={(event) => event.preventDefault()} // 要自己打，避免直接貼上
                autoComplete="off"
                className="field mt-2"
              />
            </label>
          )
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button ref={cancelRef} type="button" onClick={() => onClose(null)} disabled={running} className="btn-secondary !py-2">
            取消
          </button>
          {!nothingToDo && (
            <button
              type="button"
              onClick={execute}
              disabled={!phraseOk || running}
              className={`btn-primary !py-2 ${preview.risk === "high" ? "!bg-red-700 !text-white" : ""}`}
            >
              {running ? "執行中…" : "確認執行"}
            </button>
          )}
        </div>
        <p className="mt-3 text-right text-[11px] text-muted">確認有效時間 5 分鐘</p>
      </div>
    </div>
  );
}
