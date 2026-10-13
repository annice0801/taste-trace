import { useTranslations } from "next-intl";

// 菜系、份數與口味標籤
export default function RecipeTags({
  cuisine,
  servings,
  flavors,
}: {
  cuisine: string;
  servings: number | null;
  flavors: string[];
}) {
  const t = useTranslations("Recipe");
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
      {[cuisine, servings != null && t("servings", { count: servings }), ...flavors]
        .filter((tag): tag is string => Boolean(tag))
        .map((tag, index) => (
          <span key={tag} className="flex items-center gap-2">
            {index > 0 && <span className="size-0.5 rounded-full bg-muted" aria-hidden />}
            {tag}
          </span>
        ))}
    </p>
  );
}
