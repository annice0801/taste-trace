"use client";

import { useState } from "react";
import { adminFetch } from "./api";
import { Card, ErrorText, Loading } from "./ui";
import { useAdminData } from "./useAdminData";
import { useOperation } from "./useOperation";

type ModelData = {
  current: { provider: "openai" | "gemini"; model: string };
  defaultOpenAIModel: string;
  providers: { provider: "openai" | "gemini"; label: string; configured: boolean; models: string[] | null }[];
};

// 預設推薦模型：切換前會先實際呼叫一次測試，成功才生效
export default function ModelSwitcher() {
  const { data, error, reload } = useAdminData<ModelData>("/api/admin/model");
  const { notify } = useOperation();
  const [choice, setChoice] = useState<{ provider: "openai" | "gemini"; model: string } | null>(null);
  const [saving, setSaving] = useState(false);

  if (error) return <Card title="預設推薦模型"><ErrorText message={error} /></Card>;
  if (!data) return <Card title="預設推薦模型"><Loading /></Card>;

  const selected = choice ?? data.current;
  const provider = data.providers.find((p) => p.provider === selected.provider)!;
  const changed = selected.provider !== data.current.provider || selected.model !== data.current.model;

  async function save() {
    setSaving(true);
    try {
      const { elapsedMs } = await adminFetch<{ elapsedMs: number }>("/api/admin/model", {
        method: "POST",
        body: JSON.stringify(selected),
      });
      notify({ type: "success", message: `測試成功（${elapsedMs} ms），已切換為 ${selected.model}` });
      setChoice(null);
      reload();
    } catch (err) {
      notify({ type: "error", message: err instanceof Error ? err.message : "切換失敗" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="預設推薦模型">
      <p className="text-sm text-muted">
        目前：<span className="font-medium text-foreground">{data.current.provider === "gemini" ? "Google Gemini" : "OpenAI"}・{data.current.model}</span>
        。使用者在瀏覽器設定自己的 OpenAI 金鑰時，一律用 OpenAI（後台選 Gemini 時改用 {data.defaultOpenAIModel}）。
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="text-sm">
          供應商
          <select
            value={selected.provider}
            onChange={(event) => {
              const next = data.providers.find((p) => p.provider === event.target.value)!;
              setChoice({ provider: next.provider, model: next.models?.[0] ?? "" });
            }}
            className="field mt-1 sm:w-48"
          >
            {data.providers.map((p) => (
              <option key={p.provider} value={p.provider} disabled={!p.configured}>
                {p.label}{p.configured ? "" : "（未設定金鑰）"}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 flex-1 text-sm">
          模型
          {provider.models && provider.models.length > 0 ? (
            <select
              value={selected.model}
              onChange={(event) => setChoice({ provider: selected.provider, model: event.target.value })}
              className="field mt-1 font-mono"
            >
              {!provider.models.includes(selected.model) && <option value={selected.model}>{selected.model}</option>}
              {provider.models.map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          ) : (
            <input
              value={selected.model}
              onChange={(event) => setChoice({ provider: selected.provider, model: event.target.value })}
              placeholder="模型名稱"
              className="field mt-1 font-mono"
            />
          )}
        </label>
        <button type="button" onClick={save} disabled={!changed || saving || !selected.model} className="btn-primary !py-2.5">
          {saving ? "測試中…" : "測試並切換"}
        </button>
      </div>
      {data.providers.some((p) => !p.configured) && (
        <p className="mt-3 text-xs text-muted">
          要使用 Gemini，請在 .env.local（以及 Vercel 的環境變數）加上 <code>GEMINI_API_KEY</code>，重新啟動後就能選。
        </p>
      )}
      {provider.models === null && provider.configured && (
        <p className="mt-3 text-xs text-red-700 dark:text-red-400">讀取 {provider.label} 的模型清單失敗，可以直接輸入模型名稱。</p>
      )}
    </Card>
  );
}
