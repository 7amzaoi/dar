import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/server/auth";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const requireSession = auth.middleware({ loginUrl: "/login" });

/**
 * - /api/*: state-changing requests must come from this site (CSRF). Browsers always send
 *   Origin on POST, and Sec-Fetch-Site on top of it, so a cross-site form or fetch is refused
 *   even if the session cookie would have been attached.
 * - Dashboards: signed-out visitors go to /login. Role/status checks happen per request in app/api/*.
 */
export default async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    if (SAFE_METHODS.has(request.method)) return NextResponse.next();
    const origin = request.headers.get("origin");
    const site = request.headers.get("sec-fetch-site");
    if ((origin && origin !== request.nextUrl.origin) || (site && site !== "same-origin")) {
      return NextResponse.json({ error: "CROSS_SITE_REQUEST" }, { status: 403 });
    }
    return NextResponse.next();
  }
  return requireSession(request);
}

export const config = {
  matcher: ["/api/:path*", "/manufacturer/:path*", "/retailer/:path*", "/admin/:path*"],
};
