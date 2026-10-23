"use client";

import type { ReactNode } from "react";
import { Bell, Building2, FolderOpen, LayoutGrid, MessageSquare, Package, Receipt } from "lucide-react";
import { DashboardShell, type NavItem } from "@/components/dashboard/dashboard-shell";
import { RoleGuard } from "@/components/dashboard/role-guard";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/data";
import { useQuery } from "@/lib/hooks/use-query";
import { useT } from "@/lib/i18n";

function ManufacturerShell({ children }: { children: ReactNode }) {
  const { t } = useT();
  const { currentUser } = useAuth();
  const companyId = currentUser?.companyId ?? "";
  const userId = currentUser?.id ?? "";

  const badges = useQuery(async () => {
    const [orders, unread, convs] = await Promise.all([
      db.orders.listByManufacturer(companyId),
      db.notifications.unreadCount(userId),
      db.messages.listConversations(userId),
    ]);
    return {
      rfq: orders.filter((o) => o.status === "quote_requested").length,
      unread,
      messages: convs.reduce((s, c) => s + c.unread, 0),
    };
  }, [companyId, userId]);

  const items: NavItem[] = [
    { href: "/manufacturer", label: t("dash.overview"), icon: LayoutGrid, exact: true },
    { href: "/manufacturer/products", label: t("dash.products"), icon: Package },
    { href: "/manufacturer/collections", label: t("dash.collections"), icon: FolderOpen },
    { href: "/manufacturer/orders", label: t("dash.orders"), icon: Receipt, badge: badges.data?.rfq },
    { href: "/manufacturer/messages", label: t("dash.messages"), icon: MessageSquare, badge: badges.data?.messages },
    { href: "/manufacturer/notifications", label: t("dash.notifications"), icon: Bell, badge: badges.data?.unread },
    { href: "/manufacturer/profile", label: t("dash.profile"), icon: Building2 },
  ];

  return (
    <DashboardShell area={t("dash.manufacturerArea")} items={items}>
      {children}
    </DashboardShell>
  );
}

export default function ManufacturerLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard role="manufacturer">
      <ManufacturerShell>{children}</ManufacturerShell>
    </RoleGuard>
  );
}
