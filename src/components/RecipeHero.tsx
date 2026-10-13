import Image from "next/image";
import { useTranslations } from "next-intl";
import type { RecipeImage, RecipeSummary } from "@/lib/recommendation";
import CategoryGlyph from "./CategoryGlyph";
import { recipeBadges } from "./recipe-badges";

// 食譜大圖：照片（或佔位底色）上疊分類標籤，下方標示照片來源
export default function RecipeHero({
  recipe,
  categorySlug,
  loadingImage = false,
}: {
  recipe: RecipeSummary;
  categorySlug: string;
  loadingImage?: boolean;
}) {
  const t = useTranslations("Tags");
  const tp = useTranslations("Photo");
  const badges = recipeBadges(recipe, t);

  return (
    <figure>
      <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-accent-soft sm:aspect-[16/9]">
        {recipe.image ? (
          <Image
            src={recipe.image.url}
            alt={tp("recipeAlt", { title: recipe.title })}
            fill
            sizes="(max-width: 768px) 100vw, 720px"
            className="object-cover"
          />
        ) : (
          <div
            className={`flex size-full items-center justify-center ${loadingImage ? "animate-pulse" : ""}`}
            aria-hidden
          >
            <CategoryGlyph slug={categorySlug} size={120} />
          </div>
        )}

        {badges.length > 0 && (
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1.5 p-3">
            {badges.map((badge) => (
              <span
                key={badge}
                className="rounded-full bg-[#fbf8f3]/92 px-2.5 py-1 text-[11px] font-medium text-[#1d1a16]"
              >
                {badge}
              </span>
            ))}
          </div>
        )}
      </div>

      {recipe.image && <ImageCredit image={recipe.image} />}
    </figure>
  );
}

// 照片授權標示：作者、照片所在網站與 CC 授權條款
export function ImageCredit({ image }: { image: RecipeImage }) {
  const t = useTranslations("Photo");
  const link = "underline decoration-dotted underline-offset-2 hover:text-foreground";
  if (image.source === "unsplash") {
    return (
      <figcaption className="mt-1.5 text-right text-[11px] text-muted">
        {t("illustrative")}・Photo by{" "}
        <a href={image.authorUrl ?? image.sourceUrl} target="_blank" rel="noreferrer" className={link}>
          {image.author}
        </a>{" "}
        on{" "}
        <a href={image.sourceUrl} target="_blank" rel="noreferrer" className={link}>
          Unsplash
        </a>
      </figcaption>
    );
  }
  return (
    <figcaption className="mt-1.5 text-right text-[11px] text-muted">
      {t("illustrative")}
      {image.author && (
        <>
          {" ・ "}
          {image.authorUrl ? (
            <a href={image.authorUrl} target="_blank" rel="noreferrer" className={link}>
              {image.author}
            </a>
          ) : (
            image.author
          )}
        </>
      )}
      {" ・ "}
      <a href={image.sourceUrl} target="_blank" rel="noreferrer" className={link}>
        {image.provider}
      </a>
      {image.license && (
        <>
          {" ・ "}
          {image.licenseUrl ? (
            <a href={image.licenseUrl} target="_blank" rel="noreferrer" className={link}>
              {image.license}
            </a>
          ) : (
            image.license
          )}
        </>
      )}
    </figcaption>
  );
}
