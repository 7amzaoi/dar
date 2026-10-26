import { defineConfig } from "drizzle-kit";

// Migrations run over the direct (unpooled) connection, as Neon recommends.
export default defineConfig({
  schema: "./lib/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED!.replace("sslmode=require", "sslmode=verify-full") },
  // neon_auth is managed by Neon Auth; never touch it
  schemaFilter: ["public"],
});
