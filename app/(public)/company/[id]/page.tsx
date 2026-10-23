"use client";

import { use } from "react";
import Link from "next/link";
import { BadgeCheck, MapPin, MessageSquare, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FurnitureImage } from "@/components/shared/furniture-image";
import { CompanyMark } from "@/components/shared/logo";
import { FadeIn, Reveal } from "@/components/shared/motion";
import { ProductCard } from "@/components/shared/product-card";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/shared/states";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/data";
import { useQuery } from "@/lib/hooks/use-query";
import { useStartChat } from "@/lib/hooks/use-start-chat";
import { useT } from "@/lib/i18n";

export default function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, tx, country, city } = useT();
  const { currentUser, isApproved } = useAuth();
  const startChat = useStartChat();

  const q = useQuery(async () => {
    const company = await db.companies.getById(id);
    if (!company) return null;
    const [products, collections] = await Promise.all([
      company.type === "manufacturer" ? db.products.list({ manufacturerId: id }) : Promise.resolve([]),
      company.type === "manufacturer" ? db.collections.listByManufacturer(id) : Promise.resolve([]),
    ]);
    return { company, products, collections };
  }, [id]);

  if (q.error) return <div className="container-page py-20"><ErrorState onRetry={q.reload} /></div>;
  if (q.loading || q.data === undefined) {
    return (
      <div className="container-page py-16">
        <Skeleton className="mb-6 h-5 w-40" />
        <Skeleton className="mb-12 h-14 w-2/3" />
        <SkeletonGrid count={6} />
      </div>
    );
  }
  // pending (unverified) companies are not public unless you're looking at your own
  const own = currentUser?.companyId === id;
  if (!q.data || (!q.data.company.verified && !own && currentUser?.role !== "admin")) {
    return (
      <div className="container-page py-20">
        <EmptyState title={t("common.notFound")} body={t("company.notFound")} action={<Button asChild variant="outline"><Link href="/makers">{t("nav.manufacturers")}</Link></Button>} />
      </div>
    );
  }

  const { company, products, collections } = q.data;
  const cover = collections[0]?.coverUrl ?? products[0]?.images[1];
  const canMessage = currentUser?.role === "retailer" && isApproved && company.type === "manufacturer";

  return (
    <>
      <section className="relative">
        <div className="relative h-[42vh] min-h-72 overflow-hidden bg-secondary">
          <FurnitureImage src={cover} alt="" priority sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        </div>
        <div className="container-page relative -mt-28">
          <FadeIn className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:items-end">
            <div>
              <CompanyMark name={company.name} className="mb-6 size-20 border-2 bg-background text-3xl shadow-soft" />
              {company.verified && (
                <div className="eyebrow mb-3 flex items-center gap-1.5">
                  <BadgeCheck className="size-3.5" strokeWidth={1.8} />
                  {company.type === "manufacturer" ? t("company.verified") : t("company.verifiedRetailer")}
                </div>
              )}
              <h1 className="display-lg">{company.name}</h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">{tx(company.about, company.aboutEn)}</p>
            </div>
            <dl className="space-y-4 rounded-[1.25rem] border border-border bg-card p-6 text-sm">
              <div className="flex items-center gap-3">
                <MapPin className="size-4 text-brand-strong" strokeWidth={1.6} />
                <dt className="sr-only">{t("company.location")}</dt>
                <dd>{city(company.city)}, {country(company.country)}</dd>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="size-4 text-brand-strong" strokeWidth={1.6} />
                <dt className="sr-only">{t("company.contact")}</dt>
                <dd dir="ltr" className={isApproved ? "" : "text-muted-foreground"}>{isApproved ? company.phone : t("company.contactGated")}</dd>
              </div>
              {company.type === "manufacturer" && (
                <div className="border-t border-hairline pt-4 text-muted-foreground">{t("company.piecesCount", { count: products.length })}</div>
              )}
              {canMessage && (
                <Button className="w-full" variant="outline" onClick={() => startChat(company.id)}>
                  <MessageSquare className="size-4" strokeWidth={1.6} />
                  {t("product.messageMaker")}
                </Button>
              )}
            </dl>
          </FadeIn>
        </div>
      </section>

      {collections.length > 0 && (
        <section className="container-page mt-24">
          <Reveal>
            <h2 className="display-md mb-10">{t("company.collections")}</h2>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((c, i) => (
              <Reveal key={c.id} delay={i * 0.06}>
                <Link href={`/catalog?collection=${c.id}`} className="group block">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-[1.5rem] bg-secondary">
                    <FurnitureImage src={c.coverUrl} alt="" className="transition-transform duration-[1.2s] group-hover:scale-[1.04]" />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="font-display text-2xl">{tx(c.nameAr, c.nameEn)}</span>
                    <span className="text-xs text-muted-foreground">{t("common.pieces", { count: products.filter((p) => p.collectionId === c.id).length })}</span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {company.type === "manufacturer" && (
        <section className="container-page mt-24">
          <Reveal>
            <h2 className="display-md mb-10">{t("company.catalog")}</h2>
          </Reveal>
          {products.length === 0 ? (
            <EmptyState title={t("catalog.noResultsTitle")} />
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}
