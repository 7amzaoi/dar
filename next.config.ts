import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
/** the browser opens a WebSocket to Neon Realtime */
const realtimeOrigin = process.env.NEXT_PUBLIC_NEON_REALTIME_URL ? new URL(process.env.NEXT_PUBLIC_NEON_REALTIME_URL).origin : "";

/**
 * Content Security Policy. Next.js inlines its bootstrap scripts, so script-src needs
 * 'unsafe-inline' (a nonce-based policy would force every page to render dynamically).
 * Images: placeholders are local; uploads redirect to presigned URLs on the branch's Neon storage host.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.storage.c-6.us-east-2.aws.neon.tech",
  "font-src 'self' data: https://db.onlinewebfonts.com",
  "media-src 'self'",
  `connect-src 'self'${realtimeOrigin ? ` ${realtimeOrigin}` : ""}${isDev ? " ws:" : ""}`,
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // browsers ignore HSTS over plain http, so this only takes effect once deployed on https
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // cacheComponents / partial prefetching stay off: every data view is still client-rendered
  // through /api/data. Revisit when public pages move to server components.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
