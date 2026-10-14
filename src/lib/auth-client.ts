import { createAuthClient } from "better-auth/react";

// 登入 API 和網站同一個網址，所以在瀏覽器直接用目前網址；
// 預先產生頁面（伺服器端）時不會呼叫登入 API，給一個固定值即可，
// 避免讀到設定錯誤的 BETTER_AUTH_URL 讓整個建置失敗
export const authClient = createAuthClient({
  baseURL: typeof window === "undefined" ? "http://localhost:3000" : window.location.origin,
});

export function signInWithGoogle(callbackURL = window.location.pathname) {
  return authClient.signIn.social({ provider: "google", callbackURL });
}
