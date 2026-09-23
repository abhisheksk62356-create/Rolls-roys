"use client";

import { useEffect } from "react";
import { gsap, isRendered, onReach, ScrollTrigger, useGSAP } from "@/lib/gsap";

/**
 * Layout switches that change which elements are on the page (a section's
 * phone layout is display: none on desktop, and the reverse). When one
 * flips, everything below is reverted and rebuilt for the new layout.
 */
const CONDITIONS = {
  motion: "(prefers-reduced-motion: no-preference)",
  md: "(min-width: 768px)",
  lg: "(min-width: 1024px)",
  landscape: "(min-aspect-ratio: 5/4)",
};

/**
 * One controller for the page's declarative scroll motion, so sections can
 * stay server-rendered and simply mark what should move:
 *
 *   data-fade            rise and fade in once, batched with neighbours
 *   data-lines           children marked data-line rise from behind a mask
 *   data-unveil[=dir]    the frame opens like a shutter; data-unveil-inner settles from 1.2x
 *   data-zoom="1.2"      scale from the value down to 1 while passing through the viewport
 *   data-drift="9"       yPercent drift from -value to +value (element should be oversized)
 *   data-speed="0.1"     parallax offset, as a share of viewport height
 *   data-pan="-16"       xPercent travel while passing through the viewport
 *
 * Elements that are not rendered in the current layout are left alone, so
 * they are never hidden waiting for a trigger that cannot fire. Scrubbed
 * effects use their parent as the trigger, so the moving element never
 * distorts its own measurements. Nothing runs under reduced motion.
 */
export function ScrollEffects() {
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(CONDITIONS, (context) => {
      if (!context.conditions?.motion) return;
      const all = <T extends HTMLElement>(s: string) => gsap.utils.toArray<T>(s).filter(isRendered);
      const pass = (el: HTMLElement) => ({
        trigger: el.parentElement ?? el,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
        invalidateOnRefresh: true,
      });

      // Fades that arrive together rise together, staggered, in the order they reached the screen.
      const fades = all("[data-fade]");
      let queue: HTMLElement[] = [];
      const flush = () => {
        const batch = queue;
        queue = [];
        gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1.4, ease: "expo.out", stagger: 0.1, overwrite: true });
      };
      if (fades.length) gsap.set(fades, { autoAlpha: 0, y: 26 });
      fades.forEach((el) =>
        onReach(el, "top 90%", () => {
          if (!queue.length) gsap.delayedCall(0, flush);
          queue.push(el);
        }),
      );

      all("[data-lines]").forEach((el) => {
        const lines = el.querySelectorAll("[data-line]");
        if (!lines.length) return;
        const tl = gsap.timeline({ paused: true });
        tl.from(lines, { yPercent: 112, duration: 1.6, ease: "expo.out", stagger: 0.11 });
        onReach(el, "top 88%", () => tl.play());
      });

      const shutters = {
        up: "inset(100% 0% 0% 0%)",
        down: "inset(0% 0% 100% 0%)",
        left: "inset(0% 100% 0% 0%)",
        right: "inset(0% 0% 0% 100%)",
      } as const;
      all("[data-unveil]").forEach((el) => {
        const from = shutters[(el.dataset.unveil as keyof typeof shutters) || "up"] ?? shutters.up;
        const tl = gsap.timeline({ paused: true });
        tl.fromTo(el, { clipPath: from }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.7, ease: "power4.inOut" });
        const inner = el.querySelector("[data-unveil-inner]");
        if (inner) tl.fromTo(inner, { scale: 1.2 }, { scale: 1, duration: 2.4, ease: "expo.out" }, 0);
        // The shutter starts closed only once its trigger exists, and clears its inline clip when done.
        tl.eventCallback("onComplete", () => gsap.set(el, { clearProps: "clipPath" }));
        onReach(el, "top 86%", () => tl.play());
      });

      all("[data-zoom]").forEach((el) => {
        gsap.fromTo(el, { scale: Number(el.dataset.zoom) || 1.15 }, { scale: 1, ease: "none", scrollTrigger: pass(el) });
      });

      all("[data-drift]").forEach((el) => {
        const v = Number(el.dataset.drift) || 8;
        gsap.fromTo(el, { yPercent: -v }, { yPercent: v, ease: "none", scrollTrigger: pass(el) });
      });

      all("[data-speed]").forEach((el) => {
        const v = Number(el.dataset.speed) || 0;
        gsap.fromTo(
          el,
          { y: () => v * window.innerHeight * 0.5 },
          { y: () => -v * window.innerHeight * 0.5, ease: "none", scrollTrigger: pass(el) },
        );
      });

      all("[data-pan]").forEach((el) => {
        gsap.fromTo(el, { xPercent: 0 }, { xPercent: Number(el.dataset.pan) || -12, ease: "none", scrollTrigger: pass(el) });
      });
    });
  });

  // Re-measure once web fonts and late images have settled the layout.
  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      if (!cancelled) {
        ScrollTrigger.sort();
        ScrollTrigger.refresh();
      }
    };
    document.fonts?.ready.then(refresh);
    window.addEventListener("load", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("load", refresh);
    };
  }, []);

  return null;
}
