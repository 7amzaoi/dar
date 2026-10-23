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
      ],
    },
    {
      title: t("footer.trade"),
      links: [
        { href: "/register", label: t("footer.forManufacturers") },
        { href: "/register", label: t("footer.forRetailers") },
        { href: "/login", label: t("common.signIn") },
      ],
    },
    {
      title: t("footer.company"),
      links: [
        { href: "/#how", label: t("footer.about") },
        { href: "/#how", label: t("footer.terms") },
        { href: "/#how", label: t("footer.privacy") },
      ],
    },
  ];

  return (
    <footer className="mt-32 border-t border-hairline bg-surface">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs space-y-5">
          <Logo />
          <p className="text-sm leading-relaxed text-muted-foreground">{t("footer.blurb")}</p>
        </div>
        {cols.map((col) => (
          <div key={col.title}>
            <h2 className="eyebrow mb-5 font-sans">{col.title}</h2>
            <ul className="space-y-3 text-sm">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="link-underline text-muted-foreground transition-colors hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-hairline">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>{t("footer.rights")}</span>
          <span>{t("common.demoNote")}</span>
        </div>
      </div>
    </footer>
  );
}
