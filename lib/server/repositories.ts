import "server-only";
import { and, arrayOverlaps, asc, desc, eq, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import type {
  AnalyticsRepository,
  Category,
  CategoryRepository,
  Collection,
  CollectionRepository,
  Company,
  CompanyRepository,
  DataSource,
  FavoriteRepository,
  Notification,
  NotificationRepository,
  Order,
  OrderRepository,
  OrderStatus,
  Product,
  ProductFilter,
  ProductPageQuery,
  ProductRepository,
  TimePoint,
  User,
  UserRepository,
} from "@/lib/data/types";
import { ORDER_TRANSITIONS } from "@/lib/data/helpers";
import { sqlDb as db, schema } from "./db";

/**
 * Lakebase Postgres implementation of the DataSource contracts (lib/data/types.ts).
 * Server-only: reached from the browser through app/api/data, which authorizes every call.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

const { companies, appUsers, categories: categoriesT, collections: collectionsT, products: productsT, favorites: favoritesT, orders: ordersT, notifications: notificationsT } = schema;

export function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} ${id} not found`);
    this.name = "NotFoundError";
  }
}

/* ---------------- row mappers (snake_case rows -> domain types) ---------------- */

const iso = (d: Date) => d.toISOString();

function toCompany(r: typeof companies.$inferSelect): Company {
  return {
    id: r.id,
    type: r.type,
    name: r.name,
    logoUrl: r.logo_url ?? undefined,
    country: r.country,
    city: r.city,
    about: r.about,
    aboutEn: r.about_en ?? undefined,
    phone: r.phone,
    whatsapp: r.whatsapp ?? undefined,
    verified: r.verified,
  };
}

function toUser(r: typeof appUsers.$inferSelect): User {
  return { id: r.id, role: r.role, email: r.email, name: r.name, status: r.status, companyId: r.company_id ?? "", createdAt: iso(r.created_at) };
}

const toCategory = (r: typeof categoriesT.$inferSelect): Category => ({ id: r.id, nameAr: r.name_ar, nameEn: r.name_en, parentId: r.parent_id ?? undefined });

const toCollection = (r: typeof collectionsT.$inferSelect): Collection => ({
  id: r.id,
  manufacturerId: r.manufacturer_id,
  nameAr: r.name_ar,
  nameEn: r.name_en,
  coverUrl: r.cover_url ?? undefined,
});

function toProduct(r: typeof productsT.$inferSelect): Product {
  return {
    id: r.id,
    manufacturerId: r.manufacturer_id,
    titleAr: r.title_ar,
    titleEn: r.title_en,
    descriptionAr: r.description_ar,
    descriptionEn: r.description_en,
    categoryId: r.category_id,
    images: r.images,
    materials: r.materials,
    colors: r.colors,
    dimensions: r.dimensions,
    priceTiers: r.price_tiers,
    minOrderQty: r.min_order_qty,
    stockStatus: r.stock_status,
    leadTimeDays: r.lead_time_days ?? undefined,
    collectionId: r.collection_id ?? undefined,
    published: r.published,
    createdAt: iso(r.created_at),
  };
}

function toOrder(r: typeof ordersT.$inferSelect): Order {
  return {
    id: r.id,
    retailerId: r.retailer_id,
    manufacturerId: r.manufacturer_id,
    items: r.items,
    status: r.status,
    isRFQ: r.is_rfq,
    note: r.note ?? undefined,
    createdAt: iso(r.created_at),
    history: r.history,
  };
}

const toNotification = (r: typeof notificationsT.$inferSelect): Notification => ({
  id: r.id,
  userId: r.user_id,
  type: r.type,
  body: r.body,
  read: r.read,
  href: r.href ?? undefined,
  params: r.params ?? undefined,
  createdAt: iso(r.created_at),
});

function productValues(p: Partial<Product>) {
  const v: Partial<typeof productsT.$inferInsert> = {};
  if (p.manufacturerId !== undefined) v.manufacturer_id = p.manufacturerId;
  if (p.titleAr !== undefined) v.title_ar = p.titleAr;
  if (p.titleEn !== undefined) v.title_en = p.titleEn;
  if (p.descriptionAr !== undefined) v.description_ar = p.descriptionAr;
  if (p.descriptionEn !== undefined) v.description_en = p.descriptionEn;
  if (p.categoryId !== undefined) v.category_id = p.categoryId;
  if (p.images !== undefined) v.images = p.images;
  if (p.materials !== undefined) v.materials = p.materials;
  if (p.colors !== undefined) v.colors = p.colors;
  if (p.dimensions !== undefined) v.dimensions = p.dimensions;
  if (p.priceTiers !== undefined) {
    v.price_tiers = p.priceTiers;
    v.base_price = p.priceTiers[0]?.unitPrice ?? 0;
  }
  if (p.minOrderQty !== undefined) v.min_order_qty = p.minOrderQty;
  if (p.stockStatus !== undefined) v.stock_status = p.stockStatus;
  if ("leadTimeDays" in p) v.lead_time_days = p.leadTimeDays ?? null;
  if ("collectionId" in p) v.collection_id = p.collectionId ?? null;
  if (p.published !== undefined) v.published = p.published;
  return v;
}

/* ---------------- notification side effects ---------------- */

type NotificationInput = Omit<Notification, "id" | "read" | "createdAt" | "userId">;

async function notifyCompany(ex: Executor, companyId: string, n: NotificationInput) {
  const members = await ex.select({ id: appUsers.id }).from(appUsers).where(and(eq(appUsers.company_id, companyId), eq(appUsers.status, "approved")));
  if (!members.length) return;
  await ex.insert(notificationsT).values(members.map((m) => ({ id: uid("n"), user_id: m.id, type: n.type, body: n.body, href: n.href ?? null, params: n.params ?? null })));
}

async function notifyAdmins(ex: Executor, n: NotificationInput) {
  const admins = await ex.select({ id: appUsers.id }).from(appUsers).where(eq(appUsers.role, "admin"));
  if (!admins.length) return;
  await ex.insert(notificationsT).values(admins.map((a) => ({ id: uid("n"), user_id: a.id, type: n.type, body: n.body, href: n.href ?? null, params: n.params ?? null })));
}

async function companyName(ex: Executor, id: string) {
  const [c] = await ex.select({ name: companies.name }).from(companies).where(eq(companies.id, id));
  return c?.name ?? id;
}

/* ---------------- repositories ---------------- */

/** WHERE clause shared by products.list and products.page. */
function productWhere(filter: ProductFilter) {
  const { publishedOnly = true } = filter;
  const where: SQL[] = [];
  if (publishedOnly) where.push(eq(productsT.published, true));
  if (filter.categoryId) {
    where.push(
      or(
        eq(productsT.category_id, filter.categoryId),
        inArray(productsT.category_id, db.select({ id: categoriesT.id }).from(categoriesT).where(eq(categoriesT.parent_id, filter.categoryId))),
      )!,
    );
  }
  if (filter.manufacturerId) where.push(eq(productsT.manufacturer_id, filter.manufacturerId));
  if (filter.collectionId) where.push(eq(productsT.collection_id, filter.collectionId));
  if (filter.materials?.length) where.push(arrayOverlaps(productsT.materials, filter.materials));
  if (filter.colors?.length) where.push(arrayOverlaps(productsT.colors, filter.colors));
  if (filter.stockStatus?.length) where.push(inArray(productsT.stock_status, filter.stockStatus));
  if (filter.priceMin != null) where.push(sql`${productsT.base_price} >= ${filter.priceMin}`);
  if (filter.priceMax != null) where.push(sql`${productsT.base_price} <= ${filter.priceMax}`);
  if (filter.countries?.length) {
    where.push(inArray(productsT.manufacturer_id, db.select({ id: companies.id }).from(companies).where(inArray(companies.country, filter.countries))));
  }
  const q = filter.search?.trim();
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    where.push(
      or(
        ilike(productsT.title_ar, like),
        ilike(productsT.title_en, like),
        ilike(productsT.description_ar, like),
        ilike(productsT.description_en, like),
        sql`array_to_string(${productsT.materials}, ' ') ilike ${like}`,
        inArray(productsT.manufacturer_id, db.select({ id: companies.id }).from(companies).where(ilike(companies.name, like))),
      )!,
    );
  }
  return and(...where);
}

/** Sort order; the id tie-break keeps pages stable when many rows share a value. */
function productOrder(sort: ProductFilter["sort"]) {
  const order =
    sort === "price_asc"
      ? [asc(productsT.base_price)]
      : sort === "price_desc"
        ? [desc(productsT.base_price)]
        : sort === "title"
          ? [asc(productsT.title_en)]
          : [desc(productsT.created_at)];
  return [...order, asc(productsT.id)];
}

/** `list` is for small, bounded lists (home, a maker's page); the catalogue uses `page`. */
const LIST_CAP = 500;

const products: ProductRepository = {
  async list(filter: ProductFilter = {}) {
    const rows = await db
      .select()
      .from(productsT)
      .where(productWhere(filter))
      .orderBy(...productOrder(filter.sort))
      .limit(Math.min(filter.limit ?? LIST_CAP, LIST_CAP));
    return rows.map(toProduct);
  },
  async page(query: ProductPageQuery = {}) {
    const page = Math.max(1, Math.floor(query.page ?? 1));
    const pageSize = Math.min(60, Math.max(1, Math.floor(query.pageSize ?? 24)));
    const where = productWhere(query);
    const [rows, [{ total }]] = await Promise.all([
      db.select().from(productsT).where(where).orderBy(...productOrder(query.sort)).limit(pageSize).offset((page - 1) * pageSize),
      db.select({ total: sql<number>`count(*)::int` }).from(productsT).where(where),
    ]);
    return { items: rows.map(toProduct), total, page, pageSize };
  },
  async getById(id) {
    const [r] = await db.select().from(productsT).where(eq(productsT.id, id));
    return r ? toProduct(r) : null;
  },
  async getMany(ids) {
    if (!ids.length) return [];
    return (await db.select().from(productsT).where(inArray(productsT.id, ids))).map(toProduct);
  },
  async listByManufacturer(manufacturerId) {
    return (await db.select().from(productsT).where(eq(productsT.manufacturer_id, manufacturerId)).orderBy(desc(productsT.created_at))).map(toProduct);
  },
  async create(input) {
    const [r] = await db
      .insert(productsT)
      .values({ ...(productValues(input) as typeof productsT.$inferInsert), id: uid("p") })
      .returning();
    return toProduct(r);
  },
  async update(id, patch) {
    const values = productValues(patch);
    const [r] = Object.keys(values).length
      ? await db.update(productsT).set(values).where(eq(productsT.id, id)).returning()
      : await db.select().from(productsT).where(eq(productsT.id, id));
    if (!r) throw new NotFoundError("Product", id);
    return toProduct(r);
  },
  async remove(id) {
    await db.delete(productsT).where(eq(productsT.id, id));
  },
  async facets() {
    const [row] = await db.execute<{ materials: string[] | null; colors: string[] | null; countries: string[] | null; price_max: number | null }>(sql`
      select
        (select array_agg(distinct m order by m) from products, unnest(materials) m where published) as materials,
        (select array_agg(distinct c order by c) from products, unnest(colors) c where published) as colors,
        (select array_agg(distinct co.country order by co.country) from products p join companies co on co.id = p.manufacturer_id where p.published) as countries,
        (select max(base_price) from products where published) as price_max
    `).then((r) => r.rows);
    return {
      materials: row?.materials ?? [],
      colors: row?.colors ?? [],
      countries: row?.countries ?? [],
      priceMax: Math.ceil(Number(row?.price_max ?? 0) / 100) * 100,
    };
  },
};

const users: UserRepository = {
  async list(filter = {}) {
    const where: SQL[] = [];
    if (filter.role) where.push(eq(appUsers.role, filter.role));
    if (filter.status) where.push(eq(appUsers.status, filter.status));
    const q = filter.search?.trim();
    if (q) where.push(or(ilike(appUsers.name, `%${q}%`), ilike(appUsers.email, `%${q}%`))!);
    return (await db.select().from(appUsers).where(and(...where)).orderBy(desc(appUsers.created_at))).map(toUser);
  },
  async getById(id) {
    const [r] = await db.select().from(appUsers).where(eq(appUsers.id, id));
    return r ? toUser(r) : null;
  },
  async getByEmail(email) {
    const [r] = await db.select().from(appUsers).where(sql`lower(${appUsers.email}) = ${email.trim().toLowerCase()}`);
    return r ? toUser(r) : null;
  },
  async listByCompany(companyId) {
    return (await db.select().from(appUsers).where(eq(appUsers.company_id, companyId))).map(toUser);
  },
  async create(input) {
    return db.transaction(async (tx) => {
      const [r] = await tx
        .insert(appUsers)
        .values({ id: uid("u"), role: input.role, email: input.email.trim().toLowerCase(), name: input.name, status: input.status ?? "pending", company_id: input.companyId || null })
        .returning();
      if (r.status === "pending") {
        const name = r.company_id ? await companyName(tx, r.company_id) : r.name;
        await notifyAdmins(tx, { type: "account.pending", body: `${name} applied for a ${r.role} account`, href: "/admin/approvals", params: { company: name } });
      }
      return toUser(r);
    });
  },
  async update(id, patch) {
    const v: Partial<typeof appUsers.$inferInsert> = {};
    if (patch.name !== undefined) v.name = patch.name;
    if (patch.email !== undefined) v.email = patch.email.trim().toLowerCase();
    if (patch.status !== undefined) v.status = patch.status;
    if (patch.role !== undefined) v.role = patch.role;
    const [r] = await db.update(appUsers).set(v).where(eq(appUsers.id, id)).returning();
    if (!r) throw new NotFoundError("User", id);
    return toUser(r);
  },
  async setStatus(id, status) {
    return db.transaction(async (tx) => {
      const [r] = await tx.update(appUsers).set({ status }).where(eq(appUsers.id, id)).returning();
      if (!r) throw new NotFoundError("User", id);
      if (status === "approved") {
        await tx.insert(notificationsT).values({ id: uid("n"), user_id: id, type: "account.approved", body: "Your account has been approved. Welcome to Dār." });
      }
      return toUser(r);
    });
  },
};

const companiesRepo: CompanyRepository = {
  async list(filter = {}) {
    const where: SQL[] = [];
    if (filter.type) where.push(eq(companies.type, filter.type));
    if (filter.verified != null) where.push(eq(companies.verified, filter.verified));
    const q = filter.search?.trim();
    if (q) where.push(or(ilike(companies.name, `%${q}%`), ilike(companies.city, `%${q}%`))!);
    return (await db.select().from(companies).where(and(...where)).orderBy(asc(companies.created_at), asc(companies.id))).map(toCompany);
  },
  async getById(id) {
    const [r] = await db.select().from(companies).where(eq(companies.id, id));
    return r ? toCompany(r) : null;
  },
  async create(input) {
    const [r] = await db
      .insert(companies)
      .values({
        id: uid(input.type === "manufacturer" ? "m" : "r"),
        type: input.type,
        name: input.name,
        logo_url: input.logoUrl ?? null,
        country: input.country,
        city: input.city,
        about: input.about,
        about_en: input.aboutEn ?? null,
        phone: input.phone,
        whatsapp: input.whatsapp ?? null,
        verified: input.verified,
      })
      .returning();
    return toCompany(r);
  },
  async update(id, patch) {
    const v: Partial<typeof companies.$inferInsert> = {};
    if (patch.name !== undefined) v.name = patch.name;
    if (patch.country !== undefined) v.country = patch.country;
    if (patch.city !== undefined) v.city = patch.city;
    if (patch.about !== undefined) v.about = patch.about;
    if ("aboutEn" in patch) v.about_en = patch.aboutEn ?? null;
    if (patch.phone !== undefined) v.phone = patch.phone;
    if ("whatsapp" in patch) v.whatsapp = patch.whatsapp ?? null;
    if ("logoUrl" in patch) v.logo_url = patch.logoUrl ?? null;
    if (patch.verified !== undefined) v.verified = patch.verified;
    const [r] = await db.update(companies).set(v).where(eq(companies.id, id)).returning();
    if (!r) throw new NotFoundError("Company", id);
    return toCompany(r);
  },
};

const categoriesRepo: CategoryRepository = {
  async list() {
    return (await db.select().from(categoriesT).orderBy(asc(categoriesT.id))).map(toCategory);
  },
  async getById(id) {
    const [r] = await db.select().from(categoriesT).where(eq(categoriesT.id, id));
    return r ? toCategory(r) : null;
  },
  async create(input) {
    const [r] = await db.insert(categoriesT).values({ id: uid("c"), name_ar: input.nameAr, name_en: input.nameEn, parent_id: input.parentId ?? null }).returning();
    return toCategory(r);
  },
  async update(id, patch) {
    const v: Partial<typeof categoriesT.$inferInsert> = {};
    if (patch.nameAr !== undefined) v.name_ar = patch.nameAr;
    if (patch.nameEn !== undefined) v.name_en = patch.nameEn;
    if ("parentId" in patch) v.parent_id = patch.parentId ?? null;
    const [r] = await db.update(categoriesT).set(v).where(eq(categoriesT.id, id)).returning();
    if (!r) throw new NotFoundError("Category", id);
    return toCategory(r);
  },
  async remove(id) {
    const [{ n }] = (
      await db.execute<{ n: number }>(sql`select (select count(*) from products where category_id = ${id}) + (select count(*) from categories where parent_id = ${id}) as n`)
    ).rows;
    if (Number(n) > 0) throw new Error("CATEGORY_IN_USE");
    await db.delete(categoriesT).where(eq(categoriesT.id, id));
  },
};

const collectionsRepo: CollectionRepository = {
  async list() {
    return (await db.select().from(collectionsT)).map(toCollection);
  },
  async listByManufacturer(manufacturerId) {
    return (await db.select().from(collectionsT).where(eq(collectionsT.manufacturer_id, manufacturerId))).map(toCollection);
  },
  async getById(id) {
    const [r] = await db.select().from(collectionsT).where(eq(collectionsT.id, id));
    return r ? toCollection(r) : null;
  },
  async create(input) {
    const [r] = await db
      .insert(collectionsT)
      .values({ id: uid("col"), manufacturer_id: input.manufacturerId, name_ar: input.nameAr, name_en: input.nameEn, cover_url: input.coverUrl ?? null })
      .returning();
    return toCollection(r);
  },
  async update(id, patch) {
    const v: Partial<typeof collectionsT.$inferInsert> = {};
    if (patch.nameAr !== undefined) v.name_ar = patch.nameAr;
    if (patch.nameEn !== undefined) v.name_en = patch.nameEn;
    if ("coverUrl" in patch) v.cover_url = patch.coverUrl ?? null;
    const [r] = await db.update(collectionsT).set(v).where(eq(collectionsT.id, id)).returning();
    if (!r) throw new NotFoundError("Collection", id);
    return toCollection(r);
  },
  async remove(id) {
    await db.transaction(async (tx) => {
      await tx.update(productsT).set({ collection_id: null }).where(eq(productsT.collection_id, id));
      await tx.delete(collectionsT).where(eq(collectionsT.id, id));
    });
  },
};

const favoritesRepo: FavoriteRepository = {
  async listByRetailer(retailerId) {
    return (await db.select().from(favoritesT).where(eq(favoritesT.retailer_id, retailerId))).map((r) => ({ id: r.id, retailerId: r.retailer_id, productId: r.product_id }));
  },
  async toggle(retailerId, productId) {
    const removed = await db
      .delete(favoritesT)
      .where(and(eq(favoritesT.retailer_id, retailerId), eq(favoritesT.product_id, productId)))
      .returning({ id: favoritesT.id });
    if (removed.length) return false;
    await db.insert(favoritesT).values({ id: uid("f"), retailer_id: retailerId, product_id: productId }).onConflictDoNothing();
    return true;
  },
  async remove(retailerId, productId) {
    await db.delete(favoritesT).where(and(eq(favoritesT.retailer_id, retailerId), eq(favoritesT.product_id, productId)));
  },
};

const ordersRepo: OrderRepository = {
  async list() {
    return (await db.select().from(ordersT).orderBy(desc(ordersT.created_at))).map(toOrder);
  },
  async getById(id) {
    const [r] = await db.select().from(ordersT).where(eq(ordersT.id, id));
    return r ? toOrder(r) : null;
  },
  async listByRetailer(retailerId) {
    return (await db.select().from(ordersT).where(eq(ordersT.retailer_id, retailerId)).orderBy(desc(ordersT.created_at))).map(toOrder);
  },
  async listByManufacturer(manufacturerId) {
    return (await db.select().from(ordersT).where(eq(ordersT.manufacturer_id, manufacturerId)).orderBy(desc(ordersT.created_at))).map(toOrder);
  },
  async create(input) {
    return db.transaction(async (tx) => {
      const status: OrderStatus = input.isRFQ ? "quote_requested" : "confirmed";
      const items = input.isRFQ ? input.items.map(({ productId, qty }) => ({ productId, qty })) : input.items;
      const [r] = await tx
        .insert(ordersT)
        .values({
          id: `o-${crypto.randomUUID().slice(0, 6)}`,
          retailer_id: input.retailerId,
          manufacturer_id: input.manufacturerId,
          items,
          status,
          is_rfq: input.isRFQ,
          note: input.note ?? null,
          history: [{ status, at: new Date().toISOString() }],
        })
        .returning();
      const retailer = await companyName(tx, input.retailerId);
      await notifyCompany(tx, input.manufacturerId, {
        type: input.isRFQ ? "order.rfq" : "order.new",
        body: `${input.isRFQ ? "New quote request" : "New order"} ${r.id} from ${retailer}`,
        href: `/manufacturer/orders/${r.id}`,
        params: { order: r.id, company: retailer },
      });
      return toOrder(r);
    });
  },
  async submitQuote(id, prices) {
    return db.transaction(async (tx) => {
      const [o] = await tx.select().from(ordersT).where(eq(ordersT.id, id)).for("update");
      if (!o) throw new NotFoundError("Order", id);
      // checked under the row lock, so two quotes (or a quote racing a cancel) can't both land
      if (o.status !== "quote_requested") throw new Error("INVALID_STATE");
      if (o.items.some((item) => !(prices[item.productId] > 0))) throw new Error("QUOTE_INCOMPLETE");
      const items = o.items.map((item) => ({ ...item, unitPrice: prices[item.productId] }));
      const [r] = await tx
        .update(ordersT)
        .set({ items, status: "quoted", history: [...o.history, { status: "quoted", at: new Date().toISOString() }] })
        .where(eq(ordersT.id, id))
        .returning();
      const maker = await companyName(tx, o.manufacturer_id);
      await notifyCompany(tx, o.retailer_id, { type: "order.quoted", body: `${maker} sent a quote for ${id}`, href: `/retailer/orders/${id}`, params: { order: id, company: maker } });
      return toOrder(r);
    });
  },
  async updateStatus(id, status) {
    return transitionOrder(id, status, "admin");
  },
};

/**
 * Moves an order along ORDER_TRANSITIONS on behalf of one side, under a row lock, and tells
 * the other side. Throws INVALID_TRANSITION when that side may not make this move from the current status.
 */
export async function transitionOrder(id: string, status: OrderStatus, actor: "retailer" | "manufacturer" | "admin") {
  return db.transaction(async (tx) => {
    const [o] = await tx.select().from(ordersT).where(eq(ordersT.id, id)).for("update");
    if (!o) throw new NotFoundError("Order", id);
    const moves = ORDER_TRANSITIONS[o.status];
    const allowed = actor === "admin" ? [...moves.retailer, ...moves.manufacturer] : moves[actor];
    if (!allowed.includes(status)) throw new Error("INVALID_TRANSITION");
    const [r] = await tx
      .update(ordersT)
      .set({ status, history: [...o.history, { status, at: new Date().toISOString() }] })
      .where(eq(ordersT.id, id))
      .returning();
    // the side that didn't act hears about it (both, when an admin acted)
    const notify: ("retailer" | "manufacturer")[] = actor === "admin" ? ["retailer", "manufacturer"] : actor === "retailer" ? ["manufacturer"] : ["retailer"];
    for (const side of notify) {
      await notifyCompany(tx, side === "retailer" ? o.retailer_id : o.manufacturer_id, {
        type: "order.status",
        body: `Order ${id} is now ${status.replace(/_/g, " ")}`,
        href: `/${side}/orders/${id}`,
        params: { order: id, status },
      });
    }
    return toOrder(r);
  });
}

const notificationsRepo: NotificationRepository = {
  async listByUser(userId) {
    return (await db.select().from(notificationsT).where(eq(notificationsT.user_id, userId)).orderBy(desc(notificationsT.created_at))).map(toNotification);
  },
  async unreadCount(userId) {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(notificationsT).where(and(eq(notificationsT.user_id, userId), eq(notificationsT.read, false)));
    return n;
  },
  async markRead(id) {
    await db.update(notificationsT).set({ read: true }).where(eq(notificationsT.id, id));
  },
  async markAllRead(userId) {
    await db.update(notificationsT).set({ read: true }).where(and(eq(notificationsT.user_id, userId), ne(notificationsT.read, true)));
  },
  async create(input) {
    const [r] = await db
      .insert(notificationsT)
      .values({ id: uid("n"), user_id: input.userId, type: input.type, body: input.body, href: input.href ?? null, params: input.params ?? null })
      .returning();
    return toNotification(r);
  },
};

/* ---------------- analytics ---------------- */

/** Deterministic pseudo-random generator so charts are stable between renders. */
function seeded(seedText: string) {
  let h = 2166136261;
  for (const ch of seedText) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function dayLabel(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

const OPEN: OrderStatus[] = ["quote_requested", "quoted", "confirmed", "in_production", "shipped"];
const BOOKED: OrderStatus[] = ["confirmed", "in_production", "shipped", "completed"];
const ALL_STATUSES: OrderStatus[] = ["quote_requested", "quoted", "confirmed", "in_production", "shipped", "completed", "cancelled"];

const inList = (values: string[]) => sql`(${sql.join(
  values.map((v) => sql`${v}`),
  sql`, `,
)})`;

/**
 * Every order line with its unit price, the SQL twin of orderTotal() in lib/data/helpers.ts:
 * the price on the order (quoted or ordered), else the product's tier for that quantity
 * (the highest minQty not above it, else the lowest tier), else 0.
 */
const orderLines = sql`
  select o.id as order_id, o.manufacturer_id, o.status,
    (item->>'qty')::numeric as qty,
    coalesce((item->>'unitPrice')::numeric, tier.unit_price, 0) as unit
  from orders o
  cross join lateral jsonb_array_elements(o.items) item
  left join products p on p.id = item->>'productId'
  left join lateral (
    select (t->>'unitPrice')::numeric as unit_price
    from jsonb_array_elements(p.price_tiers) t
    order by ((t->>'minQty')::numeric <= (item->>'qty')::numeric) desc,
      case when (t->>'minQty')::numeric <= (item->>'qty')::numeric then -(t->>'minQty')::numeric else (t->>'minQty')::numeric end
    limit 1
  ) tier on true`;

const rowsOf = async <T extends Record<string, unknown>>(query: SQL) => (await db.execute<T>(query)).rows;

// TODO(backend): catalogue views need a real event pipeline; the series below is synthetic.
const analytics: AnalyticsRepository = {
  async manufacturerStats(manufacturerId) {
    const [[counts], statusRows, [pipeline]] = await Promise.all([
      rowsOf<{ published: number; drafts: number }>(sql`
        select count(*) filter (where published)::int as published, count(*) filter (where not published)::int as drafts
        from products where manufacturer_id = ${manufacturerId}`),
      rowsOf<{ status: OrderStatus; n: number }>(sql`select status, count(*)::int as n from orders where manufacturer_id = ${manufacturerId} group by status`),
      rowsOf<{ open: number; value: number }>(sql`
        with lines as (${orderLines})
        select (select count(*) from orders where manufacturer_id = ${manufacturerId} and status in ${inList(OPEN)})::int as open,
          coalesce(sum(qty * unit), 0)::float8 as value
        from lines where manufacturer_id = ${manufacturerId} and status in ${inList(OPEN)}`),
    ]);
    const rand = seeded(manufacturerId);
    const base = 30 + counts.published * 9;
    const viewsSeries: TimePoint[] = Array.from({ length: 30 }, (_, i) => {
      const weekday = new Date(dayLabel(29 - i)).getDay();
      const weekend = weekday === 5 || weekday === 6 ? 0.72 : 1;
      return { label: dayLabel(29 - i), value: Math.round((base + i * 1.6 + rand() * base * 0.6) * weekend) };
    });
    const byStatus = new Map(statusRows.map((r) => [r.status, r.n]));
    return {
      views30d: viewsSeries.reduce((s, p) => s + p.value, 0),
      viewsSeries,
      publishedProducts: counts.published,
      draftProducts: counts.drafts,
      openOrders: pipeline.open,
      pipelineValue: pipeline.value,
      ordersByStatus: Object.fromEntries(ALL_STATUSES.map((s) => [s, byStatus.get(s) ?? 0])) as Record<OrderStatus, number>,
    };
  },
  async platformStats() {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - (5 - i));
      return d.toISOString().slice(0, 7);
    });
    const [[totals], monthRows, categoryRows, makerRows] = await Promise.all([
      rowsOf<{ manufacturers: number; retailers: number; pending: number; products: number; published: number; orders: number; gmv: number }>(sql`
        with lines as (${orderLines})
        select
          (select count(*) from companies where type = 'manufacturer')::int as manufacturers,
          (select count(*) from companies where type = 'retailer')::int as retailers,
          (select count(*) from app_users where status = 'pending')::int as pending,
          (select count(*) from products)::int as products,
          (select count(*) from products where published)::int as published,
          (select count(*) from orders)::int as orders,
          (select coalesce(sum(qty * unit), 0) from lines where status in ${inList(BOOKED)})::float8 as gmv`),
      rowsOf<{ month: string; n: number }>(sql`
        select to_char(created_at at time zone 'UTC', 'YYYY-MM') as month, count(*)::int as n
        from orders where to_char(created_at at time zone 'UTC', 'YYYY-MM') in ${inList(months)} group by 1`),
      // a top-level category counts its own products and its direct children's
      rowsOf<{ label: string; value: number }>(sql`
        select c.id as label,
          (select count(*) from products p
            where p.category_id = c.id or p.category_id in (select s.id from categories s where s.parent_id = c.id))::int as value
        from categories c where c.parent_id is null order by c.id`),
      rowsOf<{ company_id: string; name: string; orders: number; value: number }>(sql`
        with lines as (${orderLines}),
          booked as (select manufacturer_id, sum(qty * unit) as value from lines where status in ${inList(BOOKED)} group by 1),
          counted as (select manufacturer_id, count(*) as n from orders group by 1)
        select c.id as company_id, c.name, coalesce(counted.n, 0)::int as orders, coalesce(booked.value, 0)::float8 as value
        from companies c
        left join counted on counted.manufacturer_id = c.id
        left join booked on booked.manufacturer_id = c.id
        where c.type = 'manufacturer' and c.verified
        order by value desc, c.created_at, c.id
        limit 5`),
    ]);
    const rand = seeded("platform");
    const perMonth = new Map(monthRows.map((r) => [r.month, r.n]));
    return {
      manufacturers: totals.manufacturers,
      retailers: totals.retailers,
      pendingApprovals: totals.pending,
      products: totals.products,
      publishedProducts: totals.published,
      orders: totals.orders,
      gmv: totals.gmv,
      ordersSeries: months.map((m, i) => ({ label: m, value: Math.round(18 + i * 6 + rand() * 8) + (perMonth.get(m) ?? 0) })),
      productsByCategory: categoryRows,
      topManufacturers: makerRows.map((r) => ({ companyId: r.company_id, name: r.name, orders: r.orders, value: r.value })),
    };
  },
  async catalogSummary() {
    const [[totals], collectionRows, makerRows] = await Promise.all([
      rowsOf<{ published: number; avg_lead: number }>(sql`
        select count(*)::int as published,
          round(coalesce(sum(coalesce(lead_time_days, 0)), 0)::numeric / greatest(count(*), 1))::int as avg_lead
        from products where published`),
      rowsOf<{ collection_id: string; n: number }>(sql`
        select collection_id, count(*)::int as n from products where published and collection_id is not null group by 1`),
      // cover images newest first, the catalogue's default order
      rowsOf<{ manufacturer_id: string; n: number; images: string[] }>(sql`
        select manufacturer_id, count(*)::int as n,
          (array_agg(images->>0 order by created_at desc, id asc))[1:3] as images
        from products where published group by 1`),
    ]);
    return {
      publishedProducts: totals.published,
      avgLeadTimeDays: totals.avg_lead,
      productsByCollection: Object.fromEntries(collectionRows.map((r) => [r.collection_id, r.n])),
      makers: Object.fromEntries(makerRows.map((r) => [r.manufacturer_id, { products: r.n, images: r.images.filter(Boolean) }])),
    };
  },
};

/** Server-side data source. `subscribe` lives on the client (Realtime-driven). */
export const pg: Omit<DataSource, "subscribe"> = {
  products,
  users,
  companies: companiesRepo,
  categories: categoriesRepo,
  collections: collectionsRepo,
  favorites: favoritesRepo,
  orders: ordersRepo,
  notifications: notificationsRepo,
  analytics,
};

/**
 * Links a Managed Better Auth user to the seeded app user with the same email (first sign-in).
 * Production only links verified emails, so nobody can claim a seeded account by signing up with its address.
 */
export async function findOrLinkAppUser(authUserId: string, email: string, emailVerified: boolean): Promise<User | null> {
  const [linked] = await db.select().from(appUsers).where(eq(appUsers.auth_user_id, authUserId));
  if (linked) return toUser(linked);
  if (!emailVerified && process.env.NODE_ENV === "production") return null;
  const [byEmail] = await db
    .update(appUsers)
    .set({ auth_user_id: authUserId })
    .where(and(sql`lower(${appUsers.email}) = ${email.trim().toLowerCase()}`, sql`${appUsers.auth_user_id} is null`))
    .returning();
  return byEmail ? toUser(byEmail) : null;
}

/** Registration: company + pending app user, linked to the auth account, in one transaction. */
export async function registerAppUser(input: {
  authUserId: string;
  email: string;
  name: string;
  role: "manufacturer" | "retailer";
  company: { name: string; country: string; city: string; phone: string; whatsapp?: string; about: string };
}): Promise<User> {
  return db.transaction(async (tx) => {
    const [company] = await tx
      .insert(companies)
      .values({
        id: uid(input.role === "manufacturer" ? "m" : "r"),
        type: input.role,
        name: input.company.name,
        country: input.company.country,
        city: input.company.city,
        phone: input.company.phone,
        whatsapp: input.company.whatsapp || null,
        about: input.company.about,
        verified: false,
      })
      .returning();
    const [user] = await tx
      .insert(appUsers)
      .values({ id: uid("u"), auth_user_id: input.authUserId, role: input.role, email: input.email.trim().toLowerCase(), name: input.name, status: "pending", company_id: company.id })
      .returning();
    await notifyAdmins(tx, { type: "account.pending", body: `${company.name} applied for a ${input.role} account`, href: "/admin/approvals", params: { company: company.name } });
    return toUser(user);
  });
}
