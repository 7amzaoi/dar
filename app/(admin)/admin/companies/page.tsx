"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { PageHeader } from "@/components/dashboard/widgets";
import { CompanyMark } from "@/components/shared/logo";
import { db, type Company } from "@/lib/data";
import { useQuery } from "@/lib/hooks/use-query";
import { useT } from "@/lib/i18n";

export default function CompaniesPage() {
  const { t, country, city } = useT();
  const q = useQuery(async () => {
    const [companies, products] = await Promise.all([db.companies.list(), db.products.list({ publishedOnly: false })]);
    return { companies, counts: products.reduce((m, p) => m.set(p.manufacturerId, (m.get(p.manufacturerId) ?? 0) + 1), new Map<string, number>()) };
  }, []);

  const columns: Column<Company>[] = [
    {
      key: "name",
      header: t("admin.colName"),
      sortValue: (c) => c.name,
      cell: (c) => (
        <div className="flex min-w-48 items-center gap-3">
          <CompanyMark name={c.name} className="size-9 text-sm" />
          <span className="font-medium">{c.name}</span>
        </div>
      ),
    },
    { key: "type", header: t("admin.colType"), sortValue: (c) => c.type, cell: (c) => t(`status.companyType.${c.type}`) },
    { key: "location", header: t("admin.colLocation"), sortValue: (c) => c.country, cell: (c) => <span className="text-muted-foreground">{city(c.city)}, {country(c.country)}</span> },
    { key: "products", header: t("dash.products"), sortValue: (c) => q.data?.counts.get(c.id) ?? 0, cell: (c) => (c.type === "manufacturer" ? <span className="tabular-nums">{q.data?.counts.get(c.id) ?? 0}</span> : "—") },
    {
      key: "verified",
      header: t("admin.colVerified"),
      cell: (c) => (
        <Switch
          checked={c.verified}
          aria-label={t("admin.colVerified")}
          onCheckedChange={async (v) => {
            await db.companies.update(c.id, { verified: v });
            toast.success(t("common.updated"));
          }}
        />
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-end",
      cell: (c) => (
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href={`/company/${c.id}`} aria-label={t("common.view")}>
            <ExternalLink className="size-3.5" strokeWidth={1.6} />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t("admin.companiesTitle")} description={t("admin.companiesSubtitle")} />
      <DataTable
        rows={q.data?.companies}
        columns={columns}
        getRowId={(c) => c.id}
        loading={q.loading}
        error={q.error}
        onRetry={q.reload}
        searchText={(c) => `${c.name} ${c.city}`}
        empty={{ title: t("common.noResults") }}
      />
    </>
  );
}
