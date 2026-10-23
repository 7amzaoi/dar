"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/widgets";
import { ProductCard } from "@/components/shared/product-card";
import { EmptyState, QueryView, SkeletonGrid } from "@/components/shared/states";
import { db } from "@/lib/data";
import { useFavorites } from "@/lib/hooks/commerce-providers";
import { useQuery } from "@/lib/hooks/use-query";
import { useT } from "@/lib/i18n";

export default function SavedPage() {
  const { t } = useT();
  const favorites = useFavorites();
  const ids = [...favorites.ids].sort();

  const q = useQuery(async () => {
    const [products, makers] = await Promise.all([db.products.getMany(ids), db.companies.list({ type: "manufacturer" })]);
    return { products: products.filter((p) => p.published), makers: new Map(makers.map((m) => [m.id, m.name])) };
  }, [ids]);

  return (
    <>
      <PageHeader title={t("ret.savedTitle")} description={t("ret.savedSubtitle")} />
      <QueryView
        query={q}
        loading={<SkeletonGrid count={6} className="xl:grid-cols-4" />}
        isEmpty={(d) => d.products.length === 0}
        empty={
          <EmptyState
            icon={Heart}
            title={t("ret.emptySaved")}
            body={t("ret.emptySavedBody")}
            action={<Button asChild><Link href="/catalog">{t("dash.browse")}</Link></Button>}
          />
        }
      >
        {(d) => (
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
            {d.products.map((p) => (
              <ProductCard key={p.id} product={p} makerName={d.makers.get(p.manufacturerId)} />
            ))}
          </div>
        )}
      </QueryView>
    </>
  );
}
