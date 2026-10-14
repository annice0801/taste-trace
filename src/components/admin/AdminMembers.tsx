"use client";

import { useState } from "react";
import { ADMIN_PERMISSIONS, PERMISSION_KEYS, type AdminPermission } from "@/lib/admin-permissions";
import { dateTime } from "./api";
import { Card, ErrorText, Loading, PageHeader } from "./ui";
import { useAdminData } from "./useAdminData";
import { useOperation } from "./useOperation";

type Member = {
  email: string;
  name: string;
  signedUp: boolean;
  permissions: AdminPermission[];
  note: string;
  addedBy: string;
  createdAt: string;
};
type AdminsData = { owners: { email: string; name: string }[]; members: Member[] };

// 管理員與權限：擁有者（ADMIN_EMAILS）可以新增管理員、勾選權限、移除
export default function AdminMembers() {
  const { data, error, reload } = useAdminData<AdminsData>("/api/admin/admins");
  const { run } = useOperation();

  return (
    <>
      <PageHeader
        title="管理員與權限"
        description="新增其他人協助管理網站，並勾選他能使用哪些功能。對方用該 Google 帳號登入 /admin 就能使用；沒有勾選的功能看不到，也無法透過網址或 API 使用。新增、修改、移除都會記錄在操作紀錄。"
      />
      {error && <ErrorText message={error} />}
      {!data && !error && <Loading />}
      {data && (
        <div className="space-y-6">
          <AddMember onSaved={reload} />

          <Card title={`管理員（${data.members.length}）`}>
            {data.members.length === 0 ? (
              <p className="text-sm text-muted">還沒有新增其他管理員。</p>
            ) : (
              <ul className="divide-y divide-border">
                {data.members.map((member) => (
                  <MemberRow
                    key={member.email}
                    member={member}
                    onSaved={reload}
                    onRemove={async () => (await run("admins.remove", { email: member.email })) && reload()}
                  />
                ))}
              </ul>
            )}
          </Card>

          <Card title="擁有者">
            <p className="mb-3 text-sm text-muted">
              寫在環境變數 ADMIN_EMAILS 的帳號，擁有全部權限並能管理其他管理員；要變更請修改環境變數後重新部署。
            </p>
            <ul className="divide-y divide-border text-sm">
              {data.owners.map((owner) => (
                <li key={owner.email} className="flex items-center justify-between py-2">
                  <span>
                    {owner.name && <span className="font-medium">{owner.name}・</span>}
                    {owner.email}
                  </span>
                  <span className="rounded-full bg-olive px-2.5 py-0.5 text-xs text-on-olive">全部權限</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}

function PermissionPicker({ value, onChange, idPrefix }: { value: AdminPermission[]; onChange: (next: AdminPermission[]) => void; idPrefix: string }) {
  return (
    <fieldset className="flex flex-wrap gap-2">
      <legend className="sr-only">權限</legend>
      {PERMISSION_KEYS.map((key) => {
        const checked = value.includes(key);
        return (
          <label
            key={key}
            htmlFor={`${idPrefix}-${key}`}
            className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
              checked ? "border-foreground bg-foreground text-background" : "border-border text-muted hover:border-foreground"
            }`}
          >
            <input
              id={`${idPrefix}-${key}`}
              type="checkbox"
              checked={checked}
              onChange={(event) => onChange(event.target.checked ? [...value, key] : value.filter((k) => k !== key))}
              className="sr-only"
            />
            {checked ? "✓ " : ""}
            {ADMIN_PERMISSIONS[key]}
          </label>
        );
      })}
    </fieldset>
  );
}

function AddMember({ onSaved }: { onSaved: () => void }) {
  const { run } = useOperation();
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [permissions, setPermissions] = useState<AdminPermission[]>(["photos"]);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function add() {
    if (await run("admins.save", { email: email.trim(), permissions, note: note.trim() })) {
      setEmail("");
      setNote("");
      setPermissions(["photos"]);
      onSaved();
    }
  }

  return (
    <Card title="新增管理員">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
        <label className="text-sm">
          Google 帳號 Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="name@gmail.com" className="field mt-1 !py-2" />
        </label>
        <label className="text-sm">
          備註（選填）
          <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={100} placeholder="例：負責照片審核" className="field mt-1 !py-2" />
        </label>
      </div>
      <p className="mt-4 mb-2 text-sm">可以使用的功能</p>
      <PermissionPicker value={permissions} onChange={setPermissions} idPrefix="new" />
      <p className="mt-2 text-xs text-muted">所有管理員都能看「總覽」。「使用者」包含停權，「圖片與儲存」包含刪除檔案與下架作品，開放前請確認。</p>
      <button type="button" onClick={add} disabled={!valid} className="btn-primary mt-4 !py-2">
        新增管理員
      </button>
    </Card>
  );
}

function MemberRow({ member, onSaved, onRemove }: { member: Member; onSaved: () => void; onRemove: () => void }) {
  const { run } = useOperation();
  const [permissions, setPermissions] = useState(member.permissions);
  const changed = [...permissions].sort().join() !== [...member.permissions].sort().join();

  async function save() {
    if (await run("admins.save", { email: member.email, permissions, note: member.note })) onSaved();
  }

  return (
    <li className="py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">
            {member.name || member.email}
            {!member.signedUp && <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] text-accent">尚未登入過</span>}
          </p>
          <p className="text-xs text-muted">
            {member.name && `${member.email}・`}
            {member.note && `${member.note}・`}由 {member.addedBy || "—"} 於 {dateTime.format(new Date(member.createdAt))} 新增
          </p>
        </div>
        <button type="button" onClick={onRemove} className="text-xs text-red-700 underline underline-offset-4 dark:text-red-400">
          移除
        </button>
      </div>
      <div className="mt-3">
        <PermissionPicker value={permissions} onChange={setPermissions} idPrefix={member.email} />
      </div>
      {changed && (
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={save} className="btn-primary !px-4 !py-1.5 !text-xs">儲存權限</button>
          <button type="button" onClick={() => setPermissions(member.permissions)} className="btn-secondary !px-4 !py-1.5 !text-xs">還原</button>
        </div>
      )}
    </li>
  );
}
