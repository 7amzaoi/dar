"use client";

import { PlatformCharts, PlatformKpis } from "@/components/dashboard/admin-widgets";
import { PageHeader } from "@/components/dashboard/widgets";
import { ErrorState } from "@/components/shared/states";
import { db } from "@/lib/data";
import { useQuery } from "@/lib/hooks/use-query";
import { useT } from "@/lib/i18n";

export default function ReportsPage() {
  const { t } = useT();
  const q = useQuery(async () => {
    const [stats, categories] = await Promise.all([db.analytics.platformStats(), db.categories.list()]);
    return { stats, categories };
  }, []);

  return (
    <>
      <PageHeader title={t("admin.reportsTitle")} description={t("admin.reportsSubtitle")} />
      {q.error ? (
        <ErrorState onRetry={q.reload} />
      ) : (
        <>
          <PlatformKpis stats={q.data?.stats} />
          <PlatformCharts stats={q.data?.stats} categories={q.data?.categories} detailed />
        </>
      )}
    </>
  );
}
