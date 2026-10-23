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
}

interface RfqValue {
  lines: RfqLine[];
  count: number;
  has: (productId: string) => boolean;
  qtyOf: (productId: string) => number | undefined;
  set: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  removeMany: (productIds: string[]) => void;
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
      has: (id) => lines.some((l) => l.productId === id),
      qtyOf: (id) => lines.find((l) => l.productId === id)?.qty,
      set: (productId, qty) =>
        update((ls) => (ls.some((l) => l.productId === productId) ? ls.map((l) => (l.productId === productId ? { ...l, qty } : l)) : [...ls, { productId, qty }])),
      remove: (productId) => update((ls) => ls.filter((l) => l.productId !== productId)),
      removeMany: (ids) => update((ls) => ls.filter((l) => !ids.includes(l.productId))),
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
