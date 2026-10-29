// MCP 端點（Streamable HTTP）：/api/mcp
// 只開放唯讀的食譜查詢工具，不需要登入；工具定義在 src/lib/mcp-server.ts
import { createMcpHandler } from "@modelcontextprotocol/server";
import { buildMcpServer } from "@/lib/mcp-server";
import { logError } from "@/lib/error-log";

async function handle(request: Request) {
  const url = new URL(request.url);

  // 從瀏覽器發出的跨網站請求一律拒絕（防 DNS rebinding）；AI 助理從伺服器端連線不會帶 Origin
  const origin = request.headers.get("origin");
  if (origin && URL.parse(origin)?.host !== url.host) {
    return Response.json({ error: "不允許跨網站存取" }, { status: 403 });
  }

  // 每次請求建立一個無狀態的處理器，食譜連結使用目前網站的網址
  const handler = createMcpHandler(() => buildMcpServer(url.origin), {
    onerror: (error) => void logError("mcp", "api/mcp", error),
  });
  return handler.fetch(request);
}

export { handle as GET, handle as POST, handle as DELETE };
