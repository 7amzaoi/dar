import type { Category, Order, OrderStatus, PriceTier, Product } from "./types";

/** Pure domain helpers — safe to keep when the data source changes. */

export function basePrice(p: Pick<Product, "priceTiers">) {
  return p.priceTiers[0]?.unitPrice ?? 0;
}

export function lowestPrice(p: Pick<Product, "priceTiers">) {
  return p.priceTiers.reduce((min, t) => Math.min(min, t.unitPrice), Number.POSITIVE_INFINITY);
}

/** The tier that applies for a given quantity (highest minQty <= qty). */
export function tierFor(tiers: PriceTier[], qty: number): PriceTier | undefined {
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  return [...sorted].reverse().find((t) => qty >= t.minQty) ?? sorted[0];
}

export function orderTotal(order: Pick<Order, "items">, products: Map<string, Product>) {
  return order.items.reduce((sum, item) => {
    const unit = item.unitPrice ?? (products.get(item.productId) ? tierFor(products.get(item.productId)!.priceTiers, item.qty)?.unitPrice ?? 0 : 0);
    return sum + unit * item.qty;
  }, 0);
}

export const ORDER_PIPELINE: OrderStatus[] = ["quote_requested", "quoted", "confirmed", "in_production", "shipped", "completed"];
export const DIRECT_PIPELINE: OrderStatus[] = ["confirmed", "in_production", "shipped", "completed"];
export const OPEN_STATUSES: OrderStatus[] = ["quote_requested", "quoted", "confirmed", "in_production", "shipped"];

/** Next status a manufacturer can move an order to (after confirmation). */
export function nextManufacturerStatus(status: OrderStatus): OrderStatus | null {
  switch (status) {
    case "confirmed":
      return "in_production";
    case "in_production":
      return "shipped";
    case "shipped":
      return "completed";
    default:
      return null;
  }
}

export function topLevelCategories(categories: Category[]) {
  return categories.filter((c) => !c.parentId);
}

export function childCategories(categories: Category[], parentId: string) {
  return categories.filter((c) => c.parentId === parentId);
}

export function topLevelOf(categories: Category[], id: string) {
  const c = categories.find((x) => x.id === id);
  if (!c) return undefined;
  return c.parentId ? categories.find((x) => x.id === c.parentId) : c;
}
