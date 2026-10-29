This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## MCP 伺服器

Taste-Trace 提供 MCP（Model Context Protocol）端點，讓 Claude 等 AI 助理直接查詢食譜：

```
https://taste-trace.vercel.app/api/mcp
```

| 工具 | 用途 |
| --- | --- |
| `list_categories` | 列出食譜分類（國家料理、料理類型、名廚靈感） |
| `search_recipes` | 依關鍵字、分類、料理角色、場景、主要食材、時間搜尋食譜 |
| `get_recipe` | 取得食材（含台灣在地替代）、步驟與小撇步，可指定份量換算 |
| `build_shopping_list` | 把多道食譜的食材換算份量後合併成一份採買清單 |
| `get_picking_guide` | 蔬果挑選標準（看、摸、聽、聞、掂重，依目的挑），只回傳已整理過的 |

- 只讀：不寫入資料、不呼叫 AI（不產生費用），也不開放收藏、作品等使用者資料
- 還沒產生做法的食譜只回傳摘要與網站連結
- 拒絕從其他網站的瀏覽器發出的請求（Origin 檢查）

連線方式：

- Claude Code：`claude mcp add --transport http taste-trace https://taste-trace.vercel.app/api/mcp`
- Claude（網頁版或桌面版）：設定 → Connectors → 新增自訂 connector，貼上上面的網址
- 本機測試：`npm run dev` 後改用 `http://localhost:3000/api/mcp`

程式在 `src/lib/mcp-server.ts`（工具）與 `src/app/api/mcp/route.ts`（端點）。

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
