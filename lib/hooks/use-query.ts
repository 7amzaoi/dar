"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { db } from "@/lib/data";

interface QueryState<T> {
  key: string;
  data?: T;
  error?: Error;
}

export interface QueryResult<T> {
  data: T | undefined;
  error: Error | undefined;
  /** true until the first result for the current `deps` arrives */
  loading: boolean;
  reload: () => void;
}

/**
 * Minimal async data hook over the repository layer.
 * Refetches when `deps` change and, silently, whenever the data source reports a change.
 *
 * TODO(backend): consider TanStack Query once real network calls are involved.
 */
export function useQuery<T>(fn: () => Promise<T>, deps: readonly unknown[], { enabled = true }: { enabled?: boolean } = {}): QueryResult<T> {
  const fnRef = useRef(fn);
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<QueryState<T>>({ key: "" });
  const depsKey = JSON.stringify(deps);

  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => db.subscribe(() => setVersion((v) => v + 1)), []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fnRef.current().then(
      (data) => !cancelled && setState({ key: depsKey, data }),
      (error: unknown) => !cancelled && setState({ key: depsKey, error: error instanceof Error ? error : new Error(String(error)) }),
    );
    return () => {
      cancelled = true;
    };
  }, [depsKey, version, enabled]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const current = state.key === depsKey;

  return {
    data: current ? state.data : undefined,
    error: current ? state.error : undefined,
    loading: enabled && !current,
    reload,
  };
}
