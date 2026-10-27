"use client";

import Link from "next/link";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CollectionsSection } from "@/components/dashboard/collections-section";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { PageHeader } from "@/components/dashboard/widgets";
import { FurnitureImage } from "@/components/shared/furniture-image";
import { StockBadge } from "@/components/shared/status-badge";
import { useAuth } from "@/lib/auth";
import { basePrice, db, type Product } from "@/lib/data";
import { useQuery } from "@/lib/hooks/use-query";
import { useT } from "@/lib/i18n";

export default function ManufacturerProducts() {
  const { t, tx, formatPrice } = useT();
  const { currentUser } = useAuth();
  const companyId = currentUser?.companyId ?? "";

  const q = useQuery(async () => {
    const [products, categories] = await Promise.all([db.products.listByManufacturer(companyId), db.categories.list()]);
    return { products, categories: new Map(categories.map((c) => [c.id, c])) };
  }, [companyId]);

  const togglePublished = async (p: Product, published: boolean) => {
    await db.products.update(p.id, { published });
    toast.success(published ? t("mfr.publishedToast") : t("mfr.unpublishedToast"));
  };

  const columns: Column<Product>[] = [
    {
      key: "product",
      header: t("mfr.colProduct"),
      sortValue: (p) => tx(p.titleAr, p.titleEn),
      cell: (p) => (
        <div className="flex min-w-56 items-center gap-3">
          <div className="relative size-12 shrink-0 overflow-hidden rounded bg-secondary">
            <FurnitureImage src={p.images[0]} alt="" sizes="48px" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium">{tx(p.titleAr, p.titleEn)}</div>
            <div className="font-mono text-[0.68rem] text-muted-foreground">{p.id}</div>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: t("mfr.colCategory"),
      cell: (p) => {
        const c = q.data?.categories.get(p.categoryId);
        return <span className="text-muted-foreground">{c ? tx(c.nameAr, c.nameEn) : "—"}</span>;
      },
    },
    { key: "price", header: t("mfr.colPrice"), sortValue: basePrice, cell: (p) => <span className="tabular-nums">{formatPrice(basePrice(p))}</span> },
    { key: "moq", header: t("mfr.colMoq"), sortValue: (p) => p.minOrderQty, cell: (p) => <span className="tabular-nums">{p.minOrderQty}</span> },
    { key: "stock", header: t("mfr.colStock"), cell: (p) => <StockBadge status={p.stockStatus} /> },
    {
      key: "published",
      header: t("mfr.colPublished"),
      cell: (p) => <Switch checked={p.published} onCheckedChange={(v) => togglePublished(p, v)} aria-label={t("mfr.colPublished")} />,
    },
    {
      key: "actions",
      header: "",
      className: "text-end",
      cell: (p) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href={`/product/${p.id}`} aria-label={t("common.view")} target="_blank">
              <ExternalLink className="size-3.5" strokeWidth={1.6} />
            </Link>
          </Button>
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href={`/manufacturer/products/${p.id}/edit`} aria-label={t("common.edit")}>
              <Pencil className="size-3.5" strokeWidth={1.6} />
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

  const newButton = (
    <Button asChild>
      <Link href="/manufacturer/products/new">
        <Plus className="size-4" /> {t("mfr.newProduct")}
      </Link>
    </Button>
  );

  return (
    <>
      <PageHeader title={t("mfr.productsTitle")} description={t("mfr.productsSubtitle")} actions={newButton} />
      <DataTable
        rows={q.data?.products}
        columns={columns}
        getRowId={(p) => p.id}
        loading={q.loading}
        error={q.error}
        onRetry={q.reload}
        searchText={(p) => `${p.titleAr} ${p.titleEn} ${p.id}`}
        searchPlaceholder={t("mfr.searchProducts")}
        rowHref={(p) => `/manufacturer/products/${p.id}/edit`}
        empty={{ title: t("mfr.emptyProducts"), body: t("mfr.emptyProductsBody"), action: newButton }}
      />
      <CollectionsSection />
    </>
  );
}
