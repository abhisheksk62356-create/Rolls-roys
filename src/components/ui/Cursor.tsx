"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useEffect, useState } from "react";
import { useFinePointer } from "@/lib/hooks";
import { ease } from "@/lib/motion";

type Mode = "default" | "link" | "view";

/**
 * A point and a trailing ring, blended by difference so they read on both
 * film and paper. The ring widens over links and becomes a labelled disc
 * over images (data-cursor="view" data-cursor-label="…").
 */
export function Cursor() {
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  const enabled = fine && !reduced;

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const rx = useSpring(x, { stiffness: 380, damping: 38, mass: 0.5 });
  const ry = useSpring(y, { stiffness: 380, damping: 38, mass: 0.5 });

  const [mode, setMode] = useState<Mode>("default");
  const [label, setLabel] = useState("View");
  const [shown, setShown] = useState(false);
  const [down, setDown] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.classList.add("cursor-on");

    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x.set(e.clientX);
      y.set(e.clientY);
      setShown(true);
    };
    const over = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-cursor], a, button, [role='button']");
      if (!el) return setMode("default");
      setMode((el.getAttribute("data-cursor") as Mode | null) ?? "link");
      setLabel(el.getAttribute("data-cursor-label") ?? "View");
    };
    const leave = () => setShown(false);
    const press = () => setDown(true);
    const release = () => setDown(false);

    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerover", over, { passive: true });
    root.addEventListener("pointerleave", leave);
    window.addEventListener("pointerdown", press);
    window.addEventListener("pointerup", release);
    return () => {
      root.classList.remove("cursor-on");
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerover", over);
      root.removeEventListener("pointerleave", leave);
      window.removeEventListener("pointerdown", press);
      window.removeEventListener("pointerup", release);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  const scale = (mode === "view" ? 2.6 : mode === "link" ? 1.55 : 1) * (down ? 0.86 : 1);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[120] mix-blend-difference">
      <motion.div className="absolute left-0 top-0" style={{ x: rx, y: ry }}>
        <motion.div
          className="-ml-[18px] -mt-[18px] size-9 rounded-full border border-ivory"
          animate={{
            scale,
            opacity: shown ? (mode === "view" ? 1 : 0.55) : 0,
            backgroundColor: mode === "view" ? "rgba(236,231,222,1)" : "rgba(236,231,222,0)",
          }}
          transition={{ duration: 0.55, ease: ease.film }}
        />
        <motion.span
          className="type-micro absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[0.5625rem] tracking-[0.22em] text-obsidian"
          animate={{ opacity: shown && mode === "view" ? 1 : 0 }}
          transition={{ duration: 0.35 }}
        >
          {label}
        </motion.span>
      </motion.div>
      <motion.div
        className="absolute left-0 top-0 -ml-[3px] -mt-[3px] size-1.5 rounded-full bg-ivory"
        style={{ x, y }}
        animate={{ opacity: shown && mode === "default" ? 1 : 0 }}
        transition={{ duration: 0.25 }}
      />
    </div>
  );
}
