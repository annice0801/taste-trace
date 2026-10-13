import type { Instrumentation } from "next";

// 沒被路由自己接住的伺服器錯誤，一律寫進錯誤日誌（分類：未處理例外）
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logError } = await import("./lib/error-log");
  const digest =
    typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : undefined;
  await logError("unhandled", `${context.routeType}:${context.routePath}`, error, {
    method: request.method,
    path: request.path.split("?")[0], // 不記錄查詢參數
    digest,
  });
};
