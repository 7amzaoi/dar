/**
 * Loads the demo catalogue into Lakebase Postgres (idempotent: existing rows are left alone).
 *   npm run db:seed
 * Uses the direct connection; app traffic uses the pooled one.
 * Auth accounts are NOT created here: people sign up through the app, and an account whose
 * email matches a seeded user is linked to that user on first sign-in.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as seed from "../lib/data/seed";
import * as schema from "../lib/server/db/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED!.replace("sslmode=require", "sslmode=verify-full") });
const db = drizzle(pool, { schema });

async function main() {
  const counts: Record<string, number> = {};
  const run = async (name: string, fn: () => Promise<unknown[]>) => {
    counts[name] = (await fn()).length;
  };

  await run("companies", () =>
    db
      .insert(schema.companies)
      .values(
        seed.companies.map((c) => ({
          id: c.id,
          type: c.type,
          name: c.name,
          logo_url: c.logoUrl ?? null,
          country: c.country,
          city: c.city,
          about: c.about,
          about_en: c.aboutEn ?? null,
          phone: c.phone,
          whatsapp: c.whatsapp ?? null,
          verified: c.verified,
        })),
      )
      .onConflictDoNothing()
      .returning({ id: schema.companies.id }),
  );

  await run("app_users", () =>
    db
      .insert(schema.appUsers)
      .values(
        seed.users.map((u) => ({
          id: u.id,
          role: u.role,
          email: u.email.toLowerCase(),
          name: u.name,
          status: u.status,
          company_id: u.companyId || null,
          created_at: new Date(u.createdAt),
        })),
      )
      .onConflictDoNothing()
      .returning({ id: schema.appUsers.id }),
  );

  await run("categories", () =>
    db
      .insert(schema.categories)
      .values(seed.categories.map((c) => ({ id: c.id, name_ar: c.nameAr, name_en: c.nameEn, parent_id: c.parentId ?? null })))
      .onConflictDoNothing()
      .returning({ id: schema.categories.id }),
  );

  await run("collections", () =>
    db
      .insert(schema.collections)
      .values(seed.collections.map((c) => ({ id: c.id, manufacturer_id: c.manufacturerId, name_ar: c.nameAr, name_en: c.nameEn, cover_url: c.coverUrl ?? null })))
      .onConflictDoNothing()
      .returning({ id: schema.collections.id }),
  );

  await run("products", () =>
    db
      .insert(schema.products)
      .values(
        seed.products.map((p) => ({
          id: p.id,
          manufacturer_id: p.manufacturerId,
          title_ar: p.titleAr,
          title_en: p.titleEn,
          description_ar: p.descriptionAr,
          description_en: p.descriptionEn,
          category_id: p.categoryId,
          images: p.images,
          materials: p.materials,
          colors: p.colors,
          dimensions: p.dimensions,
          price_tiers: p.priceTiers,
          base_price: p.priceTiers[0]?.unitPrice ?? 0,
          min_order_qty: p.minOrderQty,
          stock_status: p.stockStatus,
          lead_time_days: p.leadTimeDays ?? null,
          collection_id: p.collectionId ?? null,
          published: p.published,
          created_at: new Date(p.createdAt),
        })),
      )
      .onConflictDoNothing()
      .returning({ id: schema.products.id }),
  );

  await run("favorites", () =>
    db
      .insert(schema.favorites)
      .values(seed.favorites.map((f) => ({ id: f.id, retailer_id: f.retailerId, product_id: f.productId })))
      .onConflictDoNothing()
      .returning({ id: schema.favorites.id }),
  );

  await run("orders", () =>
    db
      .insert(schema.orders)
      .values(
        seed.orders.map((o) => ({
          id: o.id,
          retailer_id: o.retailerId,
          manufacturer_id: o.manufacturerId,
          items: o.items,
          status: o.status,
          is_rfq: o.isRFQ,
          note: o.note ?? null,
          history: o.history ?? [],
          created_at: new Date(o.createdAt),
        })),
      )
      .onConflictDoNothing()
      .returning({ id: schema.orders.id }),
  );

  await run("notifications", () =>
    db
      .insert(schema.notifications)
      .values(
        seed.notifications.map((n) => ({
          id: n.id,
          user_id: n.userId,
          type: n.type,
          body: n.body,
          read: n.read,
          href: n.href ?? null,
          params: n.params ?? null,
          created_at: new Date(n.createdAt),
        })),
      )
      .onConflictDoNothing()
      .returning({ id: schema.notifications.id }),
  );

  console.log("Inserted rows (0 = already present):", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
