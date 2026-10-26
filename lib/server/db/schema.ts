import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { Dimensions, OrderHistoryEntry, OrderItem, PriceTier } from "../../data/types";

/**
 * Application tables on Lakebase Postgres. Managed Better Auth keeps its own
 * users and sessions in the `neon_auth` schema; `app_users.auth_user_id` links to them.
 * Column names are snake_case so Realtime's live queries map 1:1 to columns.
 */

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const companies = pgTable("companies", {
  id: text("id").primaryKey(),
  type: text("type", { enum: ["manufacturer", "retailer"] }).notNull(),
  name: text("name").notNull(),
  logo_url: text("logo_url"),
  country: text("country").notNull(),
  city: text("city").notNull(),
  about: text("about").notNull(),
  about_en: text("about_en"),
  phone: text("phone").notNull(),
  whatsapp: text("whatsapp"),
  verified: boolean("verified").notNull().default(false),
  created_at: createdAt(),
});

export const appUsers = pgTable(
  "app_users",
  {
    id: text("id").primaryKey(),
    /** neon_auth.user.id once the person has signed up / signed in */
    auth_user_id: uuid("auth_user_id"),
    role: text("role", { enum: ["manufacturer", "retailer", "admin"] }).notNull(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    status: text("status", { enum: ["pending", "approved", "suspended"] }).notNull().default("pending"),
    /** null for platform admins */
    company_id: text("company_id").references(() => companies.id),
    created_at: createdAt(),
  },
  (t) => [uniqueIndex("app_users_email_idx").on(sql`lower(${t.email})`), uniqueIndex("app_users_auth_user_idx").on(t.auth_user_id)],
);

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  name_ar: text("name_ar").notNull(),
  name_en: text("name_en").notNull(),
  parent_id: text("parent_id"),
});

export const collections = pgTable(
  "collections",
  {
    id: text("id").primaryKey(),
    manufacturer_id: text("manufacturer_id").notNull().references(() => companies.id),
    name_ar: text("name_ar").notNull(),
    name_en: text("name_en").notNull(),
    cover_url: text("cover_url"),
  },
  (t) => [index("collections_manufacturer_idx").on(t.manufacturer_id)],
);

export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    manufacturer_id: text("manufacturer_id").notNull().references(() => companies.id),
    title_ar: text("title_ar").notNull(),
    title_en: text("title_en").notNull(),
    description_ar: text("description_ar").notNull(),
    description_en: text("description_en").notNull(),
    category_id: text("category_id").notNull(),
    images: jsonb("images").$type<string[]>().notNull(),
    materials: text("materials").array().notNull(),
    colors: text("colors").array().notNull(),
    dimensions: jsonb("dimensions").$type<Dimensions>().notNull(),
    price_tiers: jsonb("price_tiers").$type<PriceTier[]>().notNull(),
    /** first tier's unit price, kept for SQL filtering and sorting */
    base_price: integer("base_price").notNull(),
    min_order_qty: integer("min_order_qty").notNull(),
    stock_status: text("stock_status", { enum: ["in_stock", "made_to_order", "out_of_stock"] }).notNull(),
    lead_time_days: integer("lead_time_days"),
    collection_id: text("collection_id"),
    published: boolean("published").notNull().default(false),
    created_at: createdAt(),
  },
  (t) => [index("products_manufacturer_idx").on(t.manufacturer_id), index("products_category_idx").on(t.category_id)],
);

export const favorites = pgTable(
  "favorites",
  {
    id: text("id").primaryKey(),
    retailer_id: text("retailer_id").notNull().references(() => companies.id),
    product_id: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("favorites_retailer_product_idx").on(t.retailer_id, t.product_id)],
);

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    retailer_id: text("retailer_id").notNull().references(() => companies.id),
    manufacturer_id: text("manufacturer_id").notNull().references(() => companies.id),
    items: jsonb("items").$type<OrderItem[]>().notNull(),
    status: text("status", { enum: ["quote_requested", "quoted", "confirmed", "in_production", "shipped", "completed", "cancelled"] }).notNull(),
    is_rfq: boolean("is_rfq").notNull(),
    note: text("note"),
    history: jsonb("history").$type<OrderHistoryEntry[]>().notNull().default([]),
    created_at: createdAt(),
  },
  (t) => [index("orders_retailer_idx").on(t.retailer_id), index("orders_manufacturer_idx").on(t.manufacturer_id)],
);

/** Fixed-window request counters (lib/server/rate-limit.ts). Shared by every server instance. */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  window_start: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
  count: integer("count").notNull().default(0),
});

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    body: text("body").notNull(),
    read: boolean("read").notNull().default(false),
    href: text("href"),
    params: jsonb("params").$type<Record<string, string>>(),
    created_at: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.user_id)],
);
