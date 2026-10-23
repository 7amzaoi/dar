import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents / partial prefetching are left off for Phase 1: every data view is
  // client-rendered against the mock data layer. Revisit when real server data arrives.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
