"use client";

import { authClient, signInWithGoogle } from "@/lib/auth-client";

export default function AdminLogin({ signedInAs }: { signedInAs: string | null }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <p className="eyebrow">Taste-Trace Admin</p>
      <h1 className="mt-3 font-serif text-4xl">管理後台</h1>
      {signedInAs ? (
        <>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            目前登入的帳號 {signedInAs} 沒有後台權限。
          </p>
          <button
            type="button"
            onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => window.location.reload() } })}
            className="btn-secondary mt-6"
          >
            登出並改用管理員帳號
          </button>
        </>
      ) : (
        <>
          <p className="mt-4 text-sm leading-relaxed text-muted">請用管理員的 Google 帳號登入。</p>
          <button type="button" onClick={() => signInWithGoogle("/admin")} className="btn-primary mt-6">
            用 Google 登入
          </button>
        </>
      )}
    </main>
  );
}
