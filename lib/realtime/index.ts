"use client";

import { createRealtimeClient, type RawLiveQuerySubscription, type SealedLiveQuery } from "@neon/realtime/client";
import { emitChange } from "@/lib/data/http";

/**
 * Bridges Neon Realtime into the data layer: when a watched row changes (a new notification,
 * an order status, this account's approval) every `db.subscribe` listener refetches.
 */

type Sealed = Record<string, SealedLiveQuery<unknown>>;

async function fetchSealed(): Promise<{ userId: string; queries: Sealed }> {
  const res = await fetch("/api/realtime", { method: "POST" });
  if (!res.ok) throw new Error(`REALTIME_SEAL_${res.status}`);
  return res.json();
}

/** Starts the live subscriptions for `userId`; returns a stop function. */
export function startRealtime(userId: string): () => void {
  const url = process.env.NEXT_PUBLIC_NEON_REALTIME_URL;
  if (!url) {
    console.warn("[realtime] NEXT_PUBLIC_NEON_REALTIME_URL is not set; live updates are off");
    return () => {};
  }

  const client = createRealtimeClient({ url });
  const subs = new Map<string, RawLiveQuerySubscription<unknown>>();
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let debounce: ReturnType<typeof setTimeout> | undefined;

  // one refetch per burst of transactions
  const changed = () => {
    clearTimeout(debounce);
    debounce = setTimeout(emitChange, 150);
  };

  const schedule = (queries: Sealed) => {
    const expiresAt = Math.min(...Object.values(queries).map((q) => q.expiresAt));
    timer = setTimeout(renew, Math.max(1_000, expiresAt - Date.now() - 10_000));
  };

  async function renew() {
    if (stopped) return;
    let next;
    try {
      next = await fetchSealed();
    } catch {
      timer = setTimeout(renew, 1_000); // transient: retry
      return;
    }
    // Signed out or a different account in another tab: stop; the page reloads on session change.
    if (next.userId !== userId) return stop();
    try {
      await Promise.all([...subs].map(([name, sub]) => (next.queries[name] ? sub.renew(next.queries[name]) : Promise.resolve())));
      schedule(next.queries);
    } catch (error) {
      console.warn("[realtime] renewal failed; live updates stopped", error);
    }
  }

  fetchSealed()
    .then(({ userId: sealedFor, queries }) => {
      if (stopped || sealedFor !== userId) return;
      for (const [name, sealed] of Object.entries(queries)) {
        const sub = client.subscribe(sealed, { materialize: false });
        let initial = true;
        sub.onUpdate((update) => {
          // the first full result is the current state; anything after it is a change
          if (update.type === "rows" && initial) {
            initial = false;
            return;
          }
          changed();
        });
        sub.onStateChange((state) => {
          if (state.status === "error") console.warn(`[realtime] ${name}:`, state.error?.message);
        });
        subs.set(name, sub);
      }
      schedule(queries);
    })
    .catch((error) => console.warn("[realtime] could not start", error));

  function stop() {
    stopped = true;
    clearTimeout(timer);
    clearTimeout(debounce);
    for (const sub of subs.values()) sub.unsubscribe();
    subs.clear();
    client.close();
  }
  return stop;
}
