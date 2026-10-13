import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { NAV_LINKS } from "@/lib/nav";
import { Wordmark } from "./SiteHeader";

export default async function SiteFooter() {
  const t = await getTranslations("Footer");
  const tn = await getTranslations("Nav");
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[2fr_1fr]">
        <div className="max-w-sm">
          <Wordmark className="text-2xl" />
          <p className="mt-4 text-sm leading-relaxed text-muted">{t("about")}</p>
        </div>
        <div>
          <p className="eyebrow">{t("services")}</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-muted hover:text-foreground">
                  {tn(link.key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>{t("copyright")}</p>
          <p>{t("aiNotice")}</p>
        </div>
      </div>
    </footer>
  );
}
