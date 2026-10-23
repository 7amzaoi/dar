"use client";

import Link from "next/link";
import { BadgeCheck, Layers, MessagesSquare, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Hero } from "@/components/landing/hero";
import { FurnitureImage } from "@/components/shared/furniture-image";
import { ArrowForward } from "@/components/shared/icons";
import { CompanyMark } from "@/components/shared/logo";
import { motion, Reveal, staggerChild, staggerParent } from "@/components/shared/motion";
import { PillLink } from "@/components/shared/pill-link";
import { ProductCard } from "@/components/shared/product-card";
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

/** Section title: headline only, body stacked under it (no eyebrow, no split header). */
function SectionTitle({ title, body, action, className }: { title: string; body?: string; action?: React.ReactNode; className?: string }) {
  return (
    <Reveal className={cn("mb-12 flex flex-col gap-6 md:mb-16 md:flex-row md:items-end md:justify-between", className)}>
      <div className="max-w-2xl">
        <h2 className="display-md">{title}</h2>
        {body && <p className="mt-4 max-w-[60ch] text-muted-foreground">{body}</p>}
      </div>
      {action}
    </Reveal>
  );
}

function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2 text-sm text-foreground/80 transition-colors hover:text-foreground">
      {children}
      <ArrowForward className="size-4 transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
    </Link>
  );
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
      <Hero pieceCount={d?.products.length} />

      {/* Stats: one machined tray of four figures */}
      <section className="container-page mt-6">
        <div className="bezel">
          <dl className="bezel-core grid grid-cols-2 lg:grid-cols-4">
            {stats.map((s, i) => (
              <div key={s.label} className={cn("px-6 py-7 lg:px-9 lg:py-8", i % 2 === 1 && "border-s border-hairline", i >= 2 && "border-t border-hairline lg:border-t-0", i === 2 && "lg:border-s")}>
                <dt className="text-sm text-muted-foreground">{s.label}</dt>
                <dd className="mt-3 font-display text-4xl tracking-tight tabular-nums lg:text-5xl">{s.value ?? <Skeleton className="h-10 w-20" />}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {q.error && (
        <div className="container-page mt-16">
          <ErrorState onRetry={q.reload} />
        </div>
      )}

      {/* Featured collections: asymmetric 1 + 2 */}
      <section className="container-page mt-28 md:mt-36">
        <SectionTitle title={t("landing.featuredTitle")} body={t("landing.featuredBody")} action={<TextLink href="/collections">{t("common.viewAll")}</TextLink>} />
        {!d ? (
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Skeleton className="aspect-[4/3] rounded-[2rem]" />
            <div className="grid gap-4">
              <Skeleton className="aspect-[16/9] rounded-[2rem]" />
              <Skeleton className="aspect-[16/9] rounded-[2rem]" />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            {featured.map((c, i) => {
              const maker = companyById.get(c.manufacturerId);
              const count = d.products.filter((p) => p.collectionId === c.id).length;
              return (
                <Reveal key={c.id} delay={i * 0.08} className={i === 0 ? "lg:row-span-2" : ""}>
                  <Link href={`/catalog?collection=${c.id}`} className="group relative block h-full overflow-hidden rounded-[2rem]">
                    <div className={cn("relative", i === 0 ? "aspect-[4/3] lg:aspect-auto lg:h-full lg:min-h-[560px]" : "aspect-[16/9]")}>
                      <FurnitureImage src={c.coverUrl} alt={tx(c.nameAr, c.nameEn)} className="transition-transform duration-[1.4s] ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.04]" sizes="(min-width: 1024px) 55vw, 100vw" />
                    </div>
                    <div className="glass absolute inset-x-4 bottom-4 flex items-center justify-between gap-4 rounded-[1.4rem] px-5 py-4 sm:inset-x-5 sm:bottom-5">
                      <div className="min-w-0">
                        <div className="truncate text-xs text-hero-ink/60 dark:text-muted-foreground">{maker?.name}</div>
                        <div className={cn("truncate font-display tracking-tight text-hero-ink dark:text-foreground", i === 0 ? "text-3xl" : "text-2xl")}>{tx(c.nameAr, c.nameEn)}</div>
                      </div>
                      <span className="shrink-0 rounded-full bg-hero-ink/[0.07] px-3 py-1 text-xs text-hero-ink/80 tabular-nums dark:bg-white/10 dark:text-foreground">{t("common.pieces", { count })}</span>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        )}
      </section>

      {/* Categories: tall tiles, scroll-snap on mobile, five across on desktop */}
      <section className="mt-28 md:mt-36">
        <div className="container-page">
          <SectionTitle title={t("landing.categoriesTitle")} />
        </div>
        <motion.div
          className="container-page flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] lg:grid lg:grid-cols-5 lg:overflow-visible"
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          {(d ? topLevelCategories(d.categories) : Array.from({ length: 5 }, () => null)).map((c, i) =>
            c ? (
              <motion.div key={c.id} variants={staggerChild} className="w-[68vw] shrink-0 snap-start sm:w-[42vw] lg:w-auto">
                <Link href={`/catalog?category=${c.id}`} className="group relative block overflow-hidden rounded-[1.75rem]">
                  <div className="relative aspect-[3/4] bg-secondary">
                    <FurnitureImage src={categoryCovers[c.id]} alt="" className="transition-transform duration-[1.2s] ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.05]" sizes="(min-width: 1024px) 20vw, 70vw" />
                  </div>
                  <span className="glass absolute inset-x-3 bottom-3 flex items-center justify-between rounded-full py-2 ps-4 pe-2 text-sm text-hero-ink dark:text-foreground">
                    {tx(c.nameAr, c.nameEn)}
                    <span className="flex size-7 items-center justify-center rounded-full bg-hero-ink/[0.08] transition-transform duration-300 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 dark:bg-white/10">
                      <ArrowForward className="size-3.5" />
                    </span>
                  </span>
                </Link>
              </motion.div>
            ) : (
              <Skeleton key={i} className="aspect-[3/4] w-[68vw] shrink-0 rounded-[1.75rem] sm:w-[42vw] lg:w-auto" />
            ),
          )}
        </motion.div>
      </section>

      {/* Why Dār: asymmetric bento, one image cell + two text cells */}
      <section className="container-page mt-28 md:mt-36">
        <SectionTitle title={t("landing.valueTitle")} />
        <div className="grid gap-4 md:grid-cols-6 md:grid-rows-2">
          <Reveal className="relative min-h-[420px] overflow-hidden rounded-[2rem] md:col-span-4 md:row-span-2">
            <FurnitureImage src="/images/scenes/collection-atrium.svg" alt="" sizes="(min-width: 768px) 66vw, 100vw" />
            <div className="glass absolute inset-x-4 bottom-4 max-w-md rounded-[1.5rem] p-6 sm:inset-x-6 sm:bottom-6">
              <BadgeCheck className="mb-4 size-5 text-hero-ink dark:text-brand" strokeWidth={1.5} />
              <h3 className="font-display text-2xl tracking-tight text-hero-ink dark:text-foreground">{t("landing.value1Title")}</h3>
              <p className="mt-2 text-sm leading-relaxed text-hero-text dark:text-muted-foreground">{t("landing.value1Body")}</p>
            </div>
          </Reveal>
          {[
            { icon: Layers, title: t("landing.value2Title"), body: t("landing.value2Body"), tint: "bg-card" },
            { icon: MessagesSquare, title: t("landing.value3Title"), body: t("landing.value3Body"), tint: "bg-brand/[0.07]" },
          ].map((v, i) => (
            <Reveal key={v.title} delay={0.08 * (i + 1)} className="bezel md:col-span-2">
              <div className={cn("bezel-core flex h-full flex-col justify-between gap-10 p-7", v.tint)}>
                <span className="flex size-11 items-center justify-center rounded-full bg-foreground/[0.05]">
                  <v.icon className="size-5 text-brand" strokeWidth={1.5} />
                </span>
                <div>
                  <h3 className="font-display text-2xl tracking-tight">{v.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* New in: product grid */}
      <section className="container-page mt-28 md:mt-36">
        <SectionTitle title={t("landing.newTitle")} action={<PillLink href="/catalog" variant="outline">{t("landing.ctaPrimary")}</PillLink>} />
        {!d ? (
          <SkeletonGrid count={4} className="md:grid-cols-4" />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-4 md:gap-x-5">
            {d.products.slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} makerName={companyById.get(p.manufacturerId)?.name} />
            ))}
          </div>
        )}
      </section>

      {/* How it works: two nested panels, one per side of the trade */}
      <section id="how" className="container-page mt-28 md:mt-36">
        <SectionTitle title={t("landing.howTitle")} />
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { title: t("landing.howMakers"), steps: [t("landing.howM1"), t("landing.howM2"), t("landing.howM3")] },
            { title: t("landing.howShowrooms"), steps: [t("landing.howR1"), t("landing.howR2"), t("landing.howR3")] },
          ].map((side, si) => (
            <Reveal key={side.title} delay={si * 0.1} className="bezel">
              <div className="bezel-core h-full p-8 sm:p-10">
                <h3 className="font-display text-3xl tracking-tight">{side.title}</h3>
                <ol className="mt-8 space-y-5">
                  {side.steps.map((s, i) => (
                    <li key={s} className="flex items-start gap-4">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm text-brand tabular-nums">{i + 1}</span>
                      <span className="pt-1 text-pretty">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Makers: horizontal scroll-snap rail */}
      <section className="mt-28 md:mt-36">
        <div className="container-page">
          <SectionTitle title={t("landing.makersTitle")} action={<TextLink href="/makers">{t("common.viewAll")}</TextLink>} />
        </div>
        <div className="container-page flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:none]">
          {(d?.companies ?? []).map((c) => {
            const pieces = d?.products.filter((p) => p.manufacturerId === c.id) ?? [];
            return (
              <Link key={c.id} href={`/company/${c.id}`} className="group bezel w-[300px] shrink-0 snap-start sm:w-[340px]">
                <div className="bezel-core overflow-hidden">
                  <div className="grid grid-cols-3 gap-1 p-1">
                    {pieces.slice(0, 3).map((p) => (
                      <div key={p.id} className="relative aspect-[4/5] overflow-hidden rounded-[1.1rem] bg-secondary">
                        <FurnitureImage src={p.images[0]} alt="" sizes="110px" className="transition-transform duration-700 group-hover:scale-[1.05]" />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 px-5 pt-3 pb-5">
                    <CompanyMark name={c.name} className="size-10 text-sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-display text-xl tracking-tight" translate="no">{c.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {city(c.city)}, {country(c.country)}
                      </div>
                    </div>
                    <ArrowForward className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                  </div>
                </div>
              </Link>
            );
          })}
          {!d && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[230px] w-[300px] shrink-0 rounded-[2rem]" />)}
        </div>
      </section>

      {/* Closing CTA: glass card floating on a scene, same material as the hero */}
      <section className="container-page mt-28 md:mt-36">
        <Reveal className="relative overflow-hidden rounded-[2.5rem]">
          <div className="relative min-h-[520px]">
            <FurnitureImage src="/images/scenes/collection-andalus.svg" alt="" sizes="100vw" />
          </div>
          <div className="absolute inset-0 flex items-end p-4 sm:items-center sm:p-10 lg:p-16">
            <div className="glass w-full max-w-xl rounded-[2rem] p-8 sm:p-10">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/60 px-3.5 py-1.5 text-xs text-hero-ink/90 dark:bg-white/10 dark:text-foreground">
                <Sparkles className="size-3.5" />
                {t("landing.ctaEyebrow")}
              </div>
              <h2 className="display-lg text-hero-ink dark:text-foreground">{t("landing.ctaTitle")}</h2>
              <p className="mt-4 max-w-md leading-relaxed text-hero-text dark:text-muted-foreground">{t("landing.ctaBody")}</p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <PillLink href="/register" size="lg">{t("common.register")}</PillLink>
                <Link href="/login" className="text-sm text-hero-ink/80 underline-offset-4 hover:underline dark:text-foreground/80">
                  {t("common.signIn")}
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
