"use client";

import Link from "next/link";
import { ClipboardList, Heart, Hourglass, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KpiCard, PageHeader, Panel } from "@/components/dashboard/widgets";
import { ArrowForward } from "@/components/shared/icons";
import { ProductCard } from "@/components/shared/product-card";
import { EmptyState, ErrorState, SkeletonGrid, SkeletonRows } from "@/components/shared/states";
import { OrderStatusBadge } from "@/components/shared/status-badge";
import { useAuth } from "@/lib/auth";
import { db, orderTotal } from "@/lib/data";
import { useFavorites, useRfq } from "@/lib/hooks/commerce-providers";
import { useQuery } from "@/lib/hooks/use-query";
import { useT } from "@/lib/i18n";

export default function RetailerOverview() {
  const { t, formatNumber, formatPrice, relativeTime } = useT();
  const { currentUser, company } = useAuth();
  const favorites = useFavorites();
  const rfq = useRfq();
  const companyId = currentUser?.companyId ?? "";

  const q = useQuery(async () => {
    const [orders, makers, products] = await Promise.all([db.orders.listByRetailer(companyId), db.companies.list({ type: "manufacturer" }), db.products.list({ sort: "newest" })]);
    return { orders, makers: new Map(makers.map((m) => [m.id, m.name])), products };
  }, [companyId]);

  const productMap = new Map(q.data?.products.map((p) => [p.id, p]));
  const quoted = q.data?.orders.filter((o) => o.status === "quoted") ?? [];
  const awaiting = q.data?.orders.filter((o) => o.status === "quote_requested").length;
  const active = q.data?.orders.filter((o) => ["confirmed", "in_production", "shipped"].includes(o.status)).length;

  return (
    <>
      <PageHeader
        eyebrow={company?.name}
        title={t("dash.greeting", { name: currentUser?.name.split(" ")[0] ?? "" })}
        actions={
          <Button asChild>
            <Link href="/catalog">
              {t("dash.browse")} <ArrowForward className="size-4" />
            </Link>
          </Button>
        }
      />
      {q.error ? (
        <ErrorState onRetry={q.reload} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label={t("ret.kpiSaved")} icon={Heart} value={formatNumber(favorites.ids.size)} />
            <KpiCard label={t("ret.kpiRfq")} icon={ClipboardList} value={formatNumber(rfq.count)} />
            <KpiCard label={t("ret.kpiOpenQuotes")} icon={Hourglass} loading={awaiting == null} value={awaiting != null && formatNumber(awaiting)} />
            <KpiCard label={t("ret.kpiActive")} icon={Receipt} loading={active == null} value={active != null && formatNumber(active)} />
          </div>

          <Panel className="mt-6" title={t("ret.quotesReady")} bodyClassName="p-0">
            {!q.data ? (
              <SkeletonRows rows={2} className="p-6" />
            ) : quoted.length === 0 ? (
              <p className="px-6 py-8 text-sm text-muted-foreground">{t("ret.noQuotes")}</p>
            ) : (
              <ul className="divide-y divide-hairline">
                {quoted.map((o) => (
                  <li key={o.id}>
                    <Link href={`/retailer/orders/${o.id}`} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4 hover:bg-muted/40">
                      <span className="font-mono text-xs text-muted-foreground">{o.id}</span>
                      <span className="min-w-40 flex-1 font-medium">{q.data?.makers.get(o.manufacturerId)}</span>
                      <span className="font-display text-xl tabular-nums">{formatPrice(orderTotal(o, productMap))}</span>
                      <OrderStatusBadge status={o.status} />
                      <span className="text-xs text-muted-foreground">{relativeTime(o.history?.at(-1)?.at ?? o.createdAt)}</span>
                      <ArrowForward className="size-4 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <section className="mt-12">
            <div className="mb-6 flex items-end justify-between">
              <h2 className="font-display text-3xl">{t("ret.recommended")}</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/catalog">{t("dash.viewAll")} <ArrowForward className="size-3.5" /></Link>
              </Button>
            </div>
            {!q.data ? (
              <SkeletonGrid count={4} className="md:grid-cols-4" />
            ) : q.data.products.length === 0 ? (
              <EmptyState title={t("common.noResults")} />
            ) : (
              <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
                {q.data.products.slice(0, 4).map((p) => (
                  <ProductCard key={p.id} product={p} makerName={q.data?.makers.get(p.manufacturerId)} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
