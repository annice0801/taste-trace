"use client";

import { useState } from "react";
import { adminFetch, dateTime } from "./api";
import { Card, ErrorText, Loading } from "./ui";
import { useAdminData } from "./useAdminData";
import { useOperation } from "./useOperation";

type Version = { version: number; content: string; note: string; createdBy: string; createdAt: string; active: boolean };
type Prompt = {
  key: string;
  label: string;
  description: string;
  placeholders: string[];
  defaultContent: string;
  activeVersion: number;
  versions: Version[];
};

export default function PromptEditor() {
  const { data, error, reload } = useAdminData<{ prompts: Prompt[] }>("/api/admin/prompts");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  if (error) return <ErrorText message={error} />;
  if (!data) return <Loading />;
  const prompt = data.prompts.find((p) => p.key === selectedKey) ?? data.prompts[0]!;

  return (
    <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
      <nav aria-label="提示詞">
        <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {data.prompts.map((p) => (
            <li key={p.key} className="shrink-0">
              <button
                type="button"
                onClick={() => setSelectedKey(p.key)}
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                  p.key === prompt.key ? "border-foreground bg-surface" : "border-border text-muted hover:text-foreground"
                }`}
              >
                <span className="block font-medium">{p.label}</span>
                <span className="block text-xs text-muted">
                  {p.activeVersion ? `第 ${p.activeVersion} 版` : "內建預設"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      {/* key：切換提示詞時重設編輯中的內容 */}
      <PromptPanel key={`${prompt.key}:${prompt.activeVersion}:${prompt.versions.length}`} prompt={prompt} onSaved={reload} />
    </div>
  );
}

function PromptPanel({ prompt, onSaved }: { prompt: Prompt; onSaved: () => void }) {
  const { notify } = useOperation();
  const active = prompt.versions.find((v) => v.active);
  const activeContent = active?.content ?? prompt.defaultContent;
  const [content, setContent] = useState(activeContent);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const missing = prompt.placeholders.filter((name) => !content.includes(`{{${name}}}`));
  const dirty = content.trim() !== activeContent.trim();

  async function save() {
    setBusy(true);
    try {
      const { version } = await adminFetch<{ version: number }>("/api/admin/prompts", {
        method: "POST",
        body: JSON.stringify({ key: prompt.key, content, note }),
      });
      notify({ type: "success", message: `已儲存第 ${version} 版並立即生效` });
      setNote("");
      onSaved();
    } catch (err) {
      notify({ type: "error", message: err instanceof Error ? err.message : "儲存失敗" });
    } finally {
      setBusy(false);
    }
  }

  async function activate(version: number) {
    const label = version ? `第 ${version} 版` : "內建預設";
    if (!window.confirm(`把「${prompt.label}」切換到${label}？會立即生效。`)) return;
    setBusy(true);
    try {
      await adminFetch("/api/admin/prompts", { method: "PUT", body: JSON.stringify({ key: prompt.key, version }) });
      notify({ type: "success", message: `已切換到${label}` });
      onSaved();
    } catch (err) {
      notify({ type: "error", message: err instanceof Error ? err.message : "切換失敗" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <Card
        title={prompt.label}
        actions={<code className="text-xs text-muted">{prompt.key}</code>}
      >
        <p className="text-sm text-muted">{prompt.description}</p>
        {prompt.placeholders.length > 0 && (
          <p className="mt-2 text-xs text-muted">
            必要變數：
            {prompt.placeholders.map((name) => (
              <code
                key={name}
                className={`ml-1.5 rounded px-1.5 py-0.5 ${missing.includes(name) ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" : "bg-background"}`}
              >
                {`{{${name}}}`}
              </code>
            ))}
          </p>
        )}
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={14}
          spellCheck={false}
          className="field mt-4 font-mono !text-[13px] leading-relaxed"
          aria-label="提示詞內容"
        />
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={200}
            placeholder="這次改了什麼（選填），例：加強在地食材替代"
            className="field flex-1 !py-2 text-sm"
          />
          <button type="button" onClick={save} disabled={!dirty || missing.length > 0 || busy} className="btn-primary !py-2">
            儲存並生效
          </button>
          <button type="button" onClick={() => setContent(activeContent)} disabled={!dirty || busy} className="btn-secondary !py-2">
            還原
          </button>
        </div>
        {missing.length > 0 && (
          <p className="mt-2 text-xs text-red-700 dark:text-red-400">缺少必要變數，無法儲存。</p>
        )}
      </Card>

      <Card title="版本紀錄">
        <ul className="divide-y divide-border text-sm">
          {prompt.versions.map((version) => (
            <li key={version.version} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <p>
                  第 {version.version} 版{version.note && <span className="text-muted">・{version.note}</span>}
                  {version.active && <span className="ml-2 rounded-full bg-olive px-2 py-0.5 text-xs text-on-olive">使用中</span>}
                </p>
                <p className="text-xs text-muted">{dateTime.format(new Date(version.createdAt))}・{version.createdBy}</p>
              </div>
              <div className="flex gap-3 text-xs">
                <button type="button" onClick={() => setContent(version.content)} className="underline underline-offset-4">
                  載入編輯
                </button>
                {!version.active && (
                  <button type="button" onClick={() => activate(version.version)} disabled={busy} className="underline underline-offset-4">
                    切換到這版
                  </button>
                )}
              </div>
            </li>
          ))}
          <li className="flex flex-wrap items-center justify-between gap-2 py-2.5">
            <p>
              內建預設
              {!active && <span className="ml-2 rounded-full bg-olive px-2 py-0.5 text-xs text-on-olive">使用中</span>}
            </p>
            <div className="flex gap-3 text-xs">
              <button type="button" onClick={() => setContent(prompt.defaultContent)} className="underline underline-offset-4">
                載入編輯
              </button>
              {active && (
                <button type="button" onClick={() => activate(0)} disabled={busy} className="underline underline-offset-4">
                  改回內建預設
                </button>
              )}
            </div>
          </li>
        </ul>
      </Card>
    </div>
  );
}
