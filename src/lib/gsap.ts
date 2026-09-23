"use client";

import { useGSAP as useGSAPBase } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAPBase);
  // Mobile browser chrome showing and hiding must not re-measure pinned sections.
  ScrollTrigger.config({ ignoreMobileResize: true });
}

/** House easing, matched to --ease-film / --ease-silk in globals.css. */
export const EASE = {
  film: "expo.out",
  silk: "power4.inOut",
} as const;

type Callback = Parameters<typeof useGSAPBase>[0];
type Config = Parameters<typeof useGSAPBase>[1];

/**
 * useGSAP, made fail-safe. GSAP's context does not restore its global
 * "current context" when a setup function throws, so one exception leaves
 * every later context nested inside a stale one (and eventually recursing
 * forever), which takes the whole React tree down with it. Here a failing
 * setup is caught inside its own context, reverted so the section falls
 * back to its static, fully visible layout, and reported in development.
 */
export function useGSAP(callback?: Callback, config?: Config) {
  return useGSAPBase(
    typeof callback === "function"
      ? (context, contextSafe) => {
          try {
            return callback(context, contextSafe);
          } catch (error) {
            if (process.env.NODE_ENV !== "production") console.error("[motion] setup failed; section shown without motion.", error);
            queueMicrotask(() => context.revert());
          }
        }
      : callback,
    config,
  );
}

/**
 * Run `play` once, the first time `trigger` reaches `start`, or at once if
 * the page opens (or is reloaded) already past that point.
 *
 * Use this instead of `once: true`: a `once` trigger kills itself, and when
 * several do so inside one of ScrollTrigger's nested refreshes (a reload
 * mid-page, or elements not laid out yet) its refresh loop loses its place
 * and throws. This one only disables itself, so the trigger list never
 * shifts under a refresh.
 */
export function onReach(trigger: Element, start: string, play: () => void) {
  let done = false;
  const fire = (self: ScrollTrigger) => {
    if (done) return;
    done = true;
    play();
    self.disable(false, true);
  };
  return ScrollTrigger.create({
    trigger,
    // Clamped, so something in the last stretch of the page still plays when the page can scroll no further.
    start: `clamp(${start})`,
    end: "max",
    onEnter: fire,
    onEnterBack: fire,
    onLeave: fire,
    onRefresh: (self) => {
      if (self.progress > 0) fire(self);
    },
  });
}

/** True when the element takes up space on the page (not inside display: none). */
export const isRendered = (el: Element) => el.getClientRects().length > 0;

export { gsap, ScrollTrigger };
