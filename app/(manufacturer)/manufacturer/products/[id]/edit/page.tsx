"use client";

import { use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductForm } from "@/components/dashboard/product-form";
import { PageHeader } from "@/components/dashboard/widgets";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/shared/states";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/data";
import { useQuery } from "@/lib/hooks/use-query";
import { useT } from "@/lib/i18n";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, tx } = useT();
  const { currentUser } = useAuth();
  const companyId = currentUser?.companyId ?? "";

  // The form copies `initial` into its own state, so background refetches never clobber edits.
  const q = useQuery(async () => {
    const [product, categories, collections] = await Promise.all([db.products.getById(id), db.categories.list(), db.collections.listByManufacturer(companyId)]);
    return { product, categories, collections };
  }, [id, companyId]);

  if (q.error) return <ErrorState onRetry={q.reload} />;
  if (!q.data) return <SkeletonRows rows={8} />;

  const { product, categories, collections } = q.data;
  if (!product || product.manufacturerId !== companyId) {
    return (
      <EmptyState
        title={t("common.notFound")}
        body={t("common.notFoundBody")}
        action={<Button asChild variant="outline"><Link href="/manufacturer/products">{t("dash.products")}</Link></Button>}
      />
    );
  }

  return (
    <>
      <PageHeader eyebrow={t("mfr.formEditTitle")} title={tx(product.titleAr, product.titleEn)} />
      <ProductForm key={product.id} initial={product} manufacturerId={companyId} categories={categories} collections={collections} />
    </>
  );
}
