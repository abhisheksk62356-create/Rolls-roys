"use client";

import Lenis from "lenis";
import { MotionConfig } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode, type RefObject } from "react";
import { filmStore } from "@/lib/film-store";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useReducedMotionPref } from "@/lib/hooks";
import { DEFAULT_FALLBACK, type ImageAsset } from "@/lib/media";

/* ---------- Media availability ---------- */

const MediaContext = createContext<Record<string, boolean>>({});

/** Whether a configured media file exists in /public. */
export function useHasMedia() {
  const available = useContext(MediaContext);
  return useCallback((src?: string) => (src ? available[src] === true : false), [available]);
}

/** Picks the asset's own file, else the default still. */
export function useResolvedSrc() {
  const has = useHasMedia();
  return useCallback(
    (asset: ImageAsset) => {
      if (has(asset.src)) return asset.src;
      return has(DEFAULT_FALLBACK) ? DEFAULT_FALLBACK : null;
    },
    [has],
  );
}

/* ---------- Smooth scroll ---------- */

const LenisContext = createContext<RefObject<Lenis | null>>({ current: null });

export function useSmoothScroll() {
  const lenis = useContext(LenisContext);

  const scrollTo = useCallback(
    (target: string | HTMLElement, immediate = false) => {
      const el = typeof target === "string" ? document.getElementById(target.replace(/^#/, "")) : target;
      if (!el) return;
      const focus = () => {
        if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
        el.focus({ preventScroll: true });
      };
      if (lenis.current) {
        lenis.current.scrollTo(el, {
          immediate,
          duration: 2,
          easing: (t) => 1 - Math.pow(1 - t, 4),
          onComplete: focus,
        });
      } else {
        el.scrollIntoView({ behavior: immediate ? "auto" : "smooth" });
        focus();
      }
    },
    [lenis],
  );

  /** Freeze page scroll while an overlay or the loader is up. */
  const lock = useCallback(
    (locked: boolean) => {
      document.documentElement.style.overflow = locked ? "hidden" : "";
      if (locked) lenis.current?.stop();
      else lenis.current?.start();
    },
    [lenis],
  );

  return { scrollTo, lock };
}

/**
 * Lenis smooths wheel input and is stepped by GSAP's ticker, so smooth
 * scrolling, ScrollTrigger and every scrubbed animation share one frame loop.
 */
function SmoothScroll({ children }: { children: ReactNode }) {
  const lenis = useRef<Lenis | null>(null);
  const reduced = useReducedMotionPref();

  useEffect(() => {
    if (reduced) return;
    const instance = new Lenis({ lerp: 0.1, wheelMultiplier: 0.85, autoRaf: false });
    lenis.current = instance;
    instance.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    // Hold still until the loader has lifted.
    if (!filmStore.get().revealed) instance.stop();
    const unsubscribe = filmStore.subscribe(() => {
      if (filmStore.get().revealed) instance.start();
    });
    return () => {
      unsubscribe();
      gsap.ticker.remove(tick);
      instance.destroy();
      lenis.current = null;
    };
  }, [reduced]);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}

/** In-page anchor links glide to their section and move focus there. */
function AnchorLinks() {
  const { scrollTo } = useSmoothScroll();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.('a[href^="#"]');
      const id = link?.getAttribute("href")?.slice(1);
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      scrollTo(el);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [scrollTo]);

  return null;
}

/** Lists configured media that is not in /public yet (development only). */
function MissingMediaReport({ available }: { available: Record<string, boolean> }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const missing = Object.entries(available)
      .filter(([, ok]) => !ok)
      .map(([src]) => `public${src}`);
    if (missing.length) {
      console.info(`[royce] ${missing.length} media file(s) not found, using fallbacks:\n${missing.join("\n")}`);
    }
  }, [available]);
  return null;
}

/* ---------- Root ---------- */

export function Providers({ available, children }: { available: Record<string, boolean>; children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <MediaContext.Provider value={available}>
        <MissingMediaReport available={available} />
        <SmoothScroll>
          <AnchorLinks />
          {children}
        </SmoothScroll>
      </MediaContext.Provider>
    </MotionConfig>
  );
}
