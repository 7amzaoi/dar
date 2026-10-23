"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ClipboardList, Heart, LayoutDashboard, LogOut, Menu, Search } from "lucide-react";
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
    <span className="absolute -top-0.5 -end-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-brass px-1 text-[0.6rem] font-semibold leading-4 text-brass-foreground">
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
          className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-surface font-display text-sm text-foreground transition-colors hover:border-brass"
          aria-label={t("nav.account")}
        >
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="text-sm font-medium text-foreground">{currentUser.name}</div>
          <div className="truncate text-xs text-muted-foreground">{company?.name ?? currentUser.email}</div>
          <div className="mt-1 text-[0.7rem] text-brass-deep">{t(`status.role.${currentUser.role}`)}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push(homeFor(currentUser))}>
          <LayoutDashboard className="size-4" strokeWidth={1.6} />
          {t("common.dashboard")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            logout();
            router.push("/");
          }}
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

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-3 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        {t("common.skipToContent")}
      </a>
      <div className="container-page flex h-[4.5rem] items-center gap-6">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label={t("common.menu")}>
              <Menu className="size-5" strokeWidth={1.5} />
            </Button>
          </SheetTrigger>
          <SheetContent side={dir === "rtl" ? "right" : "left"} className="w-[86vw] max-w-sm p-0">
            <SheetTitle className="sr-only">{t("common.menu")}</SheetTitle>
            <div className="flex h-full flex-col">
              <div className="border-b border-hairline px-6 py-5">
                <Logo />
              </div>
              <nav className="flex flex-col px-6 py-6">
                {NAV.map((item) => (
                  <Link key={item.href} href={item.href} className="border-b border-hairline py-4 font-display text-2xl">
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

        <Logo />

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Main">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn("link-underline py-1 text-sm transition-colors", active ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
                aria-current={active ? "page" : undefined}
              >
                {t(item.key)}
              </Link>
            );
          })}
        </nav>

        <div className="ms-auto flex items-center gap-1 sm:gap-1.5">
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
              <Button size="sm" asChild className="ms-1">
                <Link href="/register">{t("common.register")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
