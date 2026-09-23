"use client";

import { useEffect, useRef, useState } from "react";
import { filmStore, useFilmStore } from "@/lib/film-store";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotionPref } from "@/lib/hooks";

/** Never hold the page longer than this, whatever the network. */
const MAX_WAIT = 4200;

/**
 * The opening: the marque and a single line that fills as the arrival
 * film buffers, then the black lifts away like a curtain. The line is
 * real progress, not a timer; a returning visitor barely sees it.
 */
export function Loader() {
  const root = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLSpanElement>(null);
  const { progress, ready } = useFilmStore();
  const reduced = useReducedMotionPref();
  const [done, setDone] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const minWait = useRef(1300);
  const exiting = useRef(false);

  // Start every visit at the opening frame, with the page held still.
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    document.documentElement.style.overflow = "hidden";
    try {
      if (sessionStorage.getItem("royce:seen")) minWait.current = 500;
      sessionStorage.setItem("royce:seen", "1");
    } catch {}
    const cap = window.setTimeout(() => setTimedOut(true), MAX_WAIT);
    return () => window.clearTimeout(cap);
  }, []);

  useGSAP(
    () => {
      gsap.from("[data-loader-brand]", { autoAlpha: 0, duration: 1.2, ease: "power2.out" });
    },
    { scope: root },
  );

  // The line follows the buffer.
  useGSAP(
    () => {
      if (!line.current || exiting.current) return;
      gsap.to(line.current, { scaleX: Math.max(0.04, progress), duration: 0.6, ease: "power2.out", overwrite: true });
    },
    { dependencies: [progress] },
  );

  useGSAP(
    () => {
      if ((!ready && !timedOut) || exiting.current || !root.current) return;
      exiting.current = true;
      const elapsed = performance.now();
      const delay = Math.max(0, minWait.current - elapsed) / 1000;
      const finish = () => {
        document.documentElement.style.overflow = "";
        window.scrollTo(0, 0);
        filmStore.set({ revealed: true });
        setDone(true);
      };
      if (reduced) {
        gsap.to(root.current, { autoAlpha: 0, duration: 0.4, delay, onComplete: finish });
        return;
      }
      gsap
        .timeline({ delay, onComplete: finish })
        .to(line.current, { scaleX: 1, duration: 0.5, ease: "power2.out", overwrite: true })
        .to("[data-loader-mark]", { autoAlpha: 0, y: -12, duration: 0.6, ease: "power2.in" }, "+=0.15")
        .to(root.current, { yPercent: -100, duration: 1.15, ease: "power4.inOut" }, "-=0.2");
    },
    { dependencies: [ready, timedOut, reduced], scope: root },
  );

  if (done) return null;

  return (
    <div ref={root} className="loader" role="status" aria-label="Loading the Royce film">
      <div data-loader-mark className="flex flex-col items-center gap-7">
        <span
          data-loader-brand
          className="type-brand pl-[0.62em] text-[0.875rem] font-light tracking-[0.62em] text-ivory"
        >
          Royce
        </span>
        <span aria-hidden className="relative block h-px w-[min(40vw,11rem)] overflow-hidden bg-ivory/15">
          <span ref={line} className="absolute inset-0 origin-left scale-x-[0.04] bg-champagne" />
        </span>
      </div>
    </div>
  );
}
