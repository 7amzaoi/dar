import type { DataSource } from "./types";

/**
 * Browser DataSource: every repository call is a POST to /api/data, which checks the
 * session and authorizes it (lib/server/policy.ts) before touching Postgres.
 * `subscribe` fires after this tab's own writes and on Realtime changes (lib/realtime).
 */

const listeners = new Set<() => void>();

export function emitChange() {
  for (const l of listeners) l();
}

const READS = new Set([
  "list",
  "getById",
  "getMany",
  "getByEmail",
  "listByManufacturer",
  "listByRetailer",
  "listByCompany",
  "listByUser",
  "unreadCount",
  "facets",
  "manufacturerStats",
  "platformStats",
]);

async function call(repo: string, method: string, args: unknown[]) {
  const res = await fetch("/api/data", {
    method: "POST",
    headers: { "content-type": "application/json" },
    // undefined fields become null so a cleared optional field (e.g. collectionId) reaches the server
    body: JSON.stringify({ repo, method, args }, (_key, value: unknown) => (value === undefined ? null : value)),
  });
  const body = (await res.json().catch(() => ({ error: "BAD_RESPONSE" }))) as { data?: unknown; error?: string };
  if (!res.ok || body.error) throw new Error(body.error ?? `HTTP_${res.status}`);
  if (!READS.has(method)) emitChange();
  return body.data;
}

function repo<K extends Exclude<keyof DataSource, "subscribe">>(name: K): DataSource[K] {
  return new Proxy({} as DataSource[K], {
    get: (_target, method) => (typeof method === "string" ? (...args: unknown[]) => call(name, method, args) : undefined),
  });
}

export const httpDataSource: DataSource = {
  products: repo("products"),
  users: repo("users"),
  companies: repo("companies"),
  categories: repo("categories"),
  collections: repo("collections"),
  favorites: repo("favorites"),
  orders: repo("orders"),
  notifications: repo("notifications"),
  analytics: repo("analytics"),
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
