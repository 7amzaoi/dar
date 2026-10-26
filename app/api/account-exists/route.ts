import { sql } from "drizzle-orm";
import { z } from "zod";
import { sqlDb } from "@/lib/server/db";
import { clientIp, limit, RULES, tooManyRequests } from "@/lib/server/rate-limit";

const body = z.object({ email: z.email().max(200) });

/**
 * Whether a sign-in identity exists for this email, so the forgot-password page can say
 * "no account with this email" instead of silently waiting for a code that never comes.
 * This reveals membership, but /register already does (EMAIL_TAKEN), so it adds no new exposure.
 * Rate-limited per address so it cannot be used to sweep an email list.
 */
export async function POST(request: Request) {
  const wait = await limit(`account-check:${clientIp(request)}`, RULES.accountCheck);
  if (wait) return tooManyRequests(wait);
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  const { rows } = await sqlDb.execute<{ exists: boolean }>(
    sql`select exists(select 1 from neon_auth."user" where lower(email) = ${parsed.data.email.trim().toLowerCase()}) as exists`,
  );
  return Response.json({ exists: rows[0]?.exists === true }, { headers: { "Cache-Control": "no-store" } });
}
