import "server-only";
import type { RecipeImage } from "./recommendation";
import { logError } from "./error-log";

// 找食譜示意照片：
// 1. Unsplash（需要 UNSPLASH_ACCESS_KEY）：先用英文菜名，再用食材關鍵字
// 2. 中文維基百科（用中文菜名）→ 英文維基百科（用英文菜名）的條目主圖，只採用 Wikimedia Commons 上的自由授權照片
// 3. 都找不到再用 Openverse 搜尋開放授權照片（不需金鑰）：先用英文菜名，再用食材關鍵字（例：pasta shrimp）

// Wikimedia 要求 API 請求帶上可識別的 User-Agent
const USER_AGENT = "Taste-Trace/0.1 (personal recipe project)";
const TIMEOUT_MS = 6000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 遇到 429（請求太頻繁）時依 Retry-After 等一下再試一次，最多等 3 秒
async function getJson<T>(url: URL, headers: Record<string, string> = {}): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, ...headers },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 429 && attempt === 0) {
      const retryAfter = Number(res.headers.get("retry-after")) || 1;
      await sleep(Math.min(retryAfter, 3) * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`${url.host} 回應 ${res.status}`);
    return res.json() as Promise<T>;
  }
}

// 連續找多道菜的照片時，每道之間稍微間隔，避免被限流
export const LOOKUP_INTERVAL_MS = 300;
export { sleep };

function stripHtml(html: string | undefined): string | null {
  const text = html?.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return text || null;
}

type WikiPagesResponse = {
  query?: { pages?: { pageimage?: string; missing?: boolean }[] };
};

type CommonsImageResponse = {
  query?: {
    pages?: {
      missing?: boolean;
      imageinfo?: {
        thumburl?: string;
        descriptionurl: string;
        extmetadata?: Record<string, { value: string } | undefined>;
      }[];
    }[];
  };
};

async function findWikipediaPageImage(lang: "zh" | "en", title: string) {
  const url = new URL(`https://${lang}.wikipedia.org/w/api.php`);
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    redirects: "1",
    prop: "pageimages",
    piprop: "name",
    titles: title,
  }).toString();
  const data = await getJson<WikiPagesResponse>(url);
  return data.query?.pages?.[0]?.pageimage ?? null;
}

async function getCommonsImage(fileName: string): Promise<RecipeImage | null> {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "960",
    titles: `File:${fileName}`,
  }).toString();
  const data = await getJson<CommonsImageResponse>(url);
  const page = data.query?.pages?.[0];
  // 檔案不在 Commons 代表是維基百科本地上傳的非自由版權圖，不採用
  const info = page && !page.missing ? page.imageinfo?.[0] : undefined;
  if (!info?.thumburl) return null;

  const meta = info.extmetadata ?? {};
  return {
    url: info.thumburl,
    source: "wikimedia",
    provider: "Wikimedia Commons",
    author: stripHtml(meta.Artist?.value),
    authorUrl: null,
    sourceUrl: info.descriptionurl,
    license: meta.LicenseShortName?.value ?? null,
    licenseUrl: meta.LicenseUrl?.value ?? null,
  };
}

async function findWikimediaImage(
  title: string,
  englishName: string | null,
): Promise<RecipeImage | null> {
  const candidates: ["zh" | "en", string][] = [["zh", title]];
  if (englishName) candidates.push(["en", englishName]);

  for (const [lang, name] of candidates) {
    const fileName = await findWikipediaPageImage(lang, name);
    if (!fileName) continue;
    const image = await getCommonsImage(fileName);
    if (image) return image;
  }
  return null;
}

type UnsplashSearchResponse = {
  results: {
    id: string;
    premium?: boolean; // Unsplash+ 付費照片，不能免費使用
    urls: { raw: string };
    links: { html: string; download_location: string };
    user: { name: string; links: { html: string } };
  }[];
};

// Unsplash API 規範：連回 Unsplash 的網址要帶上來源參數
const UNSPLASH_REFERRAL = "utm_source=taste_trace&utm_medium=referral";
const withReferral = (url: string) => `${url}${url.includes("?") ? "&" : "?"}${UNSPLASH_REFERRAL}`;

// Unsplash：照片質感較好，免費授權（Unsplash License）。
// 規範要求直接使用 Unsplash 的圖片網址、標示攝影師，並在照片被採用時通知下載端點。
export async function findUnsplashImage(
  query: string,
  orientation: "landscape" | "squarish" = "landscape",
  width = 1200,
): Promise<RecipeImage | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return null;

  const headers = { Authorization: `Client-ID ${accessKey}`, "Accept-Version": "v1" };
  const url = new URL("https://api.unsplash.com/search/photos");
  url.search = new URLSearchParams({
    query,
    per_page: "5",
    orientation,
    content_filter: "high",
  }).toString();
  const data = await getJson<UnsplashSearchResponse>(url, headers);

  const photo = data.results.find((result) => !result.premium);
  if (!photo) return null;

  // 採用照片時通知 Unsplash（計入攝影師的下載數）；失敗不影響使用
  await getJson(new URL(photo.links.download_location), headers).catch(() => {});

  // raw 網址可加尺寸參數，由 Unsplash 的 CDN 裁切成適合卡片的大小
  const imageUrl = new URL(photo.urls.raw);
  imageUrl.searchParams.set("w", String(width));
  imageUrl.searchParams.set("q", "80");
  imageUrl.searchParams.set("fm", "jpg");
  imageUrl.searchParams.set("fit", "max");

  return {
    url: imageUrl.toString(),
    source: "unsplash",
    provider: "Unsplash",
    author: photo.user.name,
    authorUrl: withReferral(photo.user.links.html),
    sourceUrl: withReferral(photo.links.html),
    license: "Unsplash License",
    licenseUrl: "https://unsplash.com/license",
  };
}

type OpenverseSearchResponse = {
  results: {
    url: string;
    title: string | null;
    creator: string | null;
    creator_url: string | null;
    license: string;
    license_version: string | null;
    license_url: string | null;
    foreign_landing_url: string;
    source: string;
    width: number | null;
  }[];
};

// next.config.ts 有允許的圖片網域；其他來源的照片不採用
const OPENVERSE_IMAGE_HOSTS = ["live.staticflickr.com", "upload.wikimedia.org"];

const OPENVERSE_SOURCE_NAMES: Record<string, string> = {
  flickr: "Flickr",
  wikimedia: "Wikimedia Commons",
};

// Openverse（WordPress 基金會的開放授權圖片搜尋）：不需金鑰，只取可商用、可修改的授權（CC0、CC BY、CC BY-SA）
async function findOpenverseImage(query: string): Promise<RecipeImage | null> {
  const url = new URL("https://api.openverse.org/v1/images/");
  url.search = new URLSearchParams({
    q: query,
    license_type: "commercial,modification",
    mature: "false",
    page_size: "10",
  }).toString();
  const data = await getJson<OpenverseSearchResponse>(url);

  // 太大的原圖載入慢，優先挑寬度適中的照片
  const candidates = data.results.filter(
    (result) => OPENVERSE_IMAGE_HOSTS.includes(new URL(result.url).hostname),
  );
  const photo =
    candidates.find((result) => result.width && result.width >= 600 && result.width <= 2400) ??
    candidates[0];
  if (!photo) return null;

  const license =
    photo.license === "cc0"
      ? "CC0"
      : photo.license === "pdm"
        ? "公眾領域"
        : `CC ${photo.license.toUpperCase()}`;
  return {
    url: photo.url,
    source: "openverse",
    provider: OPENVERSE_SOURCE_NAMES[photo.source] ?? photo.source,
    author: photo.creator,
    authorUrl: photo.creator_url,
    sourceUrl: photo.foreign_landing_url,
    license:
      photo.license_version && photo.license !== "pdm"
        ? `${license} ${photo.license_version}`
        : license,
    licenseUrl: photo.license_url,
  };
}

// 回傳 null 代表確定找不到；查詢途中出錯（例如 429 請求太頻繁）則丟出錯誤，讓呼叫端下次再試
export async function findRecipeImage(
  title: string,
  englishName: string | null,
  imageKeywords: string | null,
): Promise<RecipeImage | null> {
  let failed = false;
  const shortKeywords = imageKeywords?.split(/\s+/).slice(0, 2).join(" ");

  // Unsplash 測試額度每小時只有 50 次，所以最多查兩次：英文菜名、食材關鍵字
  for (const query of [...new Set([englishName, imageKeywords].filter(Boolean))] as string[]) {
    try {
      const unsplash = await findUnsplashImage(query);
      if (unsplash) return unsplash;
    } catch (error) {
      // 額度用完或連線失敗時改用其他來源
      logError("unsplash", "images.unsplash", error);
      break;
    }
  }

  try {
    const wikimedia = await findWikimediaImage(title, englishName);
    if (wikimedia) return wikimedia;
  } catch (error) {
    logError("image-search", "images.wikimedia", error);
    failed = true;
  }

  // 依序：英文菜名 → 全部食材關鍵字 → 前兩個關鍵字（關鍵字太多時常常找不到）
  const queries = [
    ...new Set([englishName ?? title, imageKeywords, shortKeywords].filter(Boolean)),
  ] as string[];
  for (const query of queries) {
    try {
      const openverse = await findOpenverseImage(query);
      if (openverse) return openverse;
    } catch (error) {
      logError("image-search", "images.openverse", error);
      failed = true;
    }
  }

  if (failed) throw new Error("照片查詢失敗，稍後再試");
  return null;
}
