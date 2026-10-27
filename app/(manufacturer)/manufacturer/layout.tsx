"use client";

import type { ReactNode } from "react";
import { LayoutGrid, Package, Receipt } from "lucide-react";
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

  const rfqs = useQuery(async () => (await db.orders.listByManufacturer(companyId)).filter((o) => o.status === "quote_requested").length, [companyId]);

  // Three places only. Collections live on the products page, notifications behind the bell,
  // and the company profile in the account menu.
  const items: NavItem[] = [
    { href: "/manufacturer", label: t("dash.overview"), icon: LayoutGrid, exact: true },
    { href: "/manufacturer/products", label: t("dash.products"), icon: Package },
    { href: "/manufacturer/orders", label: t("dash.orders"), icon: Receipt, badge: rfqs.data },
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
