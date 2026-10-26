import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Pooled connection (PgBouncer, `-pooler` host) for application traffic, per the Neon guidance
 * for a Node / Vercel Fluid host. Migrations use DATABASE_URL_UNPOOLED (see drizzle.config.ts).
 * One pool per server process; reused across requests and hot reloads.
 */
const globalForDb = globalThis as unknown as { pgPool?: Pool };

function connectionString() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Run `neon env pull`.");
  // Neon URLs say sslmode=require; verify-full keeps the same checks without pg's warning
  return url.replace("sslmode=require", "sslmode=verify-full");
}

export const pool = globalForDb.pgPool ?? new Pool({ connectionString: connectionString(), max: 10 });
if (process.env.NODE_ENV !== "production") globalForDb.pgPool = pool;

// An idle connection dropping (e.g. compute scaling to zero) must not crash the server
pool.on("error", (error: Error) => console.error("[pg pool]", error.message));

export const sqlDb = drizzle(pool, { schema });
export { schema };
