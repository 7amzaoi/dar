"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { childCategories, topLevelCategories, type Category, type ProductFilter, type StockStatus } from "@/lib/data";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Swatch colours for the colour facet (product data, not UI theme). */
export const COLOR_SWATCHES: Record<string, string> = {
  ivory: "#efe6d8",
  sand: "#d8c3a0",
  stone: "#a8a196",
  natural: "#c29a6b",
  olive: "#7f8b6f",
  terracotta: "#b5673f",
  cognac: "#9a5b34",
  walnut: "#6b4a33",
  ink: "#3e4f5a",
  charcoal: "#3a3633",
  brass: "#b08d57",
};

const STOCK: StockStatus[] = ["in_stock", "made_to_order", "out_of_stock"];

export interface Facets {
  materials: string[];
  colors: string[];
  countries: string[];
  priceMax: number;
}

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <fieldset className={cn("border-t border-hairline py-6 first:border-t-0 first:pt-0", className)}>
      <legend className="eyebrow float-start mb-4 w-full font-sans">{title}</legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  );
}

function toggle<T>(list: T[] | undefined, v: T) {
  const set = new Set(list ?? []);
  if (set.has(v)) set.delete(v);
  else set.add(v);
  return [...set];
}

export function Filters({
  value,
  onChange,
  facets,
  categories,
  showPrice,
}: {
  value: ProductFilter;
  onChange: (patch: Partial<ProductFilter>) => void;
  facets: Facets;
  categories: Category[];
  /** price filtering is only meaningful for members who can see prices */
  showPrice: boolean;
}) {
  const { t, tx, material, color, country, formatPrice } = useT();
  const max = facets.priceMax || 5000;
  const [range, setRange] = useState<[number, number]>([value.priceMin ?? 0, value.priceMax ?? max]);

  return (
    <div className="text-sm">
      <Section title={t("catalog.category")}>
        <ul className="space-y-1">
          <li>
            <button
              type="button"
              onClick={() => onChange({ categoryId: undefined })}
              className={cn("w-full py-1 text-start transition-colors", !value.categoryId ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground")}
              aria-pressed={!value.categoryId}
            >
              {t("catalog.allCategories")}
            </button>
          </li>
          {topLevelCategories(categories).map((top) => {
            const children = childCategories(categories, top.id);
            const open = value.categoryId === top.id || children.some((c) => c.id === value.categoryId);
            return (
              <li key={top.id}>
                <button
                  type="button"
                  onClick={() => onChange({ categoryId: top.id })}
                  className={cn("w-full py-1 text-start transition-colors", value.categoryId === top.id ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground")}
                  aria-pressed={value.categoryId === top.id}
                >
                  {tx(top.nameAr, top.nameEn)}
                </button>
                {open && children.length > 0 && (
                  <ul className="ms-3 mt-1 space-y-1 border-s border-hairline ps-3">
                    {children.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => onChange({ categoryId: c.id })}
                          className={cn("w-full py-0.5 text-start text-[0.8rem] transition-colors", value.categoryId === c.id ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground")}
                          aria-pressed={value.categoryId === c.id}
                        >
                          {tx(c.nameAr, c.nameEn)}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title={t("catalog.material")}>
        <div className="flex flex-wrap gap-1.5">
          {facets.materials.map((m) => {
            const active = value.materials?.includes(m);
            return (
              <button
                key={m}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ materials: toggle(value.materials, m) })}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  active ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/40",
                )}
              >
                {material(m)}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title={t("catalog.color")}>
        <div className="flex flex-wrap gap-2">
          {facets.colors.map((c) => {
            const active = value.colors?.includes(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={active}
                aria-label={color(c)}
                title={color(c)}
                onClick={() => onChange({ colors: toggle(value.colors, c) })}
                className={cn(
                  "size-7 rounded-full border border-black/10 ring-offset-2 ring-offset-background transition-shadow",
                  active ? "ring-2 ring-foreground" : "hover:ring-1 hover:ring-foreground/30",
                )}
                style={{ backgroundColor: COLOR_SWATCHES[c] ?? "#ccc" }}
              />
            );
          })}
        </div>
      </Section>

      {showPrice && (
        <Section title={t("catalog.priceRange")}>
          <Slider
            min={0}
            max={max}
            step={50}
            value={range}
            onValueChange={(v) => setRange([v[0], v[1]] as [number, number])}
            onValueCommit={(v) => onChange({ priceMin: v[0] > 0 ? v[0] : undefined, priceMax: v[1] < max ? v[1] : undefined })}
            className="my-3"
            aria-label={t("catalog.priceRange")}
          />
          <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
            <span>{formatPrice(range[0])}</span>
            <span>{formatPrice(range[1])}</span>
          </div>
        </Section>
      )}

      <Section title={t("catalog.stock")}>
        <div className="space-y-2.5">
          {STOCK.map((s) => (
            <label key={s} className="flex cursor-pointer items-center gap-2.5">
              <Checkbox checked={value.stockStatus?.includes(s) ?? false} onCheckedChange={() => onChange({ stockStatus: toggle(value.stockStatus, s) })} />
              <span>{t(`status.stock.${s}`)}</span>
            </label>
          ))}
        </div>
      </Section>

      <Section title={t("catalog.country")}>
        <div className="space-y-2.5">
          {facets.countries.map((c) => (
            <label key={c} className="flex cursor-pointer items-center gap-2.5">
              <Checkbox checked={value.countries?.includes(c) ?? false} onCheckedChange={() => onChange({ countries: toggle(value.countries, c) })} />
              <span>{country(c)}</span>
            </label>
          ))}
        </div>
      </Section>
    </div>
  );
}
