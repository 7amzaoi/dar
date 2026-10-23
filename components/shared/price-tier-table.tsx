"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import type { PriceTier } from "@/lib/data";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Tiered wholesale pricing — rendered only for approved members. */
export function PriceTierTable({ tiers, activeQty, className }: { tiers: PriceTier[]; activeQty?: number; className?: string }) {
  const { t, formatPrice } = useT();
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  const base = sorted[0]?.unitPrice ?? 0;
  const activeIndex = activeQty == null ? -1 : sorted.reduce((idx, tier, i) => (activeQty >= tier.minQty ? i : idx), 0);

  return (
    <div className={cn("overflow-hidden rounded-[1.5rem] border border-border", className)}>
      <div className="grid grid-cols-[1fr_auto_auto] gap-4 bg-secondary/60 px-4 py-2.5 text-[0.7rem] uppercase tracking-wider text-muted-foreground rtl:tracking-normal">
        <span>{t("product.tierQty")}</span>
        <span className="text-end">{t("product.tierPrice")}</span>
        <span className="w-12" />
      </div>
      {sorted.map((tier, i) => {
        const saving = base ? Math.round((1 - tier.unitPrice / base) * 100) : 0;
        return (
          <div
            key={tier.minQty}
            className={cn(
              "grid grid-cols-[1fr_auto_auto] items-center gap-4 border-t border-hairline px-4 py-3 transition-colors",
              i === activeIndex && "bg-brand/8",
            )}
          >
            <span className="text-sm">{t("product.tierRow", { qty: tier.minQty })}</span>
            <span className="text-end font-display text-xl tabular-nums">{formatPrice(tier.unitPrice, tier.currency)}</span>
            <span className="w-12 text-end text-xs text-success">{saving > 0 ? t("product.tierSaving", { pct: saving }) : ""}</span>
          </div>
        );
      })}
    </div>
  );
}

/** What guests and pending members see instead of prices. */
export function GatedPrice({ className }: { className?: string }) {
  const { t } = useT();
  const { currentUser } = useAuth();
  const pending = currentUser?.status === "pending";

  return (
    <div className={cn("relative overflow-hidden rounded-[1.5rem] border border-border bg-surface p-6", className)}>
      <div className="pointer-events-none absolute inset-x-6 top-6 space-y-3 opacity-60 blur-[6px]" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex justify-between">
            <span className="h-3 w-24 rounded bg-muted-foreground/25" />
            <span className="h-4 w-16 rounded bg-muted-foreground/30" />
          </div>
        ))}
      </div>
      <div className="relative pt-20">
        <div className="mb-2 flex items-center gap-2 text-brand-strong">
          <Lock className="size-4" strokeWidth={1.6} />
          <span className="eyebrow">{t("product.tierTitle")}</span>
        </div>
        <h3 className="font-display text-2xl">{pending ? t("product.pendingTitle") : t("product.gatedTitle")}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{pending ? t("product.pendingBody") : t("product.gatedBody")}</p>
        {!pending && (
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/login">{t("product.gatedCta")}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/register">{t("product.gatedApply")}</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
