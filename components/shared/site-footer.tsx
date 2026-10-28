"use client";

import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { useT } from "@/lib/i18n";

export function SiteFooter() {
  const { t } = useT();
  const cols = [
    {
      title: t("footer.explore"),
      links: [
        { href: "/catalog", label: t("nav.catalog") },
        { href: "/collections", label: t("nav.collections") },
        { href: "/makers", label: t("nav.manufacturers") },
        { href: "/#how", label: t("nav.howItWorks") },
      ],
    },
    {
      title: t("footer.trade"),
      links: [
        { href: "/register", label: t("common.register") },
        { href: "/login", label: t("common.signIn") },
      ],
    },
  ];

  return (
    <footer className="mt-20 border-t border-hairline bg-surface md:mt-32">
      <div className="container-page grid gap-10 pt-12 pb-14 md:grid-cols-[1.6fr_1fr_1fr] md:gap-12 md:pt-16 md:pb-20">
        <div className="max-w-sm space-y-5">
          <Logo />
          <p className="text-sm leading-relaxed text-pretty text-muted-foreground">{t("footer.blurb")}</p>
        </div>
        {cols.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="mb-5 text-sm font-medium">{col.title}</h2>
            <ul className="space-y-3 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="link-underline text-muted-foreground transition-colors hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-hairline">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>{t("footer.rights")}</span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/legal#terms" className="hover:text-foreground">{t("footer.terms")}</Link>
            <Link href="/legal#privacy" className="hover:text-foreground">{t("footer.privacy")}</Link>
            <span>{t("common.demoNote")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
