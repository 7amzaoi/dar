"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { PageHeader } from "@/components/dashboard/widgets";
import { FurnitureImage } from "@/components/shared/furniture-image";
import { Pill, StockBadge } from "@/components/shared/status-badge";
import { basePrice, db, type Product } from "@/lib/data";
import { useQuery } from "@/lib/hooks/use-query";
import { useT } from "@/lib/i18n";

type Visibility = "all" | "published" | "draft";

export default function ModerationPage() {
  const { t, tx, formatPrice } = useT();
  const [visibility, setVisibility] = useState<Visibility>("all");

  const q = useQuery(async () => {
    const [products, makers] = await Promise.all([db.products.list({ publishedOnly: false }), db.companies.list({ type: "manufacturer" })]);
    return { products, makers: new Map(makers.map((m) => [m.id, m.name])) };
  }, []);

  const rows = q.data?.products.filter((p) => visibility === "all" || (visibility === "published" ? p.published : !p.published));

  // TODO(backend): moderation actions should be audited (who/when/why).
  const columns: Column<Product>[] = [
    {
      key: "product",
      header: t("mfr.colProduct"),
      sortValue: (p) => tx(p.titleAr, p.titleEn),
      cell: (p) => (
        <div className="flex min-w-56 items-center gap-3">
          <div className="relative size-11 shrink-0 overflow-hidden rounded bg-secondary">
            <FurnitureImage src={p.images[0]} alt="" sizes="44px" />
          </div>
          <span className="truncate font-medium">{tx(p.titleAr, p.titleEn)}</span>
        </div>
      ),
    },
    { key: "maker", header: t("admin.colMaker"), sortValue: (p) => q.data?.makers.get(p.manufacturerId) ?? "", cell: (p) => <span className="text-muted-foreground">{q.data?.makers.get(p.manufacturerId)}</span> },
    { key: "price", header: t("mfr.colPrice"), sortValue: basePrice, cell: (p) => <span className="tabular-nums">{formatPrice(basePrice(p))}</span> },
    { key: "stock", header: t("mfr.colStock"), cell: (p) => <StockBadge status={p.stockStatus} /> },
    { key: "visibility", header: t("common.status"), cell: (p) => (p.published ? <Pill tone="success">{t("mfr.published")}</Pill> : <Pill>{t("mfr.draft")}</Pill>) },
    {
      key: "actions",
      header: "",
      className: "text-end",
      cell: (p) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await db.products.update(p.id, { published: !p.published });
              toast.success(p.published ? t("mfr.unpublishedToast") : t("mfr.publishedToast"));
            }}
          >
            {p.published ? t("admin.unpublish") : t("admin.publish")}
          </Button>
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href={`/product/${p.id}`} aria-label={t("common.view")}>
              <ExternalLink className="size-3.5" strokeWidth={1.6} />
            </Link>
          </Button>
          <ConfirmDialog
            title={t("mfr.deleteProductTitle", { name: tx(p.titleAr, p.titleEn) })}
            description={t("mfr.deleteProductBody")}
            confirmLabel={t("common.delete")}
            onConfirm={async () => {
              await db.products.remove(p.id);
              toast.success(t("mfr.deletedToast"));
            }}
            trigger={
              <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" aria-label={t("common.delete")}>
                <Trash2 className="size-3.5" strokeWidth={1.6} />
              </Button>
            }
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t("admin.moderationTitle")} description={t("admin.moderationSubtitle")} />
      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(p) => p.id}
        loading={q.loading}
        error={q.error}
        onRetry={q.reload}
        searchText={(p) => `${p.titleAr} ${p.titleEn} ${q.data?.makers.get(p.manufacturerId) ?? ""}`}
        empty={{ title: t("common.noResults") }}
        pageSize={12}
        toolbar={
          <Select value={visibility} onValueChange={(v) => setVisibility(v as Visibility)}>
            <SelectTrigger className="w-40" aria-label={t("common.status")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.allStatuses")}</SelectItem>
              <SelectItem value="published">{t("mfr.published")}</SelectItem>
              <SelectItem value="draft">{t("mfr.draft")}</SelectItem>
            </SelectContent>
          </Select>
        }
      />
    </>
  );
}
