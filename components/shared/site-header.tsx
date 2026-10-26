"use client";

import { useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, Bell, ClipboardList, Heart, LayoutDashboard, LogOut, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/shared/logo";
import { LanguageToggle, ThemeToggle } from "@/components/shared/toggles";
import { homeFor, useAuth } from "@/lib/auth";
import { db } from "@/lib/data";
import { useFavorites, useRfq } from "@/lib/hooks/commerce-providers";
import { useQuery } from "@/lib/hooks/use-query";
import { useT, type TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const NAV: { href: string; key: TKey }[] = [
  { href: "/catalog", key: "nav.catalog" },
  { href: "/collections", key: "nav.collections" },
  { href: "/makers", key: "nav.manufacturers" },
];

function CountBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="absolute -top-0.5 -end-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[0.6rem] font-semibold leading-4 text-brand-foreground">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function UserMenu({ align = "end" }: { align?: "start" | "end" }) {
  const { t } = useT();
  const { currentUser, company, logout } = useAuth();
  const router = useRouter();
  if (!currentUser) return null;
  const initials = currentUser.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-surface font-display text-sm text-foreground transition-colors hover:border-brand"
          aria-label={t("nav.account")}
        >
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="text-sm font-medium text-foreground">{currentUser.name}</div>
          <div className="truncate text-xs text-muted-foreground">{company?.name ?? currentUser.email}</div>
          <div className="mt-1 text-[0.7rem] text-brand-strong">{t(`status.role.${currentUser.role}`)}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push(homeFor(currentUser))}>
          <LayoutDashboard className="size-4" strokeWidth={1.6} />
          {t("common.dashboard")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => void logout()}
        >
          <LogOut className="size-4" strokeWidth={1.6} />
          {t("common.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function NotificationBell() {
  const { t } = useT();
  const { currentUser } = useAuth();
  const unread = useQuery(() => (currentUser ? db.notifications.unreadCount(currentUser.id) : Promise.resolve(0)), [currentUser?.id]);
  if (!currentUser || currentUser.status !== "approved") return null;
  return (
    <Button variant="ghost" size="icon-sm" asChild className="relative">
      <Link href={`/${currentUser.role}/notifications`} aria-label={t("nav.notifications")}>
        <Bell className="size-4" strokeWidth={1.6} />
        <CountBadge count={unread.data ?? 0} />
      </Link>
    </Button>
  );
}

export function SiteHeader() {
  const { t, dir } = useT();
  const pathname = usePathname();
  const { ready, currentUser, isApproved } = useAuth();
  const favorites = useFavorites();
  const rfq = useRfq();
  const isRetailer = currentUser?.role === "retailer" && isApproved;

  // The landing hero carries its own navbar; this header slides in once the hero scrolls away.
  const isHome = pathname === "/";
  const [pastHero, setPastHero] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => {
    if (isHome) setPastHero(y > window.innerHeight * 0.85);
  });
  const hidden = isHome && !pastHero;

  return (
    <header
      className={cn(
        "top-0 z-40 px-3 pt-3 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] md:px-5",
        isHome ? "fixed inset-x-0" : "sticky",
        hidden && "-translate-y-[120%] opacity-0",
      )}
      inert={hidden || undefined}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-3 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        {t("common.skipToContent")}
      </a>
      <div className="glass mx-auto flex h-16 w-full max-w-[1400px] items-center gap-4 rounded-full ps-3 pe-2 sm:ps-5 lg:gap-6">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label={t("common.menu")}>
              <Menu className="size-5" strokeWidth={1.5} />
            </Button>
          </SheetTrigger>
          <SheetContent side={dir === "rtl" ? "right" : "left"} className="w-[86vw] max-w-sm border-0 bg-background/95 p-0 backdrop-blur-2xl">
            <SheetTitle className="sr-only">{t("common.menu")}</SheetTitle>
            <div className="flex h-full flex-col">
              <div className="border-b border-hairline px-6 py-5">
                <Logo />
              </div>
              <nav className="flex flex-col px-6 py-6">
                {NAV.map((item) => (
                  <Link key={item.href} href={item.href} className="border-b border-hairline py-4 font-display text-3xl tracking-tight transition-colors hover:text-brand">
                    {t(item.key)}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto flex items-center gap-2 border-t border-hairline px-6 py-5">
                <LanguageToggle />
                <ThemeToggle />
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex-1 lg:flex-none">
          <Logo />
        </div>

        <nav className="hidden flex-1 items-center justify-center gap-8 lg:flex" aria-label="Main">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn("relative py-1 text-sm transition-colors", active ? "text-foreground after:absolute after:inset-x-0 after:-bottom-1 after:mx-auto after:h-0.5 after:w-4 after:rounded-full after:bg-brand" : "text-hero-nav/80 hover:text-foreground dark:text-muted-foreground")}
                aria-current={active ? "page" : undefined}
              >
                {t(item.key)}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/catalog" aria-label={t("common.search")}>
              <Search className="size-4" strokeWidth={1.6} />
            </Link>
          </Button>
          <LanguageToggle className="hidden sm:inline-flex" />
          <ThemeToggle className="hidden sm:inline-flex" />

          {isRetailer && (
            <>
              <Button variant="ghost" size="icon-sm" asChild className="relative">
                <Link href="/retailer/saved" aria-label={t("nav.favorites")}>
                  <Heart className="size-4" strokeWidth={1.6} />
                  <CountBadge count={favorites.ids.size} />
                </Link>
              </Button>
              <Button variant="ghost" size="icon-sm" asChild className="relative">
                <Link href="/retailer/rfq" aria-label={t("nav.rfq")}>
                  <ClipboardList className="size-4" strokeWidth={1.6} />
                  <CountBadge count={rfq.count} />
                </Link>
              </Button>
            </>
          )}

          {!ready ? (
            <span className="size-9" aria-hidden />
          ) : currentUser ? (
            <>
              <NotificationBell />
              <span className="ms-1.5">
                <UserMenu />
              </span>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link href="/login">{t("common.signIn")}</Link>
              </Button>
              <Button size="sm" asChild className="group ms-1 ps-1.5">
                <Link href="/register">
                  <span className="flex size-6 items-center justify-center rounded-full bg-white/20 transition-transform duration-300 group-hover:-translate-y-px group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
                    <ArrowUpRight className="size-3.5 rtl:-scale-x-100" />
                  </span>
                  {t("common.register")}
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
