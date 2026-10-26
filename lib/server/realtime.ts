import "server-only";
import { createRealtime, rawSql } from "@neon/realtime/server";
import type { User } from "@/lib/data/types";

/**
 * Neon Realtime: live SQL queries sealed here (NEON_REALTIME_SECRET never leaves the server)
 * and subscribed to from the browser. The client only uses them as "something changed" signals
 * and refetches through /api/data, so each query selects just a key plus the columns that change.
 */
const dbName = () => new URL(process.env.DATABASE_URL!).pathname.slice(1) || "neondb";

const globalForRealtime = globalThis as unknown as { realtime?: ReturnType<typeof createRealtime> };
export const realtime = globalForRealtime.realtime ?? createRealtime({ secret: process.env.NEON_REALTIME_SECRET!, db: dbName() });
if (process.env.NODE_ENV !== "production") globalForRealtime.realtime = realtime;

/** The live queries one signed-in account may watch. Parameters come from the session only. */
export function liveQueriesFor(user: User) {
  const queries = {
    // approval / suspension shows up without a reload
    account: rawSql<{ id: string; status: string; role: string }>(`SELECT id, status, role FROM app_users WHERE id = $1`, [user.id]),
    notifications: rawSql<{ id: string; read: boolean }>(`SELECT id, read FROM notifications WHERE user_id = $1`, [user.id]),
  };
  if (user.status !== "approved" || !user.companyId) return queries;
  return {
    ...queries,
    orders: rawSql<{ id: string; status: string }>(`SELECT id, status FROM orders WHERE retailer_id = $1 OR manufacturer_id = $1`, [user.companyId]),
  };
}
