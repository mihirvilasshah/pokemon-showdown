"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  error: unknown;
  loading: boolean;
  retry: () => void;
}

/**
 * Runs `loader` whenever `key` changes (null = idle). Stale responses are ignored,
 * and `retry` re-runs the loader after a failure.
 */
export function useAsync<T>(key: string | null, loader: () => Promise<T>): AsyncState<T> {
  const [state, setState] = useState<{ key: string | null; data: T | null; error: unknown; loading: boolean }>({
    key: null,
    data: null,
    error: null,
    loading: key !== null,
  });
  const [attempt, setAttempt] = useState(0);
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    if (key === null) return;
    let cancelled = false;
    setState((s) => ({ key, data: s.key === key ? s.data : null, error: null, loading: true }));
    loaderRef
      .current()
      .then((data) => {
        if (!cancelled) setState({ key, data, error: null, loading: false });
      })
      .catch((error) => {
        if (!cancelled) setState({ key, data: null, error, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [key, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  if (key === null) return { data: null, error: null, loading: false, retry };
  if (state.key !== key) return { data: null, error: null, loading: true, retry };
  return { data: state.data, error: state.error, loading: state.loading, retry };
}
