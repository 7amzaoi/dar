"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/data";

/* ------------------------------------------------------------------ */
/* Quote list (RFQ cart)                                               */
/* ------------------------------------------------------------------ */

export interface RfqLine {
  productId: string;
  qty: number;
  /** the showroom's choice among the product's colours */
  color?: string;
  /** free-text detail for this piece (fabric code, leg finish…) */
  note?: string;
}

/** One line per product + colour, so the same piece can be ordered in two colours. */
export const lineKey = (l: Pick<RfqLine, "productId" | "color">) => `${l.productId}|${l.color ?? ""}`;

interface RfqValue {
  lines: RfqLine[];
  count: number;
  /** the line for this exact selection, if it is already in the list */
  find: (productId: string, color?: string) => RfqLine | undefined;
  /** add a selection, or replace the line with the same product + colour */
  put: (line: RfqLine) => void;
  update: (key: string, patch: Partial<Pick<RfqLine, "qty" | "note">>) => void;
  remove: (key: string) => void;
  removeMany: (keys: string[]) => void;
  clear: () => void;
}

const RfqContext = createContext<RfqValue | null>(null);

/**
 * The quote list lives in the browser per user.
 * TODO(backend): persist as a server-side draft so it follows the user across devices.
 */
export function RfqProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const storageKey = currentUser?.role === "retailer" ? `dar.rfq.${currentUser.id}` : null;
  const [state, setState] = useState<{ key: string | null; lines: RfqLine[] }>({ key: null, lines: [] });

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      let lines: RfqLine[] = [];
      try {
        if (storageKey) lines = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as RfqLine[];
      } catch {
        lines = [];
      }
      setState({ key: storageKey, lines });
    });
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  const update = useCallback(
    (fn: (lines: RfqLine[]) => RfqLine[]) => {
      setState((prev) => {
        const lines = fn(prev.lines);
        try {
          if (prev.key) window.localStorage.setItem(prev.key, JSON.stringify(lines));
        } catch {
          // ignore storage failures
        }
        return { ...prev, lines };
      });
    },
    [],
  );

  const value = useMemo<RfqValue>(() => {
    const lines = state.key === storageKey ? state.lines : [];
    return {
      lines,
      count: lines.length,
      find: (productId, color) => lines.find((l) => lineKey(l) === lineKey({ productId, color })),
      put: (line) => update((ls) => (ls.some((l) => lineKey(l) === lineKey(line)) ? ls.map((l) => (lineKey(l) === lineKey(line) ? line : l)) : [...ls, line])),
      update: (key, patch) => update((ls) => ls.map((l) => (lineKey(l) === key ? { ...l, ...patch } : l))),
      remove: (key) => update((ls) => ls.filter((l) => lineKey(l) !== key)),
      removeMany: (keys) => update((ls) => ls.filter((l) => !keys.includes(lineKey(l)))),
      clear: () => update(() => []),
    };
  }, [state, storageKey, update]);

  return <RfqContext.Provider value={value}>{children}</RfqContext.Provider>;
}

export function useRfq() {
  const ctx = useContext(RfqContext);
  if (!ctx) throw new Error("useRfq must be used inside <RfqProvider>");
  return ctx;
}

/* ------------------------------------------------------------------ */
/* Favorites                                                           */
/* ------------------------------------------------------------------ */

interface FavoritesValue {
  /** favorites are a retailer feature */
  enabled: boolean;
  ids: Set<string>;
  isFavorite: (productId: string) => boolean;
  toggle: (productId: string) => Promise<boolean>;
}

const FavoritesContext = createContext<FavoritesValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { currentUser, isApproved } = useAuth();
  const retailerId = currentUser?.role === "retailer" && isApproved ? currentUser.companyId : null;
  const [state, setState] = useState<{ key: string | null; ids: Set<string> }>({ key: null, ids: new Set() });
  const [version, setVersion] = useState(0);

  useEffect(() => db.subscribe(() => setVersion((v) => v + 1)), []);

  useEffect(() => {
    let cancelled = false;
    (retailerId ? db.favorites.listByRetailer(retailerId) : Promise.resolve([])).then((favs) => {
      if (!cancelled) setState({ key: retailerId, ids: new Set(favs.map((f) => f.productId)) });
    });
    return () => {
      cancelled = true;
    };
  }, [retailerId, version]);

  const value = useMemo<FavoritesValue>(() => {
    const ids = state.key === retailerId ? state.ids : new Set<string>();
    return {
      enabled: retailerId != null,
      ids,
      isFavorite: (id) => ids.has(id),
      toggle: async (productId) => {
        if (!retailerId) return false;
        // optimistic update
        setState((prev) => {
          const next = new Set(prev.ids);
          if (next.has(productId)) next.delete(productId);
          else next.add(productId);
          return { ...prev, ids: next };
        });
        return db.favorites.toggle(retailerId, productId);
      },
    };
  }, [state, retailerId]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used inside <FavoritesProvider>");
  return ctx;
}
