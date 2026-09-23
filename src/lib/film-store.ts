"use client";

import { useSyncExternalStore } from "react";

/**
 * Shared state between the opening film and the loader:
 * how much of the film has buffered, whether it can be scrubbed,
 * and whether the loader has lifted.
 */
type FilmState = {
  /** 0 to 1, how much of the arrival film is buffered. */
  progress: number;
  /** Metadata known and enough data to seek. */
  ready: boolean;
  /** Loader has finished and the page is revealed. */
  revealed: boolean;
};

const initial: FilmState = { progress: 0, ready: false, revealed: false };
let state = initial;
const listeners = new Set<() => void>();

export const filmStore = {
  get: () => state,
  set(patch: Partial<FilmState>) {
    const next = { ...state, ...patch };
    if (next.progress === state.progress && next.ready === state.ready && next.revealed === state.revealed) return;
    state = next;
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useFilmStore() {
  return useSyncExternalStore(filmStore.subscribe, filmStore.get, () => initial);
}
