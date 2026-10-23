"use client";

import Link from "next/link";
import { Heart, Lock } from "lucide-react";
import { toast } from "sonner";
import { FurnitureImage } from "@/components/shared/furniture-image";
import { motion } from "@/components/shared/motion";
import { useAuth } from "@/lib/auth";
import { lowestPrice, type Product } from "@/lib/data";
import { useFavorites } from "@/lib/hooks/commerce-providers";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function FavoriteButton({ productId, className }: { productId: string; className?: string }) {
  const { t } = useT();
  const fav = useFavorites();
  if (!fav.enabled) return null;
  const active = fav.isFavorite(productId);
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const added = await fav.toggle(productId);
        toast.success(added ? t("product.saved") : t("common.deleted"));
      }}
      aria-pressed={active}
      aria-label={active ? t("product.saved") : t("product.save")}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur transition-all hover:scale-105 hover:bg-background",
        className,
      )}
    >
      <Heart className={cn("size-4 transition-colors", active && "fill-terracotta text-terracotta")} strokeWidth={1.6} />
    </button>
  );
}

export function PriceLine({ product, className }: { product: Product; className?: string }) {
  const { t, formatPrice } = useT();
  const { canSeePrices } = useAuth();
  if (!canSeePrices) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
        <Lock className="size-3" strokeWidth={1.8} />
        {t("catalog.gatedPrice")}
      </span>
    );
  }
  const currency = product.priceTiers[0]?.currency ?? "USD";
  return (
    <span className={cn("text-sm", className)}>
      {t("catalog.priceFrom", { price: formatPrice(lowestPrice(product), currency) })}
    </span>
  );
}

export function ProductCard({
  product,
  makerName,
  priority,
  className,
}: {
  product: Product;
  makerName?: string;
  priority?: boolean;
  className?: string;
}) {
  const { t, tx } = useT();
  const title = tx(product.titleAr, product.titleEn);

  return (
    <motion.article
      className={cn("group relative", className)}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
    >
      <Link href={`/product/${product.id}`} className="block focus-visible:outline-none">
        <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-secondary shadow-soft transition-shadow duration-500 group-hover:shadow-lift group-focus-visible:ring-2 group-focus-visible:ring-ring">
          <FurnitureImage
            src={product.images[0]}
            alt={title}
            priority={priority}
            className="transition-transform duration-[1.2s] ease-out group-hover:scale-[1.035]"
          />
          {product.images[1] && (
            <FurnitureImage
              src={product.images[1]}
              alt=""
              className="opacity-0 transition-opacity duration-700 group-hover:opacity-100"
            />
          )}
          {product.stockStatus !== "in_stock" && (
            <span className="absolute bottom-3 start-3 rounded-full bg-background/85 px-2.5 py-1 text-[0.68rem] font-medium backdrop-blur">
              {t(`status.stock.${product.stockStatus}`)}
            </span>
          )}
        </div>
        <div className="mt-4 space-y-1.5">
          {makerName && <div className="eyebrow">{makerName}</div>}
          <h3 className="font-display text-xl leading-snug">{title}</h3>
          <div className="flex items-center justify-between gap-3">
            <PriceLine product={product} />
            <span className="text-xs text-muted-foreground">{t("catalog.moqShort", { qty: product.minOrderQty })}</span>
          </div>
        </div>
      </Link>
      <FavoriteButton productId={product.id} className="absolute end-3 top-3" />
    </motion.article>
  );
}
