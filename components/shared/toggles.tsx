"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
  const { t, locale, setLocale } = useT();
  const next = locale === "ar" ? "en" : "ar";
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLocale(next)}
      title={t("common.languageLabel")}
      lang={next}
      className={cn("font-medium", className)}
    >
      {t("common.language")}
    </Button>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useT();
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={t("common.themeToggle")}
      className={className}
    >
      <Sun className="hidden size-4 dark:block" strokeWidth={1.6} />
      <Moon className="size-4 dark:hidden" strokeWidth={1.6} />
    </Button>
  );
}
