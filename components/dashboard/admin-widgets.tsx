"use client";

import { Building2, Package, ShieldCheck, Wallet } from "lucide-react";
import { AreaTrend, Bars, BreakdownList } from "@/components/dashboard/charts";
import { KpiCard, Panel } from "@/components/dashboard/widgets";
import { SkeletonRows } from "@/components/shared/states";
import type { Category, PlatformStats } from "@/lib/data";
import { useT } from "@/lib/i18n";

export function PlatformKpis({ stats }: { stats?: PlatformStats }) {
  const { t, formatNumber, formatPrice } = useT();
  const s = stats;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard label={t("admin.kpiCompanies")} icon={Building2} loading={!s} value={s && formatNumber(s.manufacturers + s.retailers)} sub={s && t("admin.kpiCompaniesSub", { m: s.manufacturers, r: s.retailers })} />
      <KpiCard label={t("admin.kpiPending")} icon={ShieldCheck} loading={!s} value={s && formatNumber(s.pendingApprovals)} />
      <KpiCard label={t("admin.kpiProducts")} icon={Package} loading={!s} value={s && formatNumber(s.publishedProducts)} sub={s && t("admin.kpiProductsSub", { count: s.products })} />
      <KpiCard label={t("admin.kpiGmv")} icon={Wallet} loading={!s} value={s && formatPrice(s.gmv)} sub={s && t("admin.kpiGmvSub", { count: s.orders })} />
    </div>
  );
}

export function PlatformCharts({ stats, categories, detailed }: { stats?: PlatformStats; categories?: Category[]; detailed?: boolean }) {
  const { t, tx, formatDate, formatNumber, formatPrice } = useT();
  const s = stats;
  const catName = (id: string) => {
    const c = categories?.find((x) => x.id === id);
    return c ? tx(c.nameAr, c.nameEn) : id;
  };
  const monthLabel = (l: string) => formatDate(`${l}-01`, { month: "short" });

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
      <Panel title={t("admin.ordersChart")}>
        {s ? (
          detailed ? (
            <Bars data={s.ordersSeries} formatLabel={monthLabel} formatValue={(v) => formatNumber(v)} height={300} />
          ) : (
            <AreaTrend data={s.ordersSeries} formatLabel={monthLabel} formatValue={(v) => formatNumber(v)} />
          )
        ) : (
          <SkeletonRows rows={5} />
        )}
      </Panel>
      <Panel title={t("admin.categoryChart")}>
        {s ? <BreakdownList items={s.productsByCategory.map((p) => ({ key: p.label, label: catName(p.label), value: p.value }))} /> : <SkeletonRows rows={5} />}
      </Panel>
      {detailed && (
        <Panel title={t("admin.topMakers")} className="xl:col-span-2">
          {s ? (
            <BreakdownList
              items={s.topManufacturers.map((m) => ({
                key: m.companyId,
                label: `${m.name} · ${t("admin.kpiGmvSub", { count: m.orders })}`,
                value: m.value,
                display: formatPrice(m.value),
              }))}
            />
          ) : (
            <SkeletonRows rows={5} />
          )}
        </Panel>
      )}
    </div>
  );
}
