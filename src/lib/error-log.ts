import "server-only";
import { after } from "next/server";
import { connectDB } from "./mongodb";
import { ErrorLogModel, type ErrorCategory } from "@/models/ErrorLog";

// 把金鑰、token 之類的字串遮掉，避免寫進日誌
function redact(text: string): string {
  return text
    // 整段金鑰都遮掉（包含 OpenAI 自己部分遮蔽、留下末 4 碼的格式）
    .replace(/sk-[^\s"',)]+/g, "sk-***")
    .replace(/AIza[^\s"',)]+/g, "AIza***")
    .replace(/(Bearer|Client-ID)\s+[^\s"']+/gi, "$1 ***")
    .replace(/vercel_blob_rw_[A-Za-z0-9_]+/g, "vercel_blob_rw_***")
    .slice(0, 2000);
}

function describe(error: unknown): { message: string; status?: number } {
  if (error instanceof Error) {
    const status = (error as { status?: unknown }).status;
    return {
      message: `${error.name}: ${error.message}`,
      status: typeof status === "number" ? status : undefined,
    };
  }
  return { message: typeof error === "string" ? error : "未知錯誤" };
}

// 記錄伺服器錯誤：同時輸出到 console，並寫進 MongoDB 給後台查看。
// 寫入失敗不影響原本的請求；在請求中呼叫時，會等回應送出後再寫完（after）
export function logError(
  category: ErrorCategory,
  scope: string,
  error: unknown,
  meta?: Record<string, unknown>,
): Promise<void> {
  const { message, status } = describe(error);
  const safeMessage = redact(message);
  console.error(`[${scope}]`, safeMessage, status ?? "");
  const write = (async () => {
    try {
      await connectDB();
      await ErrorLogModel.create({
        category,
        scope,
        message: safeMessage,
        status,
        meta: meta && JSON.parse(redact(JSON.stringify(meta))),
      });
    } catch (writeError) {
      console.error("[error-log] 寫入錯誤日誌失敗", writeError instanceof Error ? writeError.message : writeError);
    }
  })();
  try {
    after(write); // Serverless 環境回應送出後仍會等寫入完成
  } catch {
    // 不在請求範圍內（例如 instrumentation）時，由呼叫端自行 await
  }
  return write;
}
