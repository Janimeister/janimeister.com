import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Persist a value in localStorage on user-initiated change.
 *
 * - Reads any existing value during initialisation (SSR-safe).
 * - Writes ONLY after `setValue` has been called, so visitors
 *   who never interact with the consent UI don't get anything
 *   written to their browser.
 * - Survives disabled storage (private browsing) silently.
 */
export function useLocalStorage<T>(
  key: string,
  initial: T,
): [T, (next: T | ((prev: T) => T)) => void, () => void] {
  const [value, setValueState] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });

  const touched = useRef(false);

  useEffect(() => {
    if (!touched.current) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage disabled — silently ignore */
    }
  }, [key, value]);

  const setValue = useCallback((next: T | ((prev: T) => T)) => {
    touched.current = true;
    setValueState(next);
  }, []);

  const remove = useCallback(() => {
    touched.current = true;
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    setValueState(initial);
  }, [key, initial]);

  return [value, setValue, remove];
}
