"use client";

import Link from "next/link";
import { Eye, Package, Plus, Receipt, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AreaTrend, BreakdownList } from "@/components/dashboard/charts";
import { KpiCard, PageHeader, Panel } from "@/components/dashboard/widgets";
import { ArrowForward } from "@/components/shared/icons";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/shared/states";
import { OrderStatusBadge } from "@/components/shared/status-badge";
import { useAuth } from "@/lib/auth";
import { db, orderTotal, type OrderStatus } from "@/lib/data";
import { useQuery } from "@/lib/hooks/use-query";
import { useT } from "@/lib/i18n";

const STATUSES: OrderStatus[] = ["quote_requested", "quoted", "confirmed", "in_production", "shipped", "completed", "cancelled"];

export default function ManufacturerOverview() {
  const { t, formatNumber, formatPrice, formatDate, relativeTime } = useT();
  const { currentUser, company } = useAuth();
  const companyId = currentUser?.companyId ?? "";

  const q = useQuery(async () => {
    const [stats, orders, retailers, products] = await Promise.all([
      db.analytics.manufacturerStats(companyId),
      db.orders.listByManufacturer(companyId),
      db.companies.list({ type: "retailer" }),
      db.products.listByManufacturer(companyId),
    ]);
    return { stats, orders, retailers: new Map(retailers.map((r) => [r.id, r.name])), products: new Map(products.map((p) => [p.id, p])) };
  }, [companyId]);

  const s = q.data?.stats;
  const awaiting = q.data?.orders.filter((o) => o.status === "quote_requested") ?? [];

  return (
    <>
      <PageHeader
        eyebrow={company?.name}
        title={t("dash.greeting", { name: currentUser?.name.split(" ")[0] ?? "" })}
        actions={
          <Button asChild>
            <Link href="/manufacturer/products/new">
              <Plus className="size-4" /> {t("mfr.newProduct")}
            </Link>
          </Button>
        }
      />

      {q.error ? (
        <ErrorState onRetry={q.reload} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label={t("mfr.kpiViews")} icon={Eye} loading={!s} value={s && formatNumber(s.views30d)} sub={t("dash.last30")} />
            <KpiCard label={t("mfr.kpiPublished")} icon={Package} loading={!s} value={s && formatNumber(s.publishedProducts)} sub={s && t("mfr.kpiDrafts", { count: s.draftProducts })} />
            <KpiCard label={t("mfr.kpiOpenOrders")} icon={Receipt} loading={!s} value={s && formatNumber(s.openOrders)} sub={s && t("ret.kpiOpenQuotes") + ": " + s.ordersByStatus.quote_requested} />
            <KpiCard label={t("mfr.kpiPipeline")} icon={Wallet} loading={!s} value={s && formatPrice(s.pipelineValue)} />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
            <Panel title={t("mfr.viewsChart")} description={t("dash.last30")}>
              {s ? (
                <AreaTrend data={s.viewsSeries} formatLabel={(l) => formatDate(l, { day: "numeric", month: "short" })} formatValue={(v) => formatNumber(v)} />
              ) : (
                <SkeletonRows rows={5} />
              )}
            </Panel>
            <Panel title={t("mfr.statusChart")}>
              {s ? (
                <BreakdownList items={STATUSES.map((st) => ({ key: st, label: t(`status.order.${st}`), value: s.ordersByStatus[st] }))} />
              ) : (
                <SkeletonRows rows={5} />
              )}
            </Panel>
          </div>

          <Panel
            className="mt-6"
            title={t("mfr.recentRfqs")}
            bodyClassName="p-0"
            actions={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/manufacturer/orders">
                  {t("dash.viewAll")} <ArrowForward className="size-3.5" />
                </Link>
              </Button>
            }
          >
            {!q.data ? (
              <SkeletonRows rows={3} className="p-6" />
            ) : awaiting.length === 0 ? (
              <EmptyState title={t("notifications.empty")} body={t("mfr.noRfqs")} className="m-6" />
            ) : (
              <ul className="divide-y divide-hairline">
                {awaiting.map((o) => (
                  <li key={o.id}>
                    <Link href={`/manufacturer/orders/${o.id}`} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4 transition-colors hover:bg-muted/40">
                      <span className="font-mono text-xs text-muted-foreground">{o.id}</span>
                      <span className="min-w-40 flex-1 font-medium">{q.data?.retailers.get(o.retailerId)}</span>
                      <span className="text-sm text-muted-foreground">{t("common.pieces", { count: o.items.reduce((n, i) => n + i.qty, 0) })}</span>
                      <span className="text-sm tabular-nums">{formatPrice(q.data ? orderTotal(o, q.data.products) : 0)}</span>
                      <OrderStatusBadge status={o.status} />
                      <span className="text-xs text-muted-foreground">{relativeTime(o.createdAt)}</span>
                    </Link>
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
