import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// 二階段確認的憑證：預覽時發給前端，執行時必須帶回來。
// 綁定「哪個管理員、哪個操作、哪些參數」，5 分鐘內有效，參數被改過就會失效。
const TTL_MS = 5 * 60 * 1000;

function secret(): string {
  const value = process.env.BETTER_AUTH_SECRET;
  if (!value) throw new Error("缺少 BETTER_AUTH_SECRET");
  return value;
}

function paramsHash(params: unknown): string {
  return createHash("sha256").update(JSON.stringify(params ?? null)).digest("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(`admin-confirm:${payload}`).digest("base64url");
}

export function createConfirmToken(adminId: string, action: string, params: unknown): string {
  const payload = Buffer.from(
    JSON.stringify({ u: adminId, a: action, p: paramsHash(params), e: Date.now() + TTL_MS }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyConfirmToken(
  token: string,
  adminId: string,
  action: string,
  params: unknown,
): { ok: true } | { ok: false; reason: string } {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return { ok: false, reason: "確認憑證格式錯誤" };
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return { ok: false, reason: "確認憑證無效" };
  }
  const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
    u: string;
    a: string;
    p: string;
    e: number;
  };
  if (data.e < Date.now()) return { ok: false, reason: "確認已逾時，請重新預覽" };
  if (data.u !== adminId || data.a !== action || data.p !== paramsHash(params)) {
    return { ok: false, reason: "確認內容與操作不符，請重新預覽" };
  }
  return { ok: true };
}
