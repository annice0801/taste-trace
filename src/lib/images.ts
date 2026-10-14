import "server-only";
import type { RecipeImage } from "./recommendation";
import { logError } from "./error-log";

// 找食譜示意照片：
// 1. Unsplash（需要 UNSPLASH_ACCESS_KEY）：先用英文菜名，再用食材關鍵字
// 2. 中文維基百科（用中文菜名）→ 英文維基百科（用英文菜名）的條目主圖，只採用 Wikimedia Commons 上的自由授權照片
// 3. 都找不到再用 Openverse 搜尋開放授權照片（不需金鑰）：先用英文菜名，再用食材關鍵字（例：pasta shrimp）

// Wikimedia 要求 API 請求帶上可識別、附聯絡方式的 User-Agent，否則容易被限流
const USER_AGENT = "Taste-Trace/0.2 (https://taste-trace.vercel.app; recipe and seasonal produce guide)";
const TIMEOUT_MS = 6000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 遇到 429（請求太頻繁）時依 Retry-After 等一下再試，最多重試 2 次、每次最多等 4 秒
async function getJson<T>(url: URL, headers: Record<string, string> = {}): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, ...headers },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 429 && attempt < 2) {
      const retryAfter = Number(res.headers.get("retry-after")) || 2 * (attempt + 1);
      await sleep(Math.min(retryAfter, 4) * 1000);
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
  query?: { pages?: { title?: string; pageimage?: string; missing?: boolean }[] };
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

async function findWikipediaPage(lang: "zh" | "en", title: string) {
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
  const page = data.query?.pages?.[0];
  return { image: page?.pageimage ?? null, title: page?.title ?? title };
}

async function findWikipediaPageImage(lang: "zh" | "en", title: string) {
  return (await findWikipediaPage(lang, title)).image;
}

// 照片的檔名與說明，給食材照片判斷是否相關（以照片網址為 key）
const commonsDescriptions = new Map<string, string>();

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
  commonsDescriptions.set(info.thumburl, `${fileName} ${stripHtml(meta.ObjectName?.value) ?? ""} ${stripHtml(meta.ImageDescription?.value) ?? ""}`);
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

// 食材、蔬果：維基百科條目的代表照片（例：water spinach 條目是空心菜的照片）。
// 先查英文名稱，再查中文名稱；只採用照片檔，排除地圖、圖表、手繪圖鑑之類的圖。
// PNG 多半是圖鑑掃描或繪圖（例：Blanco《菲律賓植物誌》），只採用 JPG／WebP 照片
const NON_PHOTO_FILE = /(map|diagram|chart|logo|structure|molecule|formula|illustration|drawing|botanical|köhler|blanco|flora|herbarium|plate|icon|flag|\.svg|\.gif|\.tif|\.png)/i;

export async function findWikimediaProduceImage(englishName: string, chineseName: string): Promise<RecipeImage | null> {
  const candidates: ["en" | "zh", string][] = [];
  if (englishName.trim()) candidates.push(["en", englishName.trim()]);
  if (chineseName.trim()) candidates.push(["zh", chineseName.trim()]);
  for (const [lang, name] of candidates) {
    const page = await findWikipediaPage(lang, name);
    const fileName = page.image;
    if (!fileName || NON_PHOTO_FILE.test(fileName) || !/\.(jpe?g|webp)$/i.test(fileName)) continue;
    // 1500–1899 年的檔名多半是古書插圖、股票之類的文物，不是食材照片
    if (/(^|[^0-9])1[5-8][0-9]{2}([^0-9]|$)/.test(fileName)) continue;
    const image = await getCommonsImage(fileName);
    // 沒有標明授權的不採用
    if (!image?.license || /fair use/i.test(image.license)) continue;
    // 照片的檔名或說明要提到這個食材（英文名稱或條目名稱，例：Ipomoea aquatica），
    // 避免「stock」查到股票、「butter」條目首圖是蛋糕這類情形
    // 比對字根，讓單複數都算（leaf／leaves、blackberry／blackberries、onion／onions）
    const words = `${englishName} ${page.title}`
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((word) => word.length >= 3 && !["fresh", "minced", "sliced", "dried", "whole", "boneless", "unsalted", "purpose", "the", "and"].includes(word))
      .map((word) => word.replace(/(ies|ves|es|s|y|f)$/, ""))
      .filter((stem) => stem.length >= 3);
    const description = (commonsDescriptions.get(image.url) ?? fileName).toLowerCase();
    if (words.length > 0 && !words.some((word) => description.includes(word))) continue;
    return image;
  }
  return null;
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

type UnsplashPhoto = {
  id: string;
  premium?: boolean; // Unsplash+ 付費照片，不能免費使用
  alt_description: string | null;
  description: string | null;
  urls: { raw: string };
  links: { html: string; download_location: string };
  user: { name: string; links: { html: string } };
};

type UnsplashSearchResponse = { results: UnsplashPhoto[] };

// 照片描述裡出現這些字，才算是食物照片
const FOOD_WORDS =
  /\b(food|foods|dish|dishes|meal|cuisine|cook|cooked|cooking|recipe|plate|plated|bowl|soup|stew|broth|noodles?|ramen|pasta|spaghetti|rice|salad|sandwich|burger|pizza|bread|toast|cake|dessert|pastry|cookie|pie|tart|pudding|ice cream|chocolate|fruit|fruits|vegetables?|meat|beef|pork|chicken|lamb|fish|seafood|shrimp|prawn|crab|squid|egg|eggs|tofu|curry|sauce|dumplings?|sushi|taco|breakfast|lunch|dinner|brunch|snack|kitchen|ingredients?|spices?|herbs?|garnish|tea|coffee|drink|beverage|juice|cheese|butter|grilled|fried|roasted|baked|steamed|served|delicious|tasty)\b/;
// 飲料、調酒的照片要有這些字
const DRINK_WORDS =
  /\b(drink|drinks|cocktail|cocktails|mocktail|beverage|glass|glasses|cup|mug|tea|coffee|latte|espresso|juice|smoothie|milkshake|lemonade|soda|highball|martini|mojito|wine|beer|whisky|whiskey|gin|rum|vodka|sangria|bubble tea|boba|iced|ice cubes|straw|bar|bartender)\b/;
// 主角是人的照片不採用（除非描述裡同時明確提到食物）
const PEOPLE_WORDS = /\b(man|men|woman|women|person|people|boy|girl|child|children|portrait|smiling|selfie|model|crowd|group of people)\b/;

export type PhotoKind = "food" | "drink" | "produce";

// 食材、蔬果照片不能出現這些：動物、加工包裝、人
const NOT_PRODUCE_WORDS =
  /\b(bird|parrot|parakeet|animal|dog|cat|insect|butterfly|bee|squirrel|monkey|jar|jars|bottle|bottles|package|packaging|packaged|label|labels|can|cans|box|boxes|brand|product|products|pickle|pickles|jam|sauce|cocktail|drink|juice|smoothie|cake|pie|tart|dessert|dish|plate of|soup|person|man|woman|people|hand holding|girl|boy)\b/;

// 用 Unsplash 的照片描述給照片打分數：
//   2：描述提到搜尋詞本身（例：yuzu、highball）且種類相符
//   1：只是同類型的照片（食物照、飲料照）
//   0：不相關（以人為主角、種類不符、沒有描述）
export function photoRelevance(
  photo: { alt_description: string | null; description: string | null },
  query: string,
  kind: PhotoKind = "food",
): 0 | 1 | 2 {
  const text = `${photo.alt_description ?? ""} ${photo.description ?? ""}`.toLowerCase();
  if (!text.trim()) return 0; // 沒有描述就無法判斷，寧可不用
  const queryWords = query
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((word) => word.length >= 3 && !["food", "drink", "fresh", "raw"].includes(word));
  const mentionsQuery = queryWords.some((word) => text.includes(word));
  // 食材、當季蔬果：照片要是這個蔬果本身，描述一定要提到它，而且不能是動物、加工品或料理
  //（名稱有好幾個字時每個字都要出現，例：garlic chive 不能配到只有 garlic 的照片）
  if (kind === "produce") {
    const mentionsAll = queryWords.length > 0 && queryWords.every((word) => text.includes(word));
    return mentionsAll && !NOT_PRODUCE_WORDS.test(text) ? 2 : 0;
  }
  if (PEOPLE_WORDS.test(text) && !mentionsQuery) return 0;
  // 飲料一定要看得出是飲料（例：麵、拉麵的照片不能當調酒的圖）
  const rightKind = kind === "drink" ? DRINK_WORDS.test(text) : FOOD_WORDS.test(text) || DRINK_WORDS.test(text);
  if (kind === "drink" && !rightKind) return 0;
  if (mentionsQuery) return 2;
  return rightKind ? 1 : 0;
}

// Unsplash API 規範：連回 Unsplash 的網址要帶上來源參數
const UNSPLASH_REFERRAL = "utm_source=taste_trace&utm_medium=referral";
const withReferral = (url: string) => `${url}${url.includes("?") ? "&" : "?"}${UNSPLASH_REFERRAL}`;

// Unsplash：照片質感較好，免費授權（Unsplash License）。
// 規範要求直接使用 Unsplash 的圖片網址、標示攝影師，並在照片被採用時通知下載端點。
export async function findUnsplashImage(
  query: string,
  orientation: "landscape" | "squarish" = "landscape",
  width = 1200,
  kind: PhotoKind = "food",
): Promise<RecipeImage | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return null;

  const headers = { Authorization: `Client-ID ${accessKey}`, "Accept-Version": "v1" };
  const url = new URL("https://api.unsplash.com/search/photos");
  url.search = new URLSearchParams({
    query,
    per_page: "10",
    orientation,
    content_filter: "high",
  }).toString();
  const data = await getJson<UnsplashSearchResponse>(url, headers);

  // 優先採用描述提到這道菜的照片，其次是同類型的照片；全部不相關就回傳 null，交給下一個圖庫
  const candidates = data.results.filter((result) => !result.premium);
  const photo =
    candidates.find((result) => photoRelevance(result, query, kind) === 2) ??
    candidates.find((result) => photoRelevance(result, query, kind) === 1);
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
  kind: PhotoKind = "food",
): Promise<RecipeImage | null> {
  let failed = false;
  const shortKeywords = imageKeywords?.split(/\s+/).slice(0, 2).join(" ");

  // Unsplash 測試額度每小時只有 50 次，所以最多查兩次：英文菜名、食材關鍵字
  for (const query of [...new Set([englishName, imageKeywords].filter(Boolean))] as string[]) {
    try {
      // 加上 food／drink，避免像「Hiyayakko」這種少見的菜名搜到人像
      const unsplash = await findUnsplashImage(`${query} ${kind}`, "landscape", 1200, kind);
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
