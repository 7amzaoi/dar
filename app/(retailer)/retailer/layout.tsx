"use client";

import type { ReactNode } from "react";
import { Bell, ClipboardList, Heart, LayoutGrid, Receipt, Store } from "lucide-react";
import { DashboardShell, type NavItem } from "@/components/dashboard/dashboard-shell";
import { RoleGuard } from "@/components/dashboard/role-guard";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/data";
import { useFavorites, useRfq } from "@/lib/hooks/commerce-providers";
import { useQuery } from "@/lib/hooks/use-query";
import { useT } from "@/lib/i18n";

function RetailerShell({ children }: { children: ReactNode }) {
  const { t } = useT();
  const { currentUser } = useAuth();
  const favorites = useFavorites();
  const rfq = useRfq();
  const companyId = currentUser?.companyId ?? "";
  const userId = currentUser?.id ?? "";

  const badges = useQuery(async () => {
    const [orders, unread] = await Promise.all([db.orders.listByRetailer(companyId), db.notifications.unreadCount(userId)]);
    return { quoted: orders.filter((o) => o.status === "quoted").length, unread };
  }, [companyId, userId]);

  const items: NavItem[] = [
    { href: "/retailer", label: t("dash.overview"), icon: LayoutGrid, exact: true },
    { href: "/catalog", label: t("dash.browse"), icon: Store },
    { href: "/retailer/saved", label: t("dash.saved"), icon: Heart, badge: favorites.ids.size },
    { href: "/retailer/rfq", label: t("dash.rfq"), icon: ClipboardList, badge: rfq.count },
    { href: "/retailer/orders", label: t("dash.orders"), icon: Receipt, badge: badges.data?.quoted },
    { href: "/retailer/notifications", label: t("dash.notifications"), icon: Bell, badge: badges.data?.unread },
  ];

  return (
    <DashboardShell area={t("dash.retailerArea")} items={items}>
      {children}
    </DashboardShell>
  );
}

export default function RetailerLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard role="retailer">
      <RetailerShell>{children}</RetailerShell>
    </RoleGuard>
  );
}
