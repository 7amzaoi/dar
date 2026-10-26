import "server-only";
import { and, eq } from "drizzle-orm";
import { tierFor } from "@/lib/data/helpers";
import type {
  AccountStatus,
  Category,
  Collection,
  Company,
  CompanyFilter,
  NewCollection,
  NewOrder,
  NewProduct,
  OrderStatus,
  Product,
  ProductFilter,
  User,
  UserFilter,
} from "@/lib/data/types";
import { sqlDb, schema } from "./db";
import { pg } from "./repositories";
import { HttpError, type Viewer } from "./viewer";

/**
 * Authorization for every DataSource method the browser may call through /api/data.
 * The client is untrusted: ids that identify the caller (retailerId, userId, manufacturerId)
 * are taken from the session, never from the arguments.
 */

type Handler = (v: Viewer, args: unknown[]) => Promise<unknown>;

const isAdmin = (v: Viewer) => v.user?.role === "admin" && v.user.status === "approved";
const isApproved = (v: Viewer) => v.user?.status === "approved";
/** wholesale prices are for approved members only */
const canSeePrices = isApproved;

function signedIn(v: Viewer): User {
  if (!v.user) throw new HttpError(401, "UNAUTHENTICATED");
  return v.user;
}

function approved(v: Viewer, role?: User["role"]): User {
  const user = signedIn(v);
  if (user.status !== "approved") throw new HttpError(403, "NOT_APPROVED");
  if (role && user.role !== role) throw new HttpError(403, "FORBIDDEN");
  return user;
}

function admin(v: Viewer): User {
  return approved(v, "admin");
}

const str = (x: unknown): string => {
  if (typeof x !== "string" || !x || x.length > 200) throw new HttpError(400, "INVALID_INPUT");
  return x;
};
const obj = <T>(x: unknown): T => (x && typeof x === "object" && !Array.isArray(x) ? (x as T) : ({} as T));

function visible(v: Viewer, p: Product) {
  return p.published || isAdmin(v) || p.manufacturerId === v.user?.companyId;
}

function present(v: Viewer, p: Product): Product {
  return canSeePrices(v) ? p : { ...p, priceTiers: [] };
}

const presentAll = (v: Viewer, ps: Product[]) => ps.filter((p) => visible(v, p)).map((p) => present(v, p));

async function ownedProduct(v: Viewer, id: string) {
  const p = await pg.products.getById(id);
  if (!p) throw new HttpError(404, "NOT_FOUND");
  if (!isAdmin(v) && p.manufacturerId !== approved(v, "manufacturer").companyId) throw new HttpError(403, "FORBIDDEN");
  return p;
}

async function ownedCollection(v: Viewer, id: string) {
  const c = await pg.collections.getById(id);
  if (!c) throw new HttpError(404, "NOT_FOUND");
  if (!isAdmin(v) && c.manufacturerId !== approved(v, "manufacturer").companyId) throw new HttpError(403, "FORBIDDEN");
  return c;
}

async function orderParty(v: Viewer, id: string) {
  const o = await pg.orders.getById(id);
  if (!o) throw new HttpError(404, "NOT_FOUND");
  if (isAdmin(v)) return { order: o, side: "admin" as const };
  const user = approved(v);
  if (o.retailerId === user.companyId) return { order: o, side: "retailer" as const };
  if (o.manufacturerId === user.companyId) return { order: o, side: "manufacturer" as const };
  throw new HttpError(404, "NOT_FOUND");
}

/** Companies are public once verified; members also see the unverified ones they trade with. */
const companyVisible = (v: Viewer, c: Company) => c.verified || isApproved(v) || c.id === v.user?.companyId;

/** Fields a member may edit on their own company profile (verification is the admin's call). */
function companyPatch(patch: Partial<Company>, asAdmin: boolean): Partial<Company> {
  const { name, country, city, about, aboutEn, phone, whatsapp, logoUrl, verified } = patch;
  const safe: Partial<Company> = { name, country, city, about, aboutEn, phone, whatsapp, logoUrl };
  if (asAdmin && verified !== undefined) safe.verified = verified;
  for (const k of Object.keys(safe) as (keyof Company)[]) if (!(k in patch)) delete safe[k];
  return safe;
}

function productPatch(patch: Partial<Product>): Partial<Product> {
  const { id: _id, manufacturerId: _m, createdAt: _c, ...rest } = patch;
  void _id;
  void _m;
  void _c;
  return rest;
}

const RETAILER_MAY_SET: OrderStatus[] = ["confirmed", "cancelled"];

export const policies: Record<string, Handler> = {
  /* products */
  "products.list": async (v, [f]) => {
    const filter = { ...obj<ProductFilter>(f) };
    if (!canSeePrices(v)) {
      delete filter.priceMin;
      delete filter.priceMax;
    }
    return presentAll(v, await pg.products.list(filter));
  },
  "products.getById": async (v, [id]) => {
    const p = await pg.products.getById(str(id));
    return p && visible(v, p) ? present(v, p) : null;
  },
  "products.getMany": async (v, [ids]) => {
    if (!Array.isArray(ids) || ids.length > 200) throw new HttpError(400, "INVALID_INPUT");
    return presentAll(v, await pg.products.getMany(ids.map(str)));
  },
  "products.listByManufacturer": async (v, [id]) => presentAll(v, await pg.products.listByManufacturer(str(id))),
  "products.create": async (v, [input]) => {
    const user = approved(v, "manufacturer");
    return pg.products.create({ ...obj<NewProduct>(input), manufacturerId: user.companyId });
  },
  "products.update": async (v, [id, patch]) => {
    await ownedProduct(v, str(id));
    return pg.products.update(str(id), productPatch(obj<Partial<Product>>(patch)));
  },
  "products.remove": async (v, [id]) => {
    await ownedProduct(v, str(id));
    return pg.products.remove(str(id));
  },
  "products.facets": async () => pg.products.facets(),

  /* users */
  "users.list": async (v, [f]) => (admin(v), pg.users.list(obj<UserFilter>(f))),
  "users.getById": async (v, [id]) => {
    const user = signedIn(v);
    if (str(id) !== user.id) admin(v);
    return pg.users.getById(str(id));
  },
  "users.getByEmail": async (v, [email]) => (admin(v), pg.users.getByEmail(str(email))),
  "users.listByCompany": async (v, [companyId]) => {
    if (str(companyId) !== approved(v).companyId) admin(v);
    return pg.users.listByCompany(str(companyId));
  },
  "users.create": async (v, [input]) => (admin(v), pg.users.create(obj(input))),
  "users.update": async (v, [id, patch]) => {
    const user = signedIn(v);
    const p = obj<Partial<User>>(patch);
    if (isAdmin(v)) return pg.users.update(str(id), { name: p.name, email: p.email, role: p.role, status: p.status });
    if (str(id) !== user.id) throw new HttpError(403, "FORBIDDEN");
    return pg.users.update(user.id, { name: p.name });
  },
  "users.setStatus": async (v, [id, status]) => {
    admin(v);
    if (!["pending", "approved", "suspended"].includes(status as string)) throw new HttpError(400, "INVALID_INPUT");
    return pg.users.setStatus(str(id), status as AccountStatus);
  },

  /* companies */
  "companies.list": async (v, [f]) => {
    const filter = { ...obj<CompanyFilter>(f) };
    if (!isApproved(v)) filter.verified = true;
    return pg.companies.list(filter);
  },
  "companies.getById": async (v, [id]) => {
    const c = await pg.companies.getById(str(id));
    return c && companyVisible(v, c) ? c : null;
  },
  "companies.create": async (v, [input]) => (admin(v), pg.companies.create(obj(input))),
  "companies.update": async (v, [id, patch]) => {
    const asAdmin = isAdmin(v);
    if (!asAdmin && str(id) !== approved(v).companyId) throw new HttpError(403, "FORBIDDEN");
    return pg.companies.update(str(id), companyPatch(obj<Partial<Company>>(patch), asAdmin));
  },

  /* categories */
  "categories.list": async () => pg.categories.list(),
  "categories.getById": async (_v, [id]) => pg.categories.getById(str(id)),
  "categories.create": async (v, [input]) => (admin(v), pg.categories.create(obj<Omit<Category, "id">>(input))),
  "categories.update": async (v, [id, patch]) => (admin(v), pg.categories.update(str(id), obj(patch))),
  "categories.remove": async (v, [id]) => (admin(v), pg.categories.remove(str(id))),

  /* collections */
  "collections.list": async () => pg.collections.list(),
  "collections.listByManufacturer": async (_v, [id]) => pg.collections.listByManufacturer(str(id)),
  "collections.getById": async (_v, [id]) => pg.collections.getById(str(id)),
  "collections.create": async (v, [input]) => {
    const user = approved(v, "manufacturer");
    return pg.collections.create({ ...obj<NewCollection>(input), manufacturerId: user.companyId });
  },
  "collections.update": async (v, [id, patch]) => {
    await ownedCollection(v, str(id));
    const { nameAr, nameEn, coverUrl } = obj<Partial<Collection>>(patch);
    return pg.collections.update(str(id), { nameAr, nameEn, coverUrl });
  },
  "collections.remove": async (v, [id]) => {
    await ownedCollection(v, str(id));
    return pg.collections.remove(str(id));
  },

  /* favorites: always the caller's own company */
  "favorites.listByRetailer": async (v) => pg.favorites.listByRetailer(approved(v, "retailer").companyId),
  "favorites.toggle": async (v, [, productId]) => pg.favorites.toggle(approved(v, "retailer").companyId, str(productId)),
  "favorites.remove": async (v, [, productId]) => pg.favorites.remove(approved(v, "retailer").companyId, str(productId)),

  /* orders */
  "orders.list": async (v) => (admin(v), pg.orders.list()),
  "orders.getById": async (v, [id]) => {
    try {
      return (await orderParty(v, str(id))).order;
    } catch (e) {
      if (e instanceof HttpError && e.status === 404) return null;
      throw e;
    }
  },
  "orders.listByRetailer": async (v, [id]) => {
    if (isAdmin(v)) return pg.orders.listByRetailer(str(id));
    return pg.orders.listByRetailer(approved(v, "retailer").companyId);
  },
  "orders.listByManufacturer": async (v, [id]) => {
    if (isAdmin(v)) return pg.orders.listByManufacturer(str(id));
    return pg.orders.listByManufacturer(approved(v, "manufacturer").companyId);
  },
  "orders.create": async (v, [input]) => {
    const user = approved(v, "retailer");
    const o = obj<NewOrder>(input);
    if (!Array.isArray(o.items) || !o.items.length || o.items.length > 100) throw new HttpError(400, "INVALID_INPUT");
    const products = await pg.products.getMany(o.items.map((i) => str(i.productId)));
    const byId = new Map(products.map((p) => [p.id, p]));
    const items = o.items.map((i) => {
      const p = byId.get(i.productId);
      const qty = Math.floor(Number(i.qty));
      if (!p || !p.published || p.manufacturerId !== o.manufacturerId || !(qty >= p.minOrderQty)) throw new HttpError(400, "INVALID_ITEM");
      // Direct orders are priced from the maker's tiers here, never from the browser.
      return o.isRFQ ? { productId: p.id, qty } : { productId: p.id, qty, unitPrice: tierFor(p.priceTiers, qty)?.unitPrice ?? 0 };
    });
    return pg.orders.create({
      retailerId: user.companyId,
      manufacturerId: str(o.manufacturerId),
      items,
      isRFQ: !!o.isRFQ,
      note: typeof o.note === "string" ? o.note.slice(0, 2000) : undefined,
    });
  },
  "orders.submitQuote": async (v, [id, prices]) => {
    const { order, side } = await orderParty(v, str(id));
    if (side !== "manufacturer") throw new HttpError(403, "FORBIDDEN");
    if (order.status !== "quote_requested") throw new HttpError(409, "INVALID_STATE");
    const clean: Record<string, number> = {};
    for (const [k, n] of Object.entries(obj<Record<string, unknown>>(prices))) {
      if (typeof n === "number" && Number.isFinite(n) && n > 0) clean[k] = n;
    }
    return pg.orders.submitQuote(order.id, clean);
  },
  "orders.updateStatus": async (v, [id, status]) => {
    const { order, side } = await orderParty(v, str(id));
    const s = status as OrderStatus;
    const allowed: OrderStatus[] =
      side === "admin"
        ? ["quote_requested", "quoted", "confirmed", "in_production", "shipped", "completed", "cancelled"]
        : side === "retailer"
          ? RETAILER_MAY_SET
          : ["confirmed", "in_production", "shipped", "completed", "cancelled"];
    if (!allowed.includes(s)) throw new HttpError(403, "FORBIDDEN");
    return pg.orders.updateStatus(order.id, s);
  },

  /* notifications: always the caller's own */
  "notifications.listByUser": async (v) => pg.notifications.listByUser(signedIn(v).id),
  "notifications.unreadCount": async (v) => pg.notifications.unreadCount(signedIn(v).id),
  "notifications.markRead": async (v, [id]) => {
    const user = signedIn(v);
    await sqlDb
      .update(schema.notifications)
      .set({ read: true })
      .where(and(eq(schema.notifications.id, str(id)), eq(schema.notifications.user_id, user.id)));
  },
  "notifications.markAllRead": async (v) => pg.notifications.markAllRead(signedIn(v).id),
  "notifications.create": async (v, [input]) => (admin(v), pg.notifications.create(obj(input))),

  /* analytics */
  "analytics.manufacturerStats": async (v, [id]) => {
    if (isAdmin(v)) return pg.analytics.manufacturerStats(str(id));
    return pg.analytics.manufacturerStats(approved(v, "manufacturer").companyId);
  },
  "analytics.platformStats": async (v) => (admin(v), pg.analytics.platformStats()),
};
