"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlatformCharts, PlatformKpis } from "@/components/dashboard/admin-widgets";
import { PageHeader, Panel } from "@/components/dashboard/widgets";
import { ArrowForward } from "@/components/shared/icons";
import { ErrorState, SkeletonRows } from "@/components/shared/states";
import { AccountStatusBadge } from "@/components/shared/status-badge";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/data";
import { useQuery } from "@/lib/hooks/use-query";
import { useT } from "@/lib/i18n";

export default function AdminOverview() {
  const { t, relativeTime } = useT();
  const { currentUser } = useAuth();
  const q = useQuery(async () => {
    const [stats, categories, pending, companies] = await Promise.all([db.analytics.platformStats(), db.categories.list(), db.users.list({ status: "pending" }), db.companies.list()]);
    return { stats, categories, pending, companies: new Map(companies.map((c) => [c.id, c])) };
  }, []);

  return (
    <>
      <PageHeader eyebrow={t("dash.adminArea")} title={t("dash.greeting", { name: currentUser?.name.split(" ")[0] ?? "" })} />
      {q.error ? (
        <ErrorState onRetry={q.reload} />
      ) : (
        <>
          <PlatformKpis stats={q.data?.stats} />
          <PlatformCharts stats={q.data?.stats} categories={q.data?.categories} />
          <Panel
            className="mt-6"
            title={t("admin.approvalsTitle")}
            bodyClassName="p-0"
            actions={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/approvals">
                  {t("dash.viewAll")} <ArrowForward className="size-3.5" />
                </Link>
              </Button>
            }
          >
            {!q.data ? (
              <SkeletonRows rows={3} className="p-6" />
            ) : q.data.pending.length === 0 ? (
              <p className="px-6 py-8 text-sm text-muted-foreground">{t("admin.emptyApprovalsBody")}</p>
            ) : (
              <ul className="divide-y divide-hairline">
                {q.data.pending.map((u) => (
                  <li key={u.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-6 py-4">
                    <span className="min-w-48 flex-1">
                      <span className="block font-medium">{q.data?.companies.get(u.companyId)?.name}</span>
                      <span className="text-xs text-muted-foreground">{u.name} · {t(`status.role.${u.role}`)}</span>
                    </span>
                    <AccountStatusBadge status={u.status} />
                    <span className="text-xs text-muted-foreground">{relativeTime(u.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </>
  );
}
