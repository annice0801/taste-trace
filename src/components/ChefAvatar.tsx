import { useTranslations } from "next-intl";
import type { ChefIllustration, ChefProfile, Photo } from "@/lib/categories";

// 名廚頭像：一律使用原創卡通插畫（不是本人肖像），右下角加國旗
export default function ChefAvatar({
  chef,
  size = 96,
  rounded = "full",
  showFlag = true,
}: {
  chef: ChefProfile;
  size?: number;
  rounded?: "full" | "card";
  showFlag?: boolean;
}) {
  const t = useTranslations("Photo");
  const shape = rounded === "full" ? "rounded-full" : "rounded-2xl";
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <span className={`block size-full overflow-hidden bg-olive-soft ${shape}`}>
        <ChefDrawing
          spec={chef.illustration}
          label={t("avatarLabel", { name: chef.englishName })}
        />
      </span>
      {showFlag && (
        <span
          className="absolute -right-0.5 -bottom-0.5 flex items-center justify-center rounded-full border-2 border-background bg-surface leading-none"
          style={{ width: size * 0.34, height: size * 0.34, fontSize: size * 0.2 }}
          role="img"
          aria-label={chef.country}
        >
          {chef.flag}
        </span>
      )}
    </span>
  );
}

// 原創的卡通主廚插畫（高帽、圓臉、腮紅），依設定換髮型、眼鏡與鬍子
export function ChefDrawing({ spec, label }: { spec: ChefIllustration; label: string }) {
  const ink = "#2a221c";
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label={label} className="size-full">
      <rect width="120" height="120" fill={spec.background} />
      {/* 身體與廚師服 */}
      <path d="M22 120c2-20 17-30 38-30s36 10 38 30z" fill="#fbfaf7" />
      <path d="M50 92l10 12 10-12" fill="none" stroke="#d9cfc2" strokeWidth="2" />
      <path d="M48 91c4 6 20 6 24 0l-4 9H52z" fill="#9c3d1c" />
      <circle cx="54" cy="110" r="1.8" fill="#cfc4b6" />
      <circle cx="66" cy="110" r="1.8" fill="#cfc4b6" />
      {/* 脖子與臉 */}
      <rect x="53" y="78" width="14" height="12" rx="5" fill={spec.skin} />
      {spec.hairStyle === "bob" && (
        <path d="M33 62c0-20 12-30 27-30s27 10 27 30v18c-4 3-9 3-11 0V60H44v20c-2 3-7 3-11 0z" fill={spec.hair} />
      )}
      <ellipse cx="60" cy="62" rx="22" ry="24" fill={spec.skin} />
      <ellipse cx="38" cy="64" rx="4" ry="6" fill={spec.skin} />
      <ellipse cx="82" cy="64" rx="4" ry="6" fill={spec.skin} />
      {spec.hairStyle === "short" && (
        <path d="M38 56c1-11 10-17 22-17s21 6 22 17c-6-5-14-7-22-7s-16 2-22 7z" fill={spec.hair} />
      )}
      {spec.hairStyle === "bob" && (
        <path d="M38 58c2-12 11-18 22-18s20 6 22 18c-8-6-15-4-22-8-7 4-14 2-22 8z" fill={spec.hair} />
      )}
      {spec.hairStyle === "bald" && (
        <>
          <path d="M38 62c0-5 2-8 4-9v12z" fill={spec.hair} />
          <path d="M82 62c0-5-2-8-4-9v12z" fill={spec.hair} />
        </>
      )}
      {/* 高帽 */}
      <path d="M40 44h40v-8H40z" fill="#fbfaf7" stroke="#e3dbcf" strokeWidth="1" />
      <path
        d="M40 37c-9 0-13-7-11-13 2-7 10-9 15-6 1-7 8-11 16-11s15 4 16 11c5-3 13-1 15 6 2 6-2 13-11 13z"
        fill="#fbfaf7"
        stroke="#e3dbcf"
        strokeWidth="1"
      />
      <path d="M52 37v-9M68 37v-9" stroke="#ebe4d9" strokeWidth="1.5" strokeLinecap="round" />
      {/* 眉毛與眼睛 */}
      <path d="M45 56q5-3 10 0M65 56q5-3 10 0" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="50" cy="63" rx="2.6" ry="3.2" fill={ink} />
      <ellipse cx="70" cy="63" rx="2.6" ry="3.2" fill={ink} />
      <circle cx="51" cy="62" r="0.9" fill="#fff" />
      <circle cx="71" cy="62" r="0.9" fill="#fff" />
      {spec.glasses && (
        <g fill="none" stroke={ink} strokeWidth="1.6">
          <circle cx="50" cy="63" r="7" />
          <circle cx="70" cy="63" r="7" />
          <path d="M57 63h6M43 62l-5-1M77 62l5-1" />
        </g>
      )}
      {/* 鼻子、腮紅、嘴巴 */}
      <path d="M60 66q-2 5 1 6" fill="none" stroke="#c99a7b" strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx="44" cy="72" rx="4.5" ry="2.8" fill="#e89a8a" opacity="0.55" />
      <ellipse cx="76" cy="72" rx="4.5" ry="2.8" fill="#e89a8a" opacity="0.55" />
      {spec.mustache ? (
        <path d="M60 74c-4-3-10-3-13 1 4 1 9 1 13-1zM60 74c4-3 10-3 13 1-4 1-9 1-13-1z" fill={spec.hair} stroke={ink} strokeWidth="0.6" />
      ) : (
        <path d="M54 76q6 5 12 0" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
      )}
    </svg>
  );
}

// 照片授權標示
export function PhotoCredit({ photo, className = "" }: { photo: Photo; className?: string }) {
  const t = useTranslations("Photo");
  const link = "underline decoration-dotted underline-offset-2 hover:text-foreground";
  return (
    <span className={`text-[11px] text-muted ${className}`}>
      {t("photoBy")}
      <a href={photo.sourceUrl} target="_blank" rel="noreferrer" className={link}>
        {photo.author}
      </a>
      {" ・ "}
      {photo.licenseUrl ? (
        <a href={photo.licenseUrl} target="_blank" rel="noreferrer" className={link}>
          {photo.license}
        </a>
      ) : (
        photo.license
      )}
    </span>
  );
}
