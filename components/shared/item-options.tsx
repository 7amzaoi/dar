"use client";

import type { OrderItem } from "@/lib/data";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** "Colour: Ivory" and the showroom's note for one order line. Renders nothing when there are none. */
export function ItemOptions({ item, className }: { item: Pick<OrderItem, "color" | "note">; className?: string }) {
  const { t, color } = useT();
  if (!item.color && !item.note) return null;
  return (
    <div className={cn("space-y-0.5 text-xs", className)}>
      {item.color && (
        <div className="text-foreground/80">
          {t("product.colorLabel")}: {color(item.color)}
        </div>
      )}
      {item.note && (
        <div className="text-muted-foreground" dir="auto">
          {item.note}
        </div>
      )}
    </div>
  );
}
