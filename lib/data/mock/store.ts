import type {
  Category,
  Collection,
  Company,
  Conversation,
  Favorite,
  Message,
  Notification,
  Order,
  Product,
  User,
} from "../types";
import * as seed from "./seed";

/**
 * In-memory tables backing the mock repositories.
 *
 * TODO(backend): this whole module disappears when a real database is plugged in.
 * Mutations are mirrored to localStorage purely so the demo survives a page reload.
 */
export interface Tables {
  users: User[];
  companies: Company[];
  categories: Category[];
  collections: Collection[];
  products: Product[];
  favorites: Favorite[];
  orders: Order[];
  conversations: Conversation[];
  messages: Message[];
  notifications: Notification[];
  /** `${conversationId}:${userId}` -> ISO time the user last read the thread */
  reads: Record<string, string>;
}

const STORAGE_KEY = "dar.mockdb.v1";

function fromSeed(): Tables {
  return structuredClone({
    users: seed.users,
    companies: seed.companies,
    categories: seed.categories,
    collections: seed.collections,
    products: seed.products,
    favorites: seed.favorites,
    orders: seed.orders,
    conversations: seed.conversations,
    messages: seed.messages,
    notifications: seed.notifications,
    reads: {},
  });
}

function load(): Tables {
  if (typeof window === "undefined") return fromSeed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...fromSeed(), ...(JSON.parse(raw) as Partial<Tables>) };
  } catch {
    // corrupted or blocked storage — fall back to seed
  }
  return fromSeed();
}

let tables: Tables | null = null;
const listeners = new Set<() => void>();

export function getTables(): Tables {
  if (!tables) tables = load();
  return tables;
}

function persist() {
  if (typeof window === "undefined" || !tables) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
  } catch {
    // quota / private mode — the demo still works in memory
  }
}

/** Apply a mutation, persist, and notify subscribers. */
export function mutate<T>(fn: (t: Tables) => T): T {
  const result = fn(getTables());
  persist();
  // notify after the current task so callers can finish their own state updates first
  queueMicrotask(() => listeners.forEach((l) => l()));
  return result;
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetMockData() {
  tables = fromSeed();
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  listeners.forEach((l) => l());
}

/* ---------- helpers shared by the repositories ---------- */

/** Simulated network latency so loading states are visible and realistic. */
export function latency<T>(value: T, ms = 160 + Math.random() * 220): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), ms));
}

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

export function now() {
  return new Date().toISOString();
}

export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} ${id} not found`);
    this.name = "NotFoundError";
  }
}
