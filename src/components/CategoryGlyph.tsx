import { getCategory } from "@/lib/categories";

// 分類圖示：原創線條插畫＋一塊偏移的粉彩色塊（參考手繪美食圖示的風格）
// 名廚類別沒有線條圖示，沿用國旗

type Glyph = { color: string; blob: number; offset: [number, number]; body: React.ReactNode };

const dot = (cx: number, cy: number, r = 1) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />;
const steam = (x: number, y = 6) => <path key={`s${x}`} d={`M${x} ${y}c-3 4 3 6 0 10`} />;

// 幾種有機形狀的色塊，避免每個看起來都一樣
const BLOBS = [
  "M38 8c9 2 16 10 15 20-1 9-6 14-14 17-9 3-19 1-24-6-5-8-3-19 3-25 5-5 12-8 20-6z",
  "M30 9c10-2 20 4 22 13 2 10-3 19-12 22-10 4-21 1-25-8-4-8-1-17 5-22 3-3 6-4 10-5z",
  "M34 10c8 0 17 6 17 16 0 11-8 18-18 18-11 1-19-6-19-16 0-10 9-18 20-18z",
  "M25 10c8-4 19-2 24 6 5 7 3 17-4 22-8 6-19 6-25-1-6-6-6-15-1-21 2-3 4-5 6-6z",
];

const GLYPHS: Record<string, Glyph> = {
  taiwanese: {
    color: "#f2d4b8", blob: 0, offset: [-6, 8],
    body: <>
      <path d="M20 22h24l-4 33a3 3 0 0 1-3 3H27a3 3 0 0 1-3-3z" />
      <path d="M17 22h30M20 22q12-11 24 0" />
      <path d="M37 4l-5 26" />
      {[dot(28, 50, 1.8), dot(33, 52, 1.8), dot(37, 48, 1.8), dot(30, 45, 1.8), dot(35, 43, 1.8)]}
    </>,
  },
  japanese: {
    color: "#cfdaf0", blob: 1, offset: [6, 6],
    body: <>
      <path d="M32 11c4 0 20 27 19 34-1 7-37 7-38 0-1-7 15-34 19-34z" />
      <path d="M24 37h16v14H24z" />
      {[dot(30, 22), dot(34, 26), dot(28, 29)]}
    </>,
  },
  korean: {
    color: "#f1cdd3", blob: 2, offset: [-7, 4],
    body: <>
      <path d="M9 34h46c0 12-10 20-23 20S9 46 9 34z" />
      <path d="M25 54v4h14v-4" />
      <path d="M21 33c-2-7 5-12 11-10 6-3 14 2 11 10" />
      <circle cx="32" cy="28" r="3.5" />
      <path d="M46 6l10 24M51 5l9 22" />
    </>,
  },
  italian: {
    color: "#efc7b5", blob: 3, offset: [-6, 4],
    body: <>
      <path d="M11 19L51 13 27 55z" />
      <path d="M14 24q17-7 33-5" />
      <circle cx="27" cy="29" r="3" />
      <circle cx="37" cy="26" r="2.5" />
      <circle cx="29" cy="40" r="2.5" />
    </>,
  },
  thai: {
    color: "#f3c9c0", blob: 0, offset: [6, 6],
    body: <>
      <path d="M21 19c-6 10-2 26 14 34 8 4 15 2 13-2-14-4-20-17-20-31z" />
      <path d="M21 19q4 4 7 0M25 18c0-7 4-11 10-11" />
      {[dot(30, 38), dot(34, 43), dot(38, 47)]}
    </>,
  },
  french: {
    color: "#ead6c4", blob: 1, offset: [-5, 7],
    body: <>
      <path d="M7 42c2-19 48-19 50 0" />
      <path d="M7 42c13 7 37 7 50 0" />
      <path d="M18 30l3 15M28 26l1 18M38 26l-2 18M47 30l-4 15" />
      {[dot(23, 38), dot(33, 36), dot(42, 38), dot(25, 33), dot(40, 32)]}
    </>,
  },
  vietnamese: {
    color: "#d3e4cf", blob: 2, offset: [6, 5],
    body: <>
      <path d="M9 32h46c0 13-10 22-23 22S9 45 9 32z" />
      <path d="M25 54v4h14v-4" />
      <path d="M13 32q4-4 8 0t8 0 8 0 8 0 8 0" />
      <path d="M40 24c3-9 14-11 14-11 0 8-6 13-14 11zM40 24l9-7" />
      <path d="M15 5l15 23M21 3l13 22" />
    </>,
  },
  indian: {
    color: "#f2dfae", blob: 3, offset: [-6, 6],
    body: <>
      <path d="M17 27c-7 13 1 29 15 29s22-16 15-29z" />
      <path d="M14 27h36" />
      <path d="M14 31c-6 0-6 8 0 8M50 31c6 0 6 8 0 8" />
      {[steam(26), steam(32, 4), steam(38)]}
      {[dot(26, 40), dot(32, 44), dot(38, 40), dot(30, 36)]}
    </>,
  },
  mexican: {
    color: "#f3e3a8", blob: 0, offset: [5, 7],
    body: <>
      <path d="M8 47c0-22 48-22 48 0z" />
      <path d="M11 38q4-6 8-2t8-3 8-2 8-1 8 3" />
      {[dot(20, 41, 1.6), dot(30, 39, 1.6), dot(40, 40, 1.6), dot(26, 44), dot(36, 44), dot(46, 43)]}
    </>,
  },
  dessert: {
    color: "#e2d2ea", blob: 1, offset: [-7, 6],
    body: <>
      <path d="M12 30h32v22H12z" />
      <path d="M12 30l24-12 16 8-8 4M44 30l8-4v20l-8 6" />
      <path d="M12 41h32" />
      <circle cx="36" cy="14" r="3" />
      <path d="M36 11q2-5 7-6" />
    </>,
  },
  appetizer: {
    color: "#d6e6d2", blob: 2, offset: [6, 6],
    body: <>
      <path d="M9 34h46c-2 13-11 20-23 20S11 47 9 34z" />
      <path d="M17 34c-2-10 6-14 11-10M27 34c0-12 10-15 13-10M40 34c2-8 10-10 11-4" />
      <circle cx="33" cy="29" r="3" />
    </>,
  },
  "main-rice-noodle": {
    color: "#ddd2e6", blob: 3, offset: [-7, 5],
    body: <>
      <path d="M12 46c0-15 9-24 20-24s20 9 20 24" />
      <path d="M7 48h50" />
      <circle cx="32" cy="19" r="3" />
      {[steam(24, 2), steam(40, 2)]}
    </>,
  },
  soup: {
    color: "#cfe0e6", blob: 0, offset: [6, 6],
    body: <>
      <path d="M12 28h40v18c0 6-4 10-10 10H22c-6 0-10-4-10-10z" />
      <path d="M9 28h46M12 32H7M52 32h5" />
      <path d="M40 28L49 7" />
      {[steam(22), steam(30)]}
    </>,
  },
  brunch: {
    color: "#f4ebae", blob: 1, offset: [-7, 7],
    body: <>
      <path d="M14 30c-4-12 12-20 20-16 10-6 22 4 16 16 6 10-6 24-18 20-12 6-24-6-18-20z" />
      <circle cx="32" cy="32" r="7.5" />
      {[dot(30, 30), dot(34, 33), dot(31, 35), dot(35, 29)]}
    </>,
  },
  vegetarian: {
    color: "#d6e8c8", blob: 2, offset: [6, 6],
    body: <>
      <path d="M20 31a8 8 0 1 1 5-13 9 9 0 0 1 16 1 8 8 0 1 1 3 13z" />
      <path d="M28 31l-2 24h12l-2-24M32 40l-5-6M33 44l5-6" />
      {[dot(24, 24), dot(32, 21), dot(39, 25), dot(28, 27), dot(36, 28)]}
    </>,
  },
  bento: {
    color: "#f0d2c2", blob: 3, offset: [-6, 6],
    body: <>
      <rect x="8" y="18" width="48" height="32" rx="4" />
      <path d="M30 18v32M30 34h26" />
      {[dot(15, 26), dot(20, 30), dot(15, 36), dot(22, 40), dot(18, 44), dot(24, 25)]}
      <circle cx="43" cy="26" r="4" />
      <path d="M36 44c4-6 12-6 16 0" />
    </>,
  },
  cocktail: {
    color: "#e6d3ee", blob: 2, offset: [6, 6],
    body: <>
      <path d="M12 14h40L32 36z" />
      <path d="M19 21h26" />
      <path d="M32 36v17M22 55h20" />
      <circle cx="38" cy="22" r="3.5" />
      <path d="M46 8L36 26" />
    </>,
  },
  drinks: {
    color: "#cfe6dc", blob: 3, offset: [-6, 7],
    body: <>
      <path d="M19 18h26l-4 35a3 3 0 0 1-3 3H26a3 3 0 0 1-3-3z" />
      <path d="M16 18h32" />
      <path d="M35 18l8-14" />
      <rect x="25" y="25" width="6" height="6" rx="1.5" />
      <rect x="33" y="29" width="6" height="6" rx="1.5" />
      {[dot(28, 50, 1.8), dot(33, 51, 1.8), dot(37, 48, 1.8), dot(30, 45, 1.8), dot(35, 44, 1.8)]}
    </>,
  },
};

export default function CategoryGlyph({
  slug,
  size = 48,
  className = "",
}: {
  slug: string;
  size?: number;
  className?: string;
}) {
  const glyph = GLYPHS[slug];
  if (!glyph) {
    // 名廚類別或沒有線條圖示時，顯示原本的 emoji（例如國旗）
    return (
      <span className={`inline-flex items-center justify-center ${className}`} style={{ width: size, height: size, fontSize: size * 0.55 }} aria-hidden>
        {getCategory(slug)?.icon ?? "🍽"}
      </span>
    );
  }
  const [dx, dy] = glyph.offset;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={`overflow-visible ${className}`} aria-hidden>
      <path d={BLOBS[glyph.blob]} fill={glyph.color} transform={`translate(${dx} ${dy})`} className="dark:opacity-35" />
      <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {glyph.body}
      </g>
    </svg>
  );
}
