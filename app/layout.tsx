import type { Metadata, Viewport } from "next";
import { Amiri, Cormorant_Garamond, IBM_Plex_Sans_Arabic, Instrument_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { Providers } from "@/components/shared/providers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import "./globals.css";

// Latin faces come first in each stack; Arabic glyphs fall through to the Arabic face.
const cormorant = Cormorant_Garamond({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-display-latin" });
const amiri = Amiri({ subsets: ["arabic"], weight: ["400", "700"], variable: "--font-display-arabic" });
const instrument = Instrument_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-instrument" });
const plexArabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["300", "400", "500", "600"], variable: "--font-plex-arabic" });

export const metadata: Metadata = {
  title: { default: "Dār — The trade house for furniture", template: "%s · Dār" },
  description: "A closed B2B marketplace connecting furniture manufacturers with showroom retailers.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f2ea" },
    { media: "(prefers-color-scheme: dark)", color: "#15110e" },
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
      className={`${cormorant.variable} ${amiri.variable} ${instrument.variable} ${plexArabic.variable}`}
    >
      <body className="min-h-dvh">
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
