"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, Check, ClipboardList, MessageSquare, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FurnitureImage } from "@/components/shared/furniture-image";
import { ArrowForward, ChevronForward } from "@/components/shared/icons";
import { CompanyMark } from "@/components/shared/logo";
import { FadeIn, Reveal } from "@/components/shared/motion";
import { GatedPrice, PriceTierTable } from "@/components/shared/price-tier-table";
import { FavoriteButton, ProductCard } from "@/components/shared/product-card";
import { ProductGallery } from "@/components/shared/product-gallery";
import { QuantityInput } from "@/components/shared/quantity-input";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { StockBadge } from "@/components/shared/status-badge";
import { useAuth } from "@/lib/auth";
import { db, tierFor, topLevelOf, type Product } from "@/lib/data";
import { useRfq } from "@/lib/hooks/commerce-providers";
import { useQuery } from "@/lib/hooks/use-query";
import { useStartChat } from "@/lib/hooks/use-start-chat";
import { useT } from "@/lib/i18n";

function RfqBox({ product, makerName }: { product: Product; makerName: string }) {
  const { t, formatPrice } = useT();
  const rfq = useRfq();
  const router = useRouter();
  const startChat = useStartChat();
  const existing = rfq.qtyOf(product.id);
  const [qty, setQty] = useState(existing ?? product.minOrderQty);
  const tier = tierFor(product.priceTiers, qty);
  const below = qty < product.minOrderQty;

  return (
    <div className="space-y-5">
      <PriceTierTable tiers={product.priceTiers} activeQty={qty} />
      <div className="rounded-md border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center gap-3">
          <QuantityInput value={qty} onChange={setQty} min={1} />
          <Button
            size="lg"
            className="flex-1"
            disabled={below || product.stockStatus === "out_of_stock"}
            onClick={() => {
              rfq.set(product.id, qty);
              toast.success(t("product.addedToRfq"), {
                description: makerName,
                action: { label: t("nav.rfq"), onClick: () => router.push("/retailer/rfq") },
              });
            }}
          >
            {existing ? <Check className="size-4" /> : <ClipboardList className="size-4" strokeWidth={1.6} />}
            {existing ? t("product.updateRfq") : t("product.addToRfq")}
          </Button>
        </div>
        <p className={`mt-3 text-xs ${below ? "text-destructive" : "text-muted-foreground"}`} aria-live="polite">
          {below
            ? t("product.belowMoq", { qty: product.minOrderQty })
            : tier && t("product.estimate", { total: formatPrice(tier.unitPrice * qty, tier.currency), price: formatPrice(tier.unitPrice, tier.currency) })}
        </p>
      </div>
      <Button variant="ghost" className="px-0 text-muted-foreground hover:bg-transparent hover:text-foreground" onClick={() => startChat(product.manufacturerId)}>
        <MessageSquare className="size-4" strokeWidth={1.6} />
        {t("product.messageMaker")}
      </Button>
    </div>
  );
}

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, tx, material, color, country, city } = useT();
  const { currentUser, canSeePrices } = useAuth();

  const q = useQuery(async () => {
    const product = await db.products.getById(id);
    if (!product) return null;
    const [maker, categories, collection, related] = await Promise.all([
      db.companies.getById(product.manufacturerId),
      db.categories.list(),
      product.collectionId ? db.collections.getById(product.collectionId) : Promise.resolve(null),
      db.products.list({ manufacturerId: product.manufacturerId }),
    ]);
    return { product, maker, categories, collection, related: related.filter((p) => p.id !== product.id).slice(0, 4) };
  }, [id]);

  if (q.error) return <div className="container-page py-20"><ErrorState onRetry={q.reload} /></div>;

  if (q.loading || q.data === undefined) {
    return (
      <div className="container-page grid gap-12 py-12 lg:grid-cols-[1.2fr_1fr] lg:py-16">
        <Skeleton className="aspect-[4/5]" />
        <div className="space-y-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  const data = q.data;
  const visible = data && (data.product.published || data.product.manufacturerId === currentUser?.companyId || currentUser?.role === "admin");
  if (!data || !visible) {
    return (
      <div className="container-page py-20">
        <EmptyState
          title={t("common.notFound")}
          body={t("product.notFound")}
          action={<Button asChild variant="outline"><Link href="/catalog">{t("nav.catalog")}</Link></Button>}
        />
      </div>
    );
  }

  const { product, maker, categories, collection, related } = data;
  const title = tx(product.titleAr, product.titleEn);
  const category = categories.find((c) => c.id === product.categoryId);
  const top = topLevelOf(categories, product.categoryId);
  const isOwner = currentUser?.role === "manufacturer" && currentUser.companyId === product.manufacturerId;
  const isRetailer = currentUser?.role === "retailer";

  const specs: [string, string][] = [
    [t("product.dimensions"), t("product.dimensionsValue", { w: product.dimensions.width, h: product.dimensions.height, d: product.dimensions.depth })],
    [t("product.materials"), product.materials.map(material).join(tx("، ", ", "))],
    [t("product.colors"), product.colors.map(color).join(tx("، ", ", "))],
    [t("product.moq"), t("product.moqValue", { qty: product.minOrderQty })],
    [t("product.leadTime"), product.leadTimeDays ? t("product.leadTimeValue", { days: product.leadTimeDays }) : "—"],
    [t("product.category"), category ? tx(category.nameAr, category.nameEn) : "—"],
  ];
  if (collection) specs.push([t("product.collection"), tx(collection.nameAr, collection.nameEn)]);

  return (
    <div className="container-page py-10 lg:py-14">
      <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">{t("product.breadcrumbHome")}</Link>
        <ChevronForward className="size-3" />
        <Link href="/catalog" className="hover:text-foreground">{t("nav.catalog")}</Link>
        {top && (
          <>
            <ChevronForward className="size-3" />
            <Link href={`/catalog?category=${top.id}`} className="hover:text-foreground">{tx(top.nameAr, top.nameEn)}</Link>
          </>
        )}
        <ChevronForward className="size-3" />
        <span className="text-foreground" aria-current="page">{title}</span>
      </nav>

      <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
        <FadeIn>
          <ProductGallery images={product.images} title={title} />
        </FadeIn>

        <FadeIn delay={0.1} className="lg:sticky lg:top-24 lg:self-start">
          <div className="flex items-start justify-between gap-4">
            <div>
              {maker && (
                <Link href={`/company/${maker.id}`} className="eyebrow link-underline">
                  {maker.name}
                </Link>
              )}
              <h1 className="display-md mt-3">{title}</h1>
            </div>
            <FavoriteButton productId={product.id} className="mt-1 border border-border" />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <StockBadge status={product.stockStatus} />
            {product.leadTimeDays != null && <span>{t("product.leadTime")}: {t("product.leadTimeValue", { days: product.leadTimeDays })}</span>}
            <span>· {t("product.moq")}: {product.minOrderQty}</span>
          </div>
          <p className="mt-6 leading-relaxed text-muted-foreground">{tx(product.descriptionAr, product.descriptionEn)}</p>

          <div className="mt-8">
            {isOwner ? (
              <div className="space-y-4">
                <PriceTierTable tiers={product.priceTiers} />
                <div className="flex items-center justify-between rounded-md border border-brass/40 bg-brass/8 px-4 py-3 text-sm">
                  <span>{t("product.sellerView")}</span>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/manufacturer/products/${product.id}/edit`}>
                      <Pencil className="size-3.5" /> {t("product.editPiece")}
                    </Link>
                  </Button>
                </div>
              </div>
            ) : canSeePrices && isRetailer ? (
              <RfqBox product={product} makerName={maker?.name ?? ""} />
            ) : canSeePrices ? (
              <div className="space-y-3">
                <PriceTierTable tiers={product.priceTiers} />
                <p className="text-xs text-muted-foreground">{t("product.retailerOnly")}</p>
              </div>
            ) : (
              <GatedPrice />
            )}
          </div>
        </FadeIn>
      </div>

      <div className="mt-24 grid gap-16 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
        <Reveal>
          <h2 className="display-md mb-8">{t("product.specifications")}</h2>
          <dl className="divide-y divide-hairline border-y border-hairline">
            {specs.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-6 py-4 text-sm">
                <dt className="text-muted-foreground">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </Reveal>

        {maker && (
          <Reveal delay={0.1}>
            <h2 className="eyebrow mb-6 font-sans">{t("product.manufacturerTitle")}</h2>
            <div className="rounded-md border border-border bg-surface p-7">
              <div className="flex items-center gap-4">
                <CompanyMark name={maker.name} />
                <div>
                  <div className="flex items-center gap-1.5 font-display text-2xl">
                    {maker.name}
                    {maker.verified && <BadgeCheck className="size-4 text-brass-deep" strokeWidth={1.6} aria-label={t("company.verified")} />}
                  </div>
                  <div className="text-sm text-muted-foreground">{city(maker.city)}, {country(maker.country)}</div>
                </div>
              </div>
              <p className="mt-5 line-clamp-4 text-sm leading-relaxed text-muted-foreground">{tx(maker.about, maker.aboutEn)}</p>
              <Button variant="outline" className="mt-6" asChild>
                <Link href={`/company/${maker.id}`}>
                  {t("product.viewProfile")} <ArrowForward className="size-4" />
                </Link>
              </Button>
            </div>
          </Reveal>
        )}
      </div>

      {related.length > 0 && (
        <section className="mt-28">
          <Reveal className="mb-10 flex items-end justify-between gap-6">
            <h2 className="display-md">{t("product.related")}</h2>
            {maker && (
              <Button variant="ghost" asChild>
                <Link href={`/company/${maker.id}`}>{t("common.viewAll")} <ArrowForward className="size-4" /></Link>
              </Button>
            )}
          </Reveal>
          <div className="grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} makerName={maker?.name} />
            ))}
          </div>
        </section>
      )}

      {collection?.coverUrl && (
        <Reveal className="mt-28">
          <Link href={`/catalog?collection=${collection.id}`} className="group relative block overflow-hidden rounded-md">
            <div className="relative aspect-[21/9]">
              <FurnitureImage src={collection.coverUrl} alt="" sizes="100vw" className="transition-transform duration-[1.4s] group-hover:scale-[1.03]" />
              <div className="absolute inset-0 bg-gradient-to-t from-espresso/70 to-transparent" />
            </div>
            <div className="absolute bottom-0 p-8 text-ivory sm:p-12">
              <div className="mb-2 text-[0.7rem] uppercase tracking-[0.22em] text-ivory/75 rtl:tracking-normal">{t("product.collection")}</div>
              <div className="font-display text-4xl sm:text-5xl">{tx(collection.nameAr, collection.nameEn)}</div>
            </div>
          </Link>
        </Reveal>
      )}
    </div>
  );
}
