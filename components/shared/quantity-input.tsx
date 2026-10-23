"use client";

import { Minus, Plus } from "lucide-react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function QuantityInput({
  value,
  onChange,
  min = 1,
  step = 1,
  className,
  size = "default",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
  className?: string;
  size?: "default" | "sm";
}) {
  const { t } = useT();
  const h = size === "sm" ? "h-8" : "h-11";
  return (
    <div className={cn("inline-flex items-center rounded-lg border border-input bg-surface", h, className)}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - step))}
        className="inline-flex h-full w-9 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
        disabled={value <= min}
        aria-label="−"
      >
        <Minus className="size-3.5" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(Math.max(0, Math.floor(n)));
        }}
        onBlur={() => value < min && onChange(min)}
        aria-label={t("common.quantity")}
        className="h-full w-14 bg-transparent text-center text-sm tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => onChange(value + step)}
        className="inline-flex h-full w-9 items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label="+"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
