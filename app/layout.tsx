import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Instrument_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { Providers } from "@/components/shared/providers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import "./globals.css";

// Helvetica Regular (see globals.css) leads every stack; Instrument Sans covers Latin weights
// it lacks, and Arabic glyphs fall through to IBM Plex Sans Arabic.
const instrument = Instrument_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-instrument" });
const plexArabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["300", "400", "500", "600"], variable: "--font-plex-arabic" });

export const metadata: Metadata = {
  title: { default: "Dār — The trade house for furniture", template: "%s · Dār" },
  description: "A closed B2B marketplace connecting furniture manufacturers with showroom retailers.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f0f0f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0e121b" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale: Locale = cookieLocale === "en" || cookieLocale === "ar" ? cookieLocale : DEFAULT_LOCALE;

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      suppressHydrationWarning
      className={`${instrument.variable} ${plexArabic.variable}`}
    >
      <body className="min-h-dvh">
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
