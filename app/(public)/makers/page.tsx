"use client";

import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { FurnitureImage } from "@/components/shared/furniture-image";
import { ArrowForward } from "@/components/shared/icons";
import { CompanyMark } from "@/components/shared/logo";
import { FadeIn, Reveal } from "@/components/shared/motion";
import { EmptyState, QueryView, SkeletonGrid } from "@/components/shared/states";
import { db } from "@/lib/data";
import { useQuery } from "@/lib/hooks/use-query";
import { useT } from "@/lib/i18n";

export default function MakersPage() {
  const { t, tx, country, city } = useT();
  const q = useQuery(async () => {
    const [companies, products] = await Promise.all([db.companies.list({ type: "manufacturer", verified: true }), db.products.list()]);
    return companies.map((c) => {
      const own = products.filter((p) => p.manufacturerId === c.id);
      return { company: c, count: own.length, images: own.slice(0, 3).map((p) => p.images[0]) };
    });
  }, []);

  return (
    <div className="container-page py-12 lg:py-16">
      <FadeIn className="mb-14 max-w-3xl">
        <div className="eyebrow mb-4">{t("landing.makersEyebrow")}</div>
        <h1 className="display-lg">{t("company.makersTitle")}</h1>
        <p className="mt-4 text-muted-foreground">{t("company.makersSubtitle")}</p>
      </FadeIn>
      <QueryView query={q} loading={<SkeletonGrid count={6} />} empty={<EmptyState title={t("common.noResults")} />}>
        {(makers) => (
          <div className="grid gap-x-6 gap-y-14 md:grid-cols-2">
            {makers.map(({ company, count, images }, i) => (
              <Reveal key={company.id} delay={(i % 2) * 0.08}>
                <Link href={`/company/${company.id}`} className="group block">
                  <div className="grid grid-cols-3 gap-2 overflow-hidden rounded-md">
                    {images.map((src, j) => (
                      <div key={j} className="relative aspect-[4/5] bg-secondary">
                        <FurnitureImage src={src} alt="" sizes="(min-width: 768px) 16vw, 33vw" className="transition-transform duration-[1.2s] group-hover:scale-[1.04]" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex items-start gap-4">
                    <CompanyMark name={company.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 font-display text-2xl">
                        {company.name}
                        <BadgeCheck className="size-4 text-brass-deep" strokeWidth={1.6} aria-label={t("company.verified")} />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {city(company.city)}, {country(company.country)} · {t("company.piecesCount", { count })}
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{tx(company.about, company.aboutEn)}</p>
                    </div>
                    <ArrowForward className="mt-2 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
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
