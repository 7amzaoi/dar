import { auth } from "@/lib/server/auth";

/** Bounces signed-out visitors away from the dashboards. Role/status checks happen per request in app/api/*. */
export default auth.middleware({ loginUrl: "/login" });

export const config = {
  matcher: ["/manufacturer/:path*", "/retailer/:path*", "/admin/:path*"],
};
