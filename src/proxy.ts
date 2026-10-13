import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// 依網址前綴決定介面語系；繁中不加前綴
export default createMiddleware(routing);

export const config = {
  // API、Next 內部檔案與靜態檔（有副檔名的）不經過
  matcher: "/((?!api|admin|_next|_vercel|.*\\..*).*)",
};
