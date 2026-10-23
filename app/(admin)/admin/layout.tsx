"use client";

import type { ReactNode } from "react";
import { BarChart3, Bell, Building2, FolderTree, LayoutGrid, ShieldCheck, ShoppingBag, Users } from "lucide-react";
import { DashboardShell, type NavItem } from "@/components/dashboard/dashboard-shell";
import { RoleGuard } from "@/components/dashboard/role-guard";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/data";
import { useQuery } from "@/lib/hooks/use-query";
import { useT } from "@/lib/i18n";

function AdminShell({ children }: { children: ReactNode }) {
  const { t } = useT();
  const { currentUser } = useAuth();
  const userId = currentUser?.id ?? "";
  const badges = useQuery(async () => {
    const [pending, unread] = await Promise.all([db.users.list({ status: "pending" }), db.notifications.unreadCount(userId)]);
    return { pending: pending.length, unread };
  }, [userId]);

  const items: NavItem[] = [
    { href: "/admin", label: t("dash.overview"), icon: LayoutGrid, exact: true },
    { href: "/admin/approvals", label: t("dash.approvals"), icon: ShieldCheck, badge: badges.data?.pending },
    { href: "/admin/users", label: t("dash.users"), icon: Users },
    { href: "/admin/companies", label: t("dash.companies"), icon: Building2 },
    { href: "/admin/categories", label: t("dash.categories"), icon: FolderTree },
    { href: "/admin/products", label: t("dash.moderation"), icon: ShoppingBag },
    { href: "/admin/reports", label: t("dash.reports"), icon: BarChart3 },
    { href: "/admin/notifications", label: t("dash.notifications"), icon: Bell, badge: badges.data?.unread },
  ];

  return (
    <DashboardShell area={t("dash.adminArea")} items={items}>
      {children}
    </DashboardShell>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard role="admin">
      <AdminShell>{children}</AdminShell>
    </RoleGuard>
  );
}
