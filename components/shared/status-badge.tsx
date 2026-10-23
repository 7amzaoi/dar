"use client";

import type { AccountStatus, OrderStatus, StockStatus } from "@/lib/data";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

const TONES: Record<Tone, string> = {
  neutral: "bg-secondary text-secondary-foreground border-border",
  brand: "bg-brand/12 text-brand-strong border-brand/30",
  success: "bg-success/12 text-success border-success/30",
  warning: "bg-warning/12 text-warning border-warning/30",
  danger: "bg-destructive/10 text-destructive border-destructive/30",
  info: "bg-info/12 text-info border-info/30",
};

export function Pill({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[0.72rem] font-medium", TONES[tone], className)}>
      <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {children}
    </span>
  );
}

const ORDER_TONE: Record<OrderStatus, Tone> = {
  quote_requested: "brand",
  quoted: "info",
  confirmed: "neutral",
  in_production: "warning",
  shipped: "info",
  completed: "success",
  cancelled: "danger",
};

const STOCK_TONE: Record<StockStatus, Tone> = { in_stock: "success", made_to_order: "brand", out_of_stock: "danger" };
const ACCOUNT_TONE: Record<AccountStatus, Tone> = { pending: "warning", approved: "success", suspended: "danger" };

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const { t } = useT();
  return <Pill tone={ORDER_TONE[status]} className={className}>{t(`status.order.${status}`)}</Pill>;
}

export function StockBadge({ status, className }: { status: StockStatus; className?: string }) {
  const { t } = useT();
  return <Pill tone={STOCK_TONE[status]} className={className}>{t(`status.stock.${status}`)}</Pill>;
}

export function AccountStatusBadge({ status, className }: { status: AccountStatus; className?: string }) {
  const { t } = useT();
  return <Pill tone={ACCOUNT_TONE[status]} className={className}>{t(`status.account.${status}`)}</Pill>;
}
