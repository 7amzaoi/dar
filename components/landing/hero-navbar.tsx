"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { ChevronForward } from "@/components/shared/icons";
import { Logo } from "@/components/shared/logo";
import { homeFor, useAuth } from "@/lib/auth";
import { useT, type TKey } from "@/lib/i18n";

interface MenuItem {
  href: string;
  label: TKey;
  hasDropdown?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  { href: "/catalog", label: "nav.catalog", hasDropdown: true },
  { href: "/collections", label: "nav.collections", hasDropdown: true },
  { href: "/makers", label: "nav.manufacturers" },
  { href: "/#how", label: "nav.howItWorks" },
];

const MotionLink = motion.create(Link);

export function HeroNavbar() {
  const { t, setLocale, locale } = useT();
  const { ready, currentUser } = useAuth();
  const cta = currentUser ? { href: homeFor(currentUser), label: t("common.dashboard") } : { href: "/register", label: t("common.register") };

  return (
    <nav className="relative z-10 flex w-full items-center justify-between px-6 py-6 md:px-10">
      <div className="hidden flex-1 md:block">
        <Logo tone="ink" />
      </div>

      <ul className="hidden items-center gap-8 text-sm font-normal text-hero-nav md:flex">
        {MENU_ITEMS.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="group flex items-center gap-1 transition-opacity hover:opacity-70">
              {t(item.label)}
              {item.hasDropdown && <ChevronForward className="size-4 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />}
            </Link>
          </li>
        ))}
      </ul>

      <div className="md:hidden">
        <Link href="/" className="text-xl tracking-tighter text-hero-ink/90">
          Dār <span className="text-base">دار</span>
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-end gap-3 md:gap-4">
        <button
          type="button"
          onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
          lang={locale === "ar" ? "en" : "ar"}
          title={t("common.languageLabel")}
          className="rounded-full bg-white/40 px-3 py-1.5 text-xs text-hero-ink/90 backdrop-blur-md transition-colors hover:bg-white/60 md:text-sm"
        >
          {t("common.language")}
        </button>
        {ready && !currentUser && (
          <Link href="/login" className="hidden text-sm text-hero-nav transition-opacity hover:opacity-70 lg:inline">
            {t("common.signIn")}
          </Link>
        )}
        <MotionLink
          href={cta.href}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="group flex items-center gap-2 rounded-full bg-hero-ink/80 py-1.5 ps-2 pe-4 text-white transition-colors hover:bg-hero-ink md:gap-3 md:py-2 md:pe-6"
        >
          <span className="flex items-center justify-center rounded-full bg-white/20 p-1 md:p-1.5">
            <ArrowUpRight className="size-4 text-white md:size-5 rtl:-scale-x-100" />
          </span>
          <span className="text-xs font-normal md:text-sm">{cta.label}</span>
        </MotionLink>
      </div>
    </nav>
  );
}
