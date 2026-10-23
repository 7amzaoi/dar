"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ArrowBack } from "@/components/shared/icons";
import { Logo } from "@/components/shared/logo";
import { NotificationBell, UserMenu } from "@/components/shared/site-header";
import { LanguageToggle, ThemeToggle } from "@/components/shared/toggles";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  /** match only the exact path (for the overview item) */
  exact?: boolean;
}

function NavList({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-full px-4 py-2.5 text-sm transition-colors",
                active ? "bg-card font-medium text-sidebar-accent-foreground shadow-soft" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
                            <item.icon className={cn("size-4 shrink-0", active ? "text-brand-strong" : "")} strokeWidth={1.6} />
              <span className="flex-1 truncate">{item.label}</span>
              {!!item.badge && (
                <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[0.68rem] font-medium tabular-nums text-brand-strong">{item.badge}</span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SidebarBody({ area, items, onNavigate }: { area: string; items: NavItem[]; onNavigate?: () => void }) {
  const { t } = useT();
  const { company, currentUser } = useAuth();
  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pb-6 pt-7">
        <Logo />
        <div className="mt-6">
          <div className="eyebrow">{area}</div>
          <div className="mt-1 truncate font-display text-lg">{company?.name ?? currentUser?.name}</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3" aria-label={area}>
        <NavList items={items} onNavigate={onNavigate} />
      </nav>
      <div className="space-y-3 border-t border-sidebar-border px-4 py-4">
        <Link href="/" className="flex items-center gap-2 px-2 text-xs text-muted-foreground hover:text-foreground">
          <ArrowBack className="size-3.5" />
          {t("dash.backToSite")}
        </Link>
        <div className="flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

export function DashboardShell({ area, items, children }: { area: string; items: NavItem[]; children: ReactNode }) {
  const { t, dir } = useT();
  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[272px_1fr]">
      <aside className="sticky top-0 hidden h-dvh border-e border-sidebar-border bg-sidebar lg:block">
        <SidebarBody area={area} items={items} />
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 px-3 pt-3 sm:px-5"><div className="glass flex h-14 items-center gap-3 rounded-full ps-3 pe-2 sm:ps-5">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label={t("common.menu")}>
                <Menu className="size-5" strokeWidth={1.5} />
              </Button>
            </SheetTrigger>
            <SheetContent side={dir === "rtl" ? "right" : "left"} className="w-72 bg-sidebar p-0">
              <SheetTitle className="sr-only">{area}</SheetTitle>
              <SidebarBody area={area} items={items} />
            </SheetContent>
          </Sheet>
          <div className="lg:hidden">
            <Logo compact />
          </div>
          <div className="ms-auto flex items-center gap-1.5">
            <NotificationBell />
            <UserMenu />
          </div>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1280px] flex-1 px-5 pb-20 pt-8 sm:px-8 lg:px-12 lg:pt-12">
          {children}
        </main>
      </div>
    </div>
  );
}
