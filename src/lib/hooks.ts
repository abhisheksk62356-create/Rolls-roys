"use client";

import { useSyncExternalStore } from "react";

export function useMediaQuery(query: string, serverValue = false) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** A desktop pointer that can hover: gets the custom cursor and magnetic effects. */
export const useFinePointer = () => useMediaQuery("(hover: hover) and (pointer: fine)");

export const useReducedMotionPref = () => useMediaQuery("(prefers-reduced-motion: reduce)");

const subscribeNoop = () => () => {};
/** True after hydration; used before touching `document` for portals. */
export function useMounted() {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}
