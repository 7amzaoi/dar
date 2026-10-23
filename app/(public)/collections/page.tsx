"use client";

import Link from "next/link";
import { FurnitureImage } from "@/components/shared/furniture-image";
import { FadeIn, Reveal } from "@/components/shared/motion";
import { EmptyState, QueryView, SkeletonGrid } from "@/components/shared/states";
import { db } from "@/lib/data";
import { useQuery } from "@/lib/hooks/use-query";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function CollectionsPage() {
  const { t, tx } = useT();
  const q = useQuery(async () => {
    const [collections, companies, products] = await Promise.all([db.collections.list(), db.companies.list({ type: "manufacturer", verified: true }), db.products.list()]);
    const names = new Map(companies.map((c) => [c.id, c.name]));
    return collections
      .filter((c) => names.has(c.manufacturerId))
      .map((c) => ({ collection: c, maker: names.get(c.manufacturerId) ?? "", count: products.filter((p) => p.collectionId === c.id).length }));
  }, []);

  return (
    <div className="container-page py-12 lg:py-16">
      <FadeIn className="mb-14 max-w-3xl">
        <div className="eyebrow mb-4">{t("landing.featuredEyebrow")}</div>
        <h1 className="display-lg">{t("landing.featuredTitle")}</h1>
        <p className="mt-4 text-muted-foreground">{t("landing.featuredBody")}</p>
      </FadeIn>
      <QueryView query={q} loading={<SkeletonGrid count={4} className="md:grid-cols-2" />} empty={<EmptyState title={t("common.noResults")} />}>
        {(items) => (
          <div className="grid gap-6 md:grid-cols-2">
            {items.map(({ collection, maker, count }, i) => (
              <Reveal key={collection.id} delay={(i % 2) * 0.08} className={cn(i % 3 === 0 && "md:col-span-2")}>
                <Link href={`/catalog?collection=${collection.id}`} className="group relative block overflow-hidden rounded-[1.5rem]">
                  <div className={cn("relative", i % 3 === 0 ? "aspect-[4/3] md:aspect-[21/9]" : "aspect-[4/3]")}>
                    <FurnitureImage src={collection.coverUrl} alt={tx(collection.nameAr, collection.nameEn)} sizes="(min-width: 768px) 60vw, 100vw" className="transition-transform duration-[1.4s] ease-out group-hover:scale-[1.04]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-transparent to-transparent" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-7 text-paper sm:p-9">
                    <div>
                      <div className="mb-2 text-xs text-paper/80">{maker}</div>
                      <div className="font-display text-4xl sm:text-5xl">{tx(collection.nameAr, collection.nameEn)}</div>
                    </div>
                    <span className="text-sm text-paper/80">{t("common.pieces", { count })}</span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </QueryView>
    </div>
  );
}
