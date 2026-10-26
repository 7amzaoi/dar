import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";

/** Managed Better Auth (Neon Auth). Sessions live in the `neon_auth` schema; cookies are cached and signed here. */
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
});
