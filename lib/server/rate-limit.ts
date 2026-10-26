import "server-only";
import { sql } from "drizzle-orm";
import { sqlDb } from "./db";

/**
 * Rate limiting.
 * - `limit()` is a fixed-window counter in Postgres (rate_limits), so it holds across every
 *   server instance. Used for sign-in/sign-up/codes, registration, uploads and writes.
 * - `limitLocal()` is an in-memory counter for high-volume reads, where a database round trip
 *   per request would cost more than it saves. It is per instance, so it is approximate.
 */

export interface Rule {
  /** requests allowed per window */
  max: number;
  /** window length in seconds */
  window: number;
}

export const RULES = {
  signIn: { max: 10, window: 10 * 60 },
  signUp: { max: 5, window: 60 * 60 },
  emailCode: { max: 5, window: 15 * 60 },
  register: { max: 5, window: 60 * 60 },
  accountCheck: { max: 10, window: 10 * 60 },
  upload: { max: 60, window: 60 * 60 },
  write: { max: 120, window: 60 },
  read: { max: 600, window: 60 },
} satisfies Record<string, Rule>;

/** Client address as seen by the first proxy in front of the app (Vercel/Cloudflare set these). */
export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

/** Counts one request against `key`; returns seconds to wait when over the limit, else null. */
export async function limit(key: string, rule: Rule): Promise<number | null> {
  try {
    return await count(key, rule);
  } catch (error) {
    // Fail open: a missing table (migration not applied) or a database hiccup must not take
    // sign-in and every write down with it.
    console.error("[rate-limit] skipped:", error instanceof Error ? error.message : error);
    return null;
  }
}

async function count(key: string, rule: Rule): Promise<number | null> {
  const { rows } = await sqlDb.execute<{ count: number; retry_after: number }>(sql`
    insert into rate_limits (key, window_start, count) values (${key}, now(), 1)
    on conflict (key) do update set
      count = case when rate_limits.window_start <= now() - make_interval(secs => ${rule.window}) then 1 else rate_limits.count + 1 end,
      window_start = case when rate_limits.window_start <= now() - make_interval(secs => ${rule.window}) then now() else rate_limits.window_start end
    returning count, ceil(extract(epoch from (window_start + make_interval(secs => ${rule.window}) - now())))::int as retry_after
  `);
  // occasionally drop windows that ended long ago, so the table stays small
  if (Math.random() < 0.01) void sqlDb.execute(sql`delete from rate_limits where window_start < now() - interval '1 day'`).catch(() => {});
  const row = rows[0];
  return row && row.count > rule.max ? Math.max(1, row.retry_after) : null;
}

const local = new Map<string, { start: number; count: number }>();

export function limitLocal(key: string, rule: Rule): number | null {
  const now = Date.now();
  const entry = local.get(key);
  if (!entry || now - entry.start >= rule.window * 1000) {
    if (local.size > 10_000) local.clear();
    local.set(key, { start: now, count: 1 });
    return null;
  }
  entry.count += 1;
  return entry.count > rule.max ? Math.ceil((entry.start + rule.window * 1000 - now) / 1000) : null;
}

export function tooManyRequests(retryAfter: number) {
  return Response.json({ error: "RATE_LIMITED" }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
}
