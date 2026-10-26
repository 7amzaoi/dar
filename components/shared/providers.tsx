"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { MotionConfig } from "motion/react";
import { Direction } from "radix-ui";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { FavoritesProvider, RfqProvider } from "@/lib/hooks/commerce-providers";
import { I18nProvider, useT, type Locale } from "@/lib/i18n";

function LocalizedToaster() {
  const { dir } = useT();
  return <Toaster position="top-center" dir={dir} richColors={false} closeButton />;
}

/** Keeps Radix primitives (menus, sliders, tabs) in sync with the document direction. */
function RadixDirection({ children }: { children: ReactNode }) {
  const { dir } = useT();
  return <Direction.Provider dir={dir}>{children}</Direction.Provider>;
}

export function Providers({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <I18nProvider initialLocale={locale}>
          <RadixDirection>
            <AuthProvider>
              <FavoritesProvider>
                <RfqProvider>
                  <TooltipProvider delayDuration={250}>
                    {children}
                    <LocalizedToaster />
                  </TooltipProvider>
                </RfqProvider>
              </FavoritesProvider>
            </AuthProvider>
          </RadixDirection>
        </I18nProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}
