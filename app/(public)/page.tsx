"use client";

import Link from "next/link";
import { BadgeCheck, Layers, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FurnitureImage } from "@/components/shared/furniture-image";
import { ArrowForward } from "@/components/shared/icons";
import { FadeIn, motion, Reveal, staggerChild, staggerParent } from "@/components/shared/motion";
import { ProductCard } from "@/components/shared/product-card";
import { SectionHeading } from "@/components/shared/section-heading";
import { ErrorState, SkeletonGrid } from "@/components/shared/states";
import { categoryCovers, db, topLevelCategories } from "@/lib/data";
import { useQuery } from "@/lib/hooks/use-query";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function useLandingData() {
  return useQuery(async () => {
    const [products, collections, companies, categories] = await Promise.all([
      db.products.list({ sort: "newest" }),
      db.collections.list(),
      db.companies.list({ type: "manufacturer", verified: true }),
      db.categories.list(),
    ]);
    return { products, collections, companies, categories };
  }, []);
}

export default function LandingPage() {
  const { t, tx, country, city, formatNumber } = useT();
  const q = useLandingData();
  const d = q.data;
  const companyById = new Map(d?.companies.map((c) => [c.id, c]));
  const avgLead = d ? Math.round(d.products.reduce((s, p) => s + (p.leadTimeDays ?? 0), 0) / Math.max(1, d.products.length)) : 0;

  const stats = [
    { label: t("landing.statMakers"), value: d ? formatNumber(d.companies.length) : null },
    { label: t("landing.statPieces"), value: d ? formatNumber(d.products.length) : null },
    { label: t("landing.statCountries"), value: d ? formatNumber(new Set(d.companies.map((c) => c.country)).size) : null },
    { label: t("landing.statLead"), value: d ? t("landing.statLeadValue", { days: avgLead }) : null },
  ];

  const featured = d?.collections.slice(0, 3) ?? [];

  return (
    <>
      {/* ------------------------------------------------ Hero */}
      <section className="container-page grid items-center gap-12 pb-20 pt-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-28 lg:pt-20">
        <FadeIn className="max-w-2xl">
          <div className="eyebrow mb-6">{t("landing.eyebrow")}</div>
          <h1 className="display-xl">{t("landing.title")}</h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground">{t("landing.subtitle")}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/catalog">
                {t("landing.ctaPrimary")}
                <ArrowForward className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/register">{t("landing.ctaSecondary")}</Link>
            </Button>
          </div>
        </FadeIn>

        <FadeIn delay={0.15} className="relative">
          <div className="grain relative aspect-[4/5] overflow-hidden rounded-md shadow-lift sm:aspect-[5/4] lg:aspect-[4/5]">
            <FurnitureImage src="/images/scenes/hero-living.svg" alt="" priority sizes="(min-width: 1024px) 45vw, 100vw" className="object-[60%_center]" />
          </div>
          <div className="absolute -bottom-8 start-6 hidden w-44 overflow-hidden rounded-md border-4 border-background shadow-lift sm:block lg:-start-10 lg:w-52">
            <div className="relative aspect-[4/5]">
              <FurnitureImage src="/images/products/armchair-terracotta-a.svg" alt="" sizes="220px" />
            </div>
          </div>
          <div className="absolute end-5 top-5 rounded-md bg-background/90 px-4 py-3 text-xs shadow-soft backdrop-blur">
            <div className="eyebrow mb-1">Casa Brianza</div>
            <div className="font-display text-base">{tx("كنبة نوكتورن", "Nocturne Lounge Sofa")}</div>
          </div>
        </FadeIn>
      </section>

      {/* ------------------------------------------------ Stats */}
      <section className="border-y border-hairline bg-surface">
        <dl className="container-page grid grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={cn(
                "border-hairline px-6 py-8 lg:px-10",
                i % 2 === 1 && "border-s",
                i % 2 === 0 && "ps-0",
                i === 2 && "lg:border-s lg:ps-10",
                i >= 2 && "border-t lg:border-t-0",
              )}
            >
              <dt className="text-xs text-muted-foreground">{s.label}</dt>
              <dd className="mt-2 font-display text-4xl">{s.value ?? <Skeleton className="h-9 w-16" />}</dd>
            </div>
          ))}
        </dl>
      </section>

      {q.error && (
        <div className="container-page mt-16">
          <ErrorState onRetry={q.reload} />
        </div>
      )}

      {/* ------------------------------------------------ Featured collections */}
      <section className="container-page mt-28">
        <Reveal>
          <SectionHeading
            eyebrow={t("landing.featuredEyebrow")}
            title={t("landing.featuredTitle")}
            body={t("landing.featuredBody")}
            action={
              <Button variant="ghost" asChild>
                <Link href="/collections">
                  {t("common.viewAll")} <ArrowForward className="size-4" />
                </Link>
              </Button>
            }
          />
        </Reveal>
        {!d ? (
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <Skeleton className="aspect-[4/3]" />
            <div className="grid gap-5">
              <Skeleton className="aspect-[16/9]" />
              <Skeleton className="aspect-[16/9]" />
            </div>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            {featured.map((c, i) => {
              const maker = companyById.get(c.manufacturerId);
              const count = d.products.filter((p) => p.collectionId === c.id).length;
              return (
                <Reveal key={c.id} delay={i * 0.08} className={i === 0 ? "lg:row-span-2" : ""}>
                  <Link href={`/catalog?collection=${c.id}`} className="group relative block h-full overflow-hidden rounded-md">
                    <div className={`relative ${i === 0 ? "aspect-[4/3] lg:aspect-auto lg:h-full lg:min-h-[560px]" : "aspect-[16/9]"}`}>
                      <FurnitureImage src={c.coverUrl} alt={tx(c.nameAr, c.nameEn)} className="transition-transform duration-[1.4s] ease-out group-hover:scale-[1.04]" sizes="(min-width: 1024px) 55vw, 100vw" />
                      <div className="absolute inset-0 bg-gradient-to-t from-espresso/75 via-espresso/10 to-transparent" />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 text-ivory sm:p-8">
                      <div>
                        <div className="mb-2 text-[0.7rem] uppercase tracking-[0.22em] text-ivory/75 rtl:tracking-normal">{maker?.name}</div>
                        <div className={`font-display ${i === 0 ? "text-5xl" : "text-3xl"}`}>{tx(c.nameAr, c.nameEn)}</div>
                      </div>
                      <span className="shrink-0 text-sm text-ivory/80">{t("common.pieces", { count })}</span>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        )}
      </section>

      {/* ------------------------------------------------ Categories */}
      <section className="container-page mt-32">
        <Reveal>
          <SectionHeading eyebrow={t("landing.categoriesEyebrow")} title={t("landing.categoriesTitle")} />
        </Reveal>
        <motion.div
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          {(d ? topLevelCategories(d.categories) : Array.from({ length: 5 }, () => null)).map((c, i) =>
            c ? (
              <motion.div key={c.id} variants={staggerChild}>
                <Link href={`/catalog?category=${c.id}`} className="group block">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-secondary">
                    <FurnitureImage src={categoryCovers[c.id]} alt="" className="transition-transform duration-[1.2s] ease-out group-hover:scale-[1.05]" sizes="(min-width: 1024px) 20vw, 50vw" />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-display text-xl">{tx(c.nameAr, c.nameEn)}</span>
                    <ArrowForward className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                  </div>
                </Link>
              </motion.div>
            ) : (
              <Skeleton key={i} className="aspect-[3/4]" />
            ),
          )}
        </motion.div>
      </section>

      {/* ------------------------------------------------ Value props */}
      <section className="container-page mt-32">
        <Reveal>
          <SectionHeading eyebrow={t("landing.valueEyebrow")} title={t("landing.valueTitle")} />
        </Reveal>
        <div className="grid gap-10 md:grid-cols-3 md:gap-8">
          {[
            { icon: BadgeCheck, title: t("landing.value1Title"), body: t("landing.value1Body") },
            { icon: Layers, title: t("landing.value2Title"), body: t("landing.value2Body") },
            { icon: MessagesSquare, title: t("landing.value3Title"), body: t("landing.value3Body") },
          ].map((v, i) => (
            <Reveal key={v.title} delay={i * 0.08} className="border-t border-foreground/15 pt-6">
              <div className="mb-8 flex items-center justify-between">
                <span className="font-display text-sm text-muted-foreground">0{i + 1}</span>
                <v.icon className="size-5 text-brass-deep" strokeWidth={1.4} />
              </div>
              <h3 className="font-display text-2xl">{v.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ New in */}
      <section className="container-page mt-32">
        <Reveal>
          <SectionHeading
            eyebrow={t("landing.newEyebrow")}
            title={t("landing.newTitle")}
            action={
              <Button variant="outline" asChild>
                <Link href="/catalog">
                  {t("landing.ctaPrimary")} <ArrowForward className="size-4" />
                </Link>
              </Button>
            }
          />
        </Reveal>
        {!d ? (
          <SkeletonGrid count={4} className="md:grid-cols-4" />
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-4">
            {d.products.slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} makerName={companyById.get(p.manufacturerId)?.name} />
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------ How it works */}
      <section id="how" className="mt-32 scroll-mt-24 bg-surface py-24">
        <div className="container-page">
          <Reveal>
            <SectionHeading eyebrow={t("landing.howEyebrow")} title={t("landing.howTitle")} />
          </Reveal>
          <div className="grid gap-12 md:grid-cols-2">
            {[
              { title: t("landing.howMakers"), steps: [t("landing.howM1"), t("landing.howM2"), t("landing.howM3")] },
              { title: t("landing.howShowrooms"), steps: [t("landing.howR1"), t("landing.howR2"), t("landing.howR3")] },
            ].map((side, si) => (
              <Reveal key={side.title} delay={si * 0.1} className="rounded-md border border-border bg-background p-8 sm:p-10">
                <h3 className="font-display text-3xl">{side.title}</h3>
                <ol className="mt-8 space-y-6">
                  {side.steps.map((s, i) => (
                    <li key={s} className="flex gap-5">
                      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-brass/50 font-display text-brass-deep">{i + 1}</span>
                      <span className="pt-1.5">{s}</span>
                    </li>
                  ))}
                </ol>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ Makers */}
      <section className="container-page mt-32">
        <Reveal>
          <SectionHeading
            eyebrow={t("landing.makersEyebrow")}
            title={t("landing.makersTitle")}
            action={
              <Button variant="ghost" asChild>
                <Link href="/makers">
                  {t("common.viewAll")} <ArrowForward className="size-4" />
                </Link>
              </Button>
            }
          />
        </Reveal>
        <ul className="divide-y divide-hairline border-y border-hairline">
          {(d?.companies ?? []).map((c) => (
            <li key={c.id}>
              <Link href={`/company/${c.id}`} className="group flex items-baseline justify-between gap-6 py-6 transition-colors hover:text-brass-deep">
                <span className="font-display text-3xl sm:text-4xl">{c.name}</span>
                <span className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="hidden sm:inline">{city(c.city)}, {country(c.country)}</span>
                  <ArrowForward className="size-4 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                </span>
              </Link>
            </li>
          ))}
          {!d && Array.from({ length: 4 }, (_, i) => <li key={i} className="py-6"><Skeleton className="h-9 w-64" /></li>)}
        </ul>
      </section>

      {/* ------------------------------------------------ CTA */}
      <section className="container-page mt-32">
        <Reveal className="grain relative overflow-hidden rounded-md bg-espresso text-ivory">
          <div className="grid lg:grid-cols-2">
            <div className="relative z-10 p-10 sm:p-14 lg:p-20">
              <div className="mb-5 text-[0.7rem] uppercase tracking-[0.22em] text-brass rtl:tracking-normal">{t("landing.ctaEyebrow")}</div>
              <h2 className="display-lg">{t("landing.ctaTitle")}</h2>
              <p className="mt-6 max-w-md leading-relaxed text-ivory/70">{t("landing.ctaBody")}</p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Button size="lg" variant="brass" asChild>
                  <Link href="/register">{t("landing.ctaSecondary")}</Link>
                </Button>
                <Button size="lg" variant="ghost" className="text-ivory hover:bg-ivory/10 hover:text-ivory" asChild>
                  <Link href="/login">{t("common.signIn")}</Link>
                </Button>
              </div>
            </div>
            <div className="relative min-h-72 lg:min-h-0">
              <FurnitureImage src="/images/scenes/cta-workshop.svg" alt="" sizes="(min-width: 1024px) 50vw, 100vw" />
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
