import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Geist, Geist_Mono, Instrument_Serif, Noto_Serif_TC } from "next/font/google";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { HTML_LANG, routing } from "@/i18n/routing";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 標題用襯線字：英文用 Instrument Serif，中文用思源宋體
const displayLatin = Instrument_Serif({
  variable: "--font-display-latin",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const serifTC = Noto_Serif_TC({
  variable: "--font-serif-tc",
  subsets: ["latin"],
  weight: ["500", "700"],
  preload: false, // 中文字型很大，不預先載入
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Landing.meta");
  return { title: t("title"), description: t("description") };
}

// 每個語系都預先產生靜態頁面
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await rootLocale();
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <html
      lang={HTML_LANG[locale]}
      className={`${geistSans.variable} ${geistMono.variable} ${displayLatin.variable} ${serifTC.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <NextIntlClientProvider>
          <SiteHeader />
          <div className="flex flex-1 flex-col">{children}</div>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
