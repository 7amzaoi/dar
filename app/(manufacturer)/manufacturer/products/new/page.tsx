"use client";

import { ProductForm } from "@/components/dashboard/product-form";
import { PageHeader } from "@/components/dashboard/widgets";
import { ErrorState, SkeletonRows } from "@/components/shared/states";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/data";
import { useQuery } from "@/lib/hooks/use-query";
import { useT } from "@/lib/i18n";

export default function NewProductPage() {
  const { t } = useT();
  const { currentUser } = useAuth();
  const companyId = currentUser?.companyId ?? "";
  const q = useQuery(async () => {
    const [categories, collections] = await Promise.all([db.categories.list(), db.collections.listByManufacturer(companyId)]);
    return { categories, collections };
  }, [companyId]);

  return (
    <>
      <PageHeader eyebrow={t("dash.products")} title={t("mfr.formNewTitle")} />
      {q.error ? (
        <ErrorState onRetry={q.reload} />
      ) : !q.data ? (
        <SkeletonRows rows={8} />
      ) : (
        <ProductForm manufacturerId={companyId} categories={q.data.categories} collections={q.data.collections} />
      )}
    </>
  );
}
