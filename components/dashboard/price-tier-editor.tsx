"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PriceTier } from "@/lib/data";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Pure validation, also used by the product form's zod schema. */
export function tierErrors(tiers: PriceTier[], moq: number): ("min" | "first" | "ascending" | "price")[] {
  const errs = new Set<"min" | "first" | "ascending" | "price">();
  if (tiers.length === 0) errs.add("min");
  if (tiers[0] && tiers[0].minQty !== moq) errs.add("first");
  for (let i = 1; i < tiers.length; i++) {
    if (tiers[i].minQty <= tiers[i - 1].minQty) errs.add("ascending");
    if (tiers[i].unitPrice > tiers[i - 1].unitPrice) errs.add("price");
  }
  return [...errs];
}

export function PriceTierEditor({
  value,
  onChange,
  moq,
  currency = "USD",
  invalid,
}: {
  value: PriceTier[];
  onChange: (tiers: PriceTier[]) => void;
  moq: number;
  currency?: string;
  invalid?: boolean;
}) {
  const { t, formatPrice } = useT();
  const errors = tierErrors(value, moq);
  const base = value[0]?.unitPrice ?? 0;

  const patch = (i: number, p: Partial<PriceTier>) => onChange(value.map((tier, j) => (j === i ? { ...tier, ...p } : tier)));

  const add = () => {
    const last = value.at(-1);
    onChange([
      ...value,
      last
        ? { minQty: last.minQty * 2 || moq, unitPrice: Math.round(last.unitPrice * 0.94), currency }
        : { minQty: moq, unitPrice: 0, currency },
    ]);
  };

  return (
    <div className="space-y-3">
      <div className={cn("overflow-hidden rounded-md border", invalid && errors.length ? "border-destructive/60" : "border-border")}>
        <div className="grid grid-cols-[1fr_1fr_5rem_2.5rem] gap-3 bg-secondary/60 px-4 py-2.5 text-xs text-muted-foreground">
          <span>{t("mfr.tierMinQty")}</span>
          <span>{t("mfr.tierUnitPrice")}</span>
          <span className="text-end" />
          <span />
        </div>
        {value.map((tier, i) => {
          const saving = base && i > 0 ? Math.round((1 - tier.unitPrice / base) * 100) : 0;
          return (
            <div key={i} className="grid grid-cols-[1fr_1fr_5rem_2.5rem] items-center gap-3 border-t border-hairline px-4 py-2.5">
              <Input
                type="number"
                min={1}
                value={tier.minQty}
                onChange={(e) => patch(i, { minQty: Math.max(0, Math.floor(Number(e.target.value))) })}
                aria-label={`${t("mfr.tierMinQty")} ${i + 1}`}
                className="h-9 tabular-nums"
                disabled={i === 0}
              />
              <Input
                type="number"
                min={0}
                step="5"
                value={tier.unitPrice}
                onChange={(e) => patch(i, { unitPrice: Math.max(0, Number(e.target.value)) })}
                aria-label={`${t("mfr.tierUnitPrice")} ${i + 1}`}
                className="h-9 tabular-nums"
              />
              <span className="text-end text-xs tabular-nums text-success">{saving > 0 ? `−${saving}%` : i === 0 ? formatPrice(tier.unitPrice, currency) : ""}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                disabled={i === 0}
                aria-label={t("common.remove")}
              >
                <Trash2 className="size-3.5" strokeWidth={1.6} />
              </Button>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Button type="button" variant="outline" size="sm" onClick={add} disabled={value.length >= 6}>
          <Plus className="size-3.5" /> {t("mfr.addTier")}
        </Button>
        {errors.length > 0 && (
          <ul className="space-y-1 text-xs text-destructive" role="alert">
            {errors.includes("min") && <li>{t("mfr.tierErrMin")}</li>}
            {errors.includes("first") && <li>{t("mfr.tierErrFirst")}</li>}
            {errors.includes("ascending") && <li>{t("mfr.tierErrAscending")}</li>}
            {errors.includes("price") && <li>{t("mfr.tierErrPrice")}</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
