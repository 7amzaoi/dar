"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { useT } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useT();
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Logo />
      <div className="mt-16 font-display text-[7rem] leading-none text-brass/60">404</div>
      <h1 className="display-md mt-4">{t("common.notFound")}</h1>
      <p className="mt-3 max-w-md text-muted-foreground">{t("common.notFoundBody")}</p>
      <div className="mt-8 flex gap-3">
        <Button asChild>
          <Link href="/">{t("common.goHome")}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/catalog">{t("nav.catalog")}</Link>
        </Button>
      </div>
    </main>
  );
}
