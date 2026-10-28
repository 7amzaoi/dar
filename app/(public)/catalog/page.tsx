"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Filters } from "@/components/shared/filters";
import { ArrowBack, ArrowForward } from "@/components/shared/icons";
import { FadeIn } from "@/components/shared/motion";
import { ProductCard } from "@/components/shared/product-card";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/shared/states";
import { useAuth } from "@/lib/auth";
import { db, type ProductPageQuery, type ProductSort, type StockStatus } from "@/lib/data";
import { useQuery } from "@/lib/hooks/use-query";
import { useT } from "@/lib/i18n";

const SORTS: ProductSort[] = ["newest", "price_asc", "price_desc", "title"];
const PAGE_SIZE = 24;

function parseFilter(sp: URLSearchParams): ProductPageQuery {
  const list = (k: string) => sp.get(k)?.split(",").filter(Boolean);
  const num = (k: string) => (sp.get(k) ? Number(sp.get(k)) : undefined);
  const sort = sp.get("sort") as ProductSort | null;
  return {
    search: sp.get("q") ?? undefined,
    categoryId: sp.get("category") ?? undefined,
    collectionId: sp.get("collection") ?? undefined,
    manufacturerId: sp.get("maker") ?? undefined,
    materials: list("mat"),
    colors: list("col"),
    stockStatus: list("stock") as StockStatus[] | undefined,
    countries: list("country"),
    priceMin: num("min"),
    priceMax: num("max"),
    sort: sort && SORTS.includes(sort) ? sort : "newest",
    page: Math.max(1, Math.floor(Number(sp.get("page")) || 1)),
  };
}

function toParams(f: ProductPageQuery) {
  const sp = new URLSearchParams();
  const set = (k: string, v?: string | number | string[]) => {
    if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) return;
    sp.set(k, Array.isArray(v) ? v.join(",") : String(v));
  };
  set("q", f.search);
  set("category", f.categoryId);
  set("collection", f.collectionId);
  set("maker", f.manufacturerId);
  set("mat", f.materials);
  set("col", f.colors);
  set("stock", f.stockStatus);
  set("country", f.countries);
  set("min", f.priceMin);
  set("max", f.priceMax);
  if (f.sort && f.sort !== "newest") set("sort", f.sort);
  if (f.page && f.page > 1) set("page", f.page);
  return sp.toString();
}

function CatalogView() {
  const { t, tx } = useT();
  const { canSeePrices } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filter = useMemo(() => parseFilter(new URLSearchParams(searchParams.toString())), [searchParams]);
  const [search, setSearch] = useState(filter.search ?? "");

  // any filter change starts again at page 1; only the pager moves between pages
  const update = (patch: Partial<ProductPageQuery>) => {
    const qs = toParams({ ...filter, page: 1, ...patch });
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const goToPage = (page: number) => {
    const qs = toParams({ ...filter, page });
    router.push(qs ? `${pathname}?${qs}` : pathname);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // debounce free-text search into the URL
  useEffect(() => {
    if ((filter.search ?? "") === search) return;
    const id = setTimeout(() => {
      const qs = toParams({ ...filter, search: search || undefined, page: 1 });
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 300);
    return () => clearTimeout(id);
  }, [search, filter, pathname, router]);

  const meta = useQuery(async () => {
    const [facets, categories, companies, collections] = await Promise.all([
      db.products.facets(),
      db.categories.list(),
      db.companies.list({ type: "manufacturer" }),
      db.collections.list(),
    ]);
    return { facets, categories, companies, collections };
  }, []);

  const result = useQuery(() => db.products.page({ ...filter, pageSize: PAGE_SIZE }), [filter]);
  const products = { ...result, data: result.data?.items };
  const page = filter.page ?? 1;
  const pages = result.data ? Math.max(1, Math.ceil(result.data.total / result.data.pageSize)) : 1;

  const companyById = new Map(meta.data?.companies.map((c) => [c.id, c]));
  const activeCategory = meta.data?.categories.find((c) => c.id === filter.categoryId);
  const activeCollection = meta.data?.collections.find((c) => c.id === filter.collectionId);
  const activeMaker = filter.manufacturerId ? companyById.get(filter.manufacturerId) : undefined;
  const heading = activeCollection
    ? tx(activeCollection.nameAr, activeCollection.nameEn)
    : activeCategory
      ? tx(activeCategory.nameAr, activeCategory.nameEn)
      : activeMaker?.name ?? t("catalog.title");

  const activeCount =
    (filter.materials?.length ?? 0) +
    (filter.colors?.length ?? 0) +
    (filter.stockStatus?.length ?? 0) +
    (filter.countries?.length ?? 0) +
    (filter.categoryId ? 1 : 0) +
    (filter.collectionId ? 1 : 0) +
    (filter.manufacturerId ? 1 : 0) +
    (filter.priceMin != null || filter.priceMax != null ? 1 : 0);

  const clearAll = () => {
    setSearch("");
    router.replace(pathname, { scroll: false });
  };

  const filtersPanel = meta.data ? (
    <Filters
      key={`${filter.priceMin}-${filter.priceMax}`}
      value={filter}
      onChange={update}
      facets={meta.data.facets}
      categories={meta.data.categories}
      showPrice={canSeePrices}
    />
  ) : null;

  return (
    <div className="container-page pb-10 pt-8 sm:pt-12 lg:pt-16">
      <FadeIn className="mb-6 max-w-3xl sm:mb-12">
        <div className="eyebrow mb-4">{activeCollection ? (companyById.get(activeCollection.manufacturerId)?.name ?? t("nav.collections")) : t("catalog.eyebrow")}</div>
        <h1 className="display-lg">{heading}</h1>
        <p className="mt-4 text-muted-foreground">{t("catalog.subtitle")}</p>
      </FadeIn>

      <div className="glass sticky top-[5.5rem] z-30 mb-10 flex flex-wrap items-center gap-3 rounded-[1.75rem] p-2 sm:rounded-full">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.6} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("catalog.searchPlaceholder")}
            type="search"
            name="q"
            autoComplete="off"
            spellCheck={false}
            className="ps-9"
            aria-label={t("common.search")}
          />
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="lg:hidden">
              <SlidersHorizontal className="size-4" strokeWidth={1.6} />
              {t("common.filters")}
              {activeCount > 0 && <span className="rounded-full bg-brand px-1.5 text-[0.65rem] text-brand-foreground">{activeCount}</span>}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-xl px-6 pb-8 pt-6">
            <SheetTitle className="mb-4 font-display text-2xl">{t("common.filters")}</SheetTitle>
            {filtersPanel}
          </SheetContent>
        </Sheet>

        <div className="ms-auto flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline" aria-live="polite">
            {result.data ? t("catalog.resultsCount", { count: result.data.total }) : " "}
          </span>
          <Select value={filter.sort} onValueChange={(v) => update({ sort: v as ProductSort })}>
            <SelectTrigger className="w-44" aria-label={t("catalog.sortLabel")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="newest">{t("catalog.sortNewest")}</SelectItem>
              {canSeePrices && <SelectItem value="price_asc">{t("catalog.sortPriceAsc")}</SelectItem>}
              {canSeePrices && <SelectItem value="price_desc">{t("catalog.sortPriceDesc")}</SelectItem>}
              <SelectItem value="title">{t("catalog.sortTitle")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-12 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block" aria-label={t("common.filters")}>
          <div className="sticky top-48">
            {activeCount > 0 && (
              <button onClick={clearAll} className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                <X className="size-3" /> {t("catalog.clearFilters")}
              </button>
            )}
            {filtersPanel ?? <SkeletonGrid count={0} />}
          </div>
        </aside>

        <section aria-busy={products.loading}>
          {products.error ? (
            <ErrorState onRetry={products.reload} />
          ) : !products.data ? (
            <SkeletonGrid count={9} />
          ) : products.data.length === 0 ? (
            <EmptyState
              title={t("catalog.noResultsTitle")}
              body={t("catalog.noResultsBody")}
              action={
                <Button variant="outline" onClick={clearAll}>
                  {t("catalog.clearFilters")}
                </Button>
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 sm:gap-y-12 md:grid-cols-3">
                {products.data.map((p, i) => (
                  <ProductCard key={p.id} product={p} makerName={companyById.get(p.manufacturerId)?.name} priority={i < 3} />
                ))}
              </div>
              {pages > 1 && (
                <nav aria-label={t("catalog.pagerLabel")} className="mt-10 flex items-center justify-between gap-4 border-t border-hairline pt-6 sm:mt-16 sm:pt-8">
                  <Button variant="outline" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                    <ArrowBack className="size-4" /> {t("catalog.pagePrev")}
                  </Button>
                  <span className="text-sm tabular-nums text-muted-foreground" aria-live="polite">
                    {t("catalog.pageOf", { page, pages })}
                  </span>
                  <Button variant="outline" disabled={page >= pages} onClick={() => goToPage(page + 1)}>
                    {t("catalog.pageNext")} <ArrowForward className="size-4" />
                  </Button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={<div className="container-page py-10 sm:py-16"><SkeletonGrid count={9} /></div>}>
      <CatalogView />
    </Suspense>
  );
}
