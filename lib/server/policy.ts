import "server-only";
import { and, eq } from "drizzle-orm";
import { tierFor } from "@/lib/data/helpers";
import type { AccountStatus, Company, Product, User } from "@/lib/data/types";
import { sqlDb, schema } from "./db";
import { pg, transitionOrder } from "./repositories";
import * as input from "./validation";
import { parse } from "./validation";
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

/** A product's category must exist and its collection must belong to the same maker. */
async function checkProductRefs(manufacturerId: string, p: Partial<Pick<Product, "categoryId" | "collectionId">>) {
  if (p.categoryId && !(await pg.categories.getById(p.categoryId))) throw new HttpError(400, "INVALID_CATEGORY");
  if (p.collectionId) {
    const c = await pg.collections.getById(p.collectionId);
    if (!c || c.manufacturerId !== manufacturerId) throw new HttpError(400, "INVALID_COLLECTION");
  }
}

export const policies: Record<string, Handler> = {
  /* products */
  "products.list": async (v, [f]) => {
    const filter = parse(input.productFilter, f);
    if (!canSeePrices(v)) {
      delete filter.priceMin;
      delete filter.priceMax;
    }
    return presentAll(v, await pg.products.list(filter));
  },
  /** Catalogue pages count and slice in SQL, so drafts are excluded there (not filtered afterwards). */
  "products.page": async (v, [q]) => {
    const query = parse(input.productPageQuery, q);
    if (!isAdmin(v)) query.publishedOnly = true;
    if (!canSeePrices(v)) {
      delete query.priceMin;
      delete query.priceMax;
    }
    const result = await pg.products.page(query);
    return { ...result, items: result.items.map((p) => present(v, p)) };
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
  "products.create": async (v, [data]) => {
    const user = approved(v, "manufacturer");
    const product = parse(input.productInput(user.companyId), data);
    await checkProductRefs(user.companyId, product);
    return pg.products.create({ ...product, manufacturerId: user.companyId });
  },
  "products.update": async (v, [id, patch]) => {
    const current = await ownedProduct(v, str(id));
    const changes = parse(input.productPatch(current.manufacturerId), patch);
    await checkProductRefs(current.manufacturerId, changes);
    // tiers and MOQ may arrive separately; the stored pair must still agree
    const tiers = changes.priceTiers ?? current.priceTiers;
    if (tiers[0].minQty < (changes.minOrderQty ?? current.minOrderQty)) throw new HttpError(400, "INVALID_INPUT");
    return pg.products.update(current.id, changes);
  },
  "products.remove": async (v, [id]) => {
    await ownedProduct(v, str(id));
    return pg.products.remove(str(id));
  },
  "products.facets": async () => pg.products.facets(),

  /* users */
  "users.list": async (v, [f]) => (admin(v), pg.users.list(parse(input.userFilter, f))),
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
  "users.create": async (v, [data]) => (admin(v), pg.users.create(parse(input.userInput, data))),
  "users.update": async (v, [id, patch]) => {
    const user = signedIn(v);
    const p = parse(input.userPatch, patch);
    if (isAdmin(v)) return pg.users.update(str(id), p);
    if (str(id) !== user.id) throw new HttpError(403, "FORBIDDEN");
    if (!p.name) throw new HttpError(400, "INVALID_INPUT");
    return pg.users.update(user.id, { name: p.name });
  },
  "users.setStatus": async (v, [id, status]) => {
    admin(v);
    if (!["pending", "approved", "suspended"].includes(status as string)) throw new HttpError(400, "INVALID_INPUT");
    return pg.users.setStatus(str(id), status as AccountStatus);
  },

  /* companies */
  "companies.list": async (v, [f]) => {
    const filter = parse(input.companyFilter, f);
    if (!isApproved(v)) filter.verified = true;
    return pg.companies.list(filter);
  },
  "companies.getById": async (v, [id]) => {
    const c = await pg.companies.getById(str(id));
    return c && companyVisible(v, c) ? c : null;
  },
  "companies.create": async (v, [data]) => {
    admin(v);
    return pg.companies.create(parse(input.companyInput, data));
  },
  "companies.update": async (v, [id, patch]) => {
    const asAdmin = isAdmin(v);
    if (!asAdmin && str(id) !== approved(v).companyId) throw new HttpError(403, "FORBIDDEN");
    const changes: Partial<Company> = parse(input.companyPatch(str(id)), patch);
    // verification is the admin's call
    if (!asAdmin) delete changes.verified;
    return pg.companies.update(str(id), changes);
  },

  /* categories */
  "categories.list": async () => pg.categories.list(),
  "categories.getById": async (_v, [id]) => pg.categories.getById(str(id)),
  "categories.create": async (v, [data]) => {
    admin(v);
    const c = parse(input.categoryInput, data);
    if (c.parentId && !(await pg.categories.getById(c.parentId))) throw new HttpError(400, "INVALID_CATEGORY");
    return pg.categories.create(c);
  },
  "categories.update": async (v, [id, patch]) => {
    admin(v);
    const c = parse(input.categoryPatch, patch);
    if (c.parentId && (c.parentId === str(id) || !(await pg.categories.getById(c.parentId)))) throw new HttpError(400, "INVALID_CATEGORY");
    return pg.categories.update(str(id), c);
  },
  "categories.remove": async (v, [id]) => (admin(v), pg.categories.remove(str(id))),

  /* collections */
  "collections.list": async () => pg.collections.list(),
  "collections.listByManufacturer": async (_v, [id]) => pg.collections.listByManufacturer(str(id)),
  "collections.getById": async (_v, [id]) => pg.collections.getById(str(id)),
  "collections.create": async (v, [data]) => {
    const user = approved(v, "manufacturer");
    return pg.collections.create({ ...parse(input.collectionInput(user.companyId), data), manufacturerId: user.companyId });
  },
  "collections.update": async (v, [id, patch]) => {
    const current = await ownedCollection(v, str(id));
    return pg.collections.update(current.id, parse(input.collectionPatch(current.manufacturerId), patch));
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
  "orders.create": async (v, [data]) => {
    const user = approved(v, "retailer");
    const o = parse(input.orderInput, data);
    const products = await pg.products.getMany(o.items.map((i) => i.productId));
    const byId = new Map(products.map((p) => [p.id, p]));
    const items = o.items.map(({ productId, qty }) => {
      const p = byId.get(productId);
      if (!p || !p.published || p.manufacturerId !== o.manufacturerId || qty < p.minOrderQty) throw new HttpError(400, "INVALID_ITEM");
      // Direct orders are priced from the maker's tiers here, never from the browser.
      return o.isRFQ ? { productId: p.id, qty } : { productId: p.id, qty, unitPrice: tierFor(p.priceTiers, qty)?.unitPrice ?? 0 };
    });
    return pg.orders.create({ retailerId: user.companyId, manufacturerId: o.manufacturerId, items, isRFQ: o.isRFQ, note: o.note });
  },
  "orders.submitQuote": async (v, [id, prices]) => {
    const { order, side } = await orderParty(v, str(id));
    if (side !== "manufacturer") throw new HttpError(403, "FORBIDDEN");
    // the repository re-checks the status, and that every line is priced, under a row lock
    return pg.orders.submitQuote(order.id, parse(input.quotePrices, prices));
  },
  "orders.updateStatus": async (v, [id, status]) => {
    const { order, side } = await orderParty(v, str(id));
    // ORDER_TRANSITIONS decides which side may make which move from the current status
    return transitionOrder(order.id, parse(input.orderStatus, status), side);
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
  "notifications.create": async (v, [data]) => (admin(v), pg.notifications.create(parse(input.notificationInput, data))),

  /* analytics */
  "analytics.manufacturerStats": async (v, [id]) => {
    if (isAdmin(v)) return pg.analytics.manufacturerStats(str(id));
    return pg.analytics.manufacturerStats(approved(v, "manufacturer").companyId);
  },
  "analytics.platformStats": async (v) => (admin(v), pg.analytics.platformStats()),
  /** public: only counts and cover images of published products */
  "analytics.catalogSummary": async () => pg.analytics.catalogSummary(),
};
