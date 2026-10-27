import "server-only";
import { z } from "zod";
import { HttpError } from "./viewer";

/**
 * Server-side shapes for everything the browser can write through /api/data.
 * Unknown keys are dropped; `null` means "clear this optional field" (lib/data/http.ts sends
 * cleared fields as null so they survive JSON).
 */

export function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input ?? {});
  if (!result.success) throw new HttpError(400, "INVALID_INPUT");
  return result.data;
}

const text = (min: number, max: number) => z.string().trim().min(min).max(max);
/** optional field that may be cleared: null/"" -> undefined, key kept */
const clearable = <T extends z.ZodType>(schema: T) =>
  z
    .union([schema, z.null(), z.literal("")])
    .optional()
    .transform((v) => (v === null || v === "" ? undefined : (v as z.output<T>)));

const id = z.string().min(1).max(64).regex(/^[\w-]+$/);
const count = z.number().int().min(1).max(1_000_000);
const money = z.number().positive().max(10_000_000);

/**
 * Images a member may reference: the bundled placeholder art, or an object this company
 * uploaded to the `assets` bucket. Anything else (external hosts, other companies' keys) is refused.
 */
export function imageUrl(companyId: string) {
  const own = `/api/files/products/${companyId}/`;
  return z
    .string()
    .max(300)
    .refine(
      (src) =>
        /^\/images\/[\w-]+(\/[\w-]+)*\.(svg|png|jpe?g|webp)$/.test(src) ||
        (src.startsWith(own) && /^[\w-]+\.(jpg|png|webp|avif)$/.test(src.slice(own.length))),
      "IMAGE_NOT_ALLOWED",
    );
}

const priceTiers = z
  .array(z.object({ minQty: count, unitPrice: money, currency: z.string().regex(/^[A-Z]{3}$/) }))
  .min(1)
  .max(10)
  .refine((tiers) => tiers.every((t, i) => i === 0 || t.minQty > tiers[i - 1].minQty), "TIERS_NOT_ASCENDING");

const tags = z.array(text(1, 40)).min(1).max(20);

function productFields(companyId: string) {
  return z.object({
    titleAr: text(2, 200),
    titleEn: text(2, 200),
    descriptionAr: text(10, 5000),
    descriptionEn: text(10, 5000),
    categoryId: id,
    images: z.array(imageUrl(companyId)).min(1).max(8),
    materials: tags,
    colors: tags,
    dimensions: z.object({
      width: z.number().positive().max(10_000),
      height: z.number().positive().max(10_000),
      depth: z.number().positive().max(10_000),
      unit: z.literal("cm"),
    }),
    priceTiers,
    minOrderQty: count,
    stockStatus: z.enum(["in_stock", "made_to_order", "out_of_stock"]),
    leadTimeDays: clearable(z.number().int().min(0).max(365)),
    collectionId: clearable(id),
    published: z.boolean(),
  });
}

const tiersStartAtMoq = (p: { priceTiers?: { minQty: number }[]; minOrderQty?: number }) =>
  !p.priceTiers || p.minOrderQty === undefined || p.priceTiers[0].minQty >= p.minOrderQty;

export const productInput = (companyId: string) => productFields(companyId).refine(tiersStartAtMoq, "TIER_BELOW_MOQ");
export const productPatch = (companyId: string) => productFields(companyId).partial().refine(tiersStartAtMoq, "TIER_BELOW_MOQ");

export const collectionInput = (companyId: string) =>
  z.object({ nameAr: text(1, 120), nameEn: text(1, 120), coverUrl: clearable(imageUrl(companyId)) });
export const collectionPatch = (companyId: string) => collectionInput(companyId).partial();

export const companyPatch = (companyId: string) =>
  z
    .object({
      name: text(2, 160),
      country: text(2, 80),
      city: text(1, 80),
      about: text(1, 2000),
      aboutEn: clearable(text(1, 2000)),
      phone: text(6, 40),
      whatsapp: clearable(z.string().trim().regex(/^\+?[\d\s()-]{8,40}$/)),
      logoUrl: clearable(imageUrl(companyId)),
      verified: z.boolean(),
    })
    .partial();

/** Admin-created company (members register through /api/register). */
export const companyInput = z.object({
  type: z.enum(["manufacturer", "retailer"]),
  name: text(2, 160),
  country: text(2, 80),
  city: text(1, 80),
  about: text(1, 2000),
  aboutEn: clearable(text(1, 2000)),
  phone: text(6, 40),
  whatsapp: clearable(z.string().trim().regex(/^\+?[\d\s()-]{8,40}$/)),
  verified: z.boolean().default(false),
});

export const categoryInput =z.object({ nameAr: text(1, 80), nameEn: text(1, 80), parentId: clearable(id) });
export const categoryPatch = categoryInput.partial();

export const orderInput = z.object({
  manufacturerId: id,
  items: z
    .array(
      z.object({
        productId: id,
        qty: count,
        // checked against the product's own colours in the policy
        color: clearable(text(1, 40)),
        note: clearable(text(1, 300)),
      }),
    )
    .min(1)
    .max(100)
    // the same piece may appear twice in different colours, but not as the same selection
    .refine((items) => new Set(items.map((i) => `${i.productId}|${i.color ?? ""}`)).size === items.length, "DUPLICATE_ITEM"),
  isRFQ: z.boolean(),
  note: clearable(text(1, 2000)),
});

export const quotePrices = z.record(id, money);

const statuses = ["quote_requested", "quoted", "confirmed", "in_production", "shipped", "completed", "cancelled"] as const;

export const productFilter = z.object({
  search: clearable(z.string().max(200)),
  categoryId: clearable(id),
  materials: clearable(z.array(z.string().max(40)).max(50)),
  colors: clearable(z.array(z.string().max(40)).max(50)),
  priceMin: clearable(z.number().min(0)),
  priceMax: clearable(z.number().min(0)),
  stockStatus: clearable(z.array(z.enum(["in_stock", "made_to_order", "out_of_stock"])).max(3)),
  countries: clearable(z.array(z.string().max(80)).max(50)),
  manufacturerId: clearable(id),
  collectionId: clearable(id),
  publishedOnly: clearable(z.boolean()),
  sort: clearable(z.enum(["newest", "price_asc", "price_desc", "title"])),
  limit: clearable(z.number().int().min(1).max(500)),
});

export const productPageQuery = productFilter.omit({ limit: true }).extend({
  page: clearable(z.number().int().min(1).max(10_000)),
  pageSize: clearable(z.number().int().min(1).max(60)),
});

export const companyFilter = z.object({
  type: clearable(z.enum(["manufacturer", "retailer"])),
  verified: clearable(z.boolean()),
  search: clearable(z.string().max(200)),
});

export const userFilter = z.object({
  role: clearable(z.enum(["manufacturer", "retailer", "admin"])),
  status: clearable(z.enum(["pending", "approved", "suspended"])),
  search: clearable(z.string().max(200)),
});

export const userInput = z.object({
  role: z.enum(["manufacturer", "retailer", "admin"]),
  email: z.email().max(200),
  name: text(1, 120),
  companyId: z.union([id, z.literal("")]),
  status: clearable(z.enum(["pending", "approved", "suspended"])),
});

export const userPatch = z.object({
  name: text(1, 120),
  email: z.email().max(200),
  role: z.enum(["manufacturer", "retailer", "admin"]),
  status: z.enum(["pending", "approved", "suspended"]),
}).partial();

export const notificationInput = z.object({
  userId: id,
  type: text(1, 60),
  body: text(1, 1000),
  href: clearable(z.string().max(300).regex(/^\/[\w/-]*$/)),
  params: clearable(z.record(z.string().max(40), z.string().max(200))),
});

export const orderStatus = z.enum(statuses);
