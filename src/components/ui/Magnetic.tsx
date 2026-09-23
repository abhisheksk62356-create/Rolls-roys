"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useRef, type ReactNode } from "react";
import { useFinePointer } from "@/lib/hooks";
import { cx } from "@/lib/utils";

const spring = { stiffness: 170, damping: 18, mass: 0.5 };

/** Leans its child a short way toward the pointer. Desktop pointers only. */
export function Magnetic({
  children,
  strength = 0.28,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  const enabled = fine && !reduced;
  const rect = useRef<DOMRect | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, spring);
  const sy = useSpring(y, spring);

  return (
    <motion.div
      className={cx("inline-flex", className)}
      style={enabled ? { x: sx, y: sy } : undefined}
      onPointerEnter={
        enabled
          ? (e) => {
              rect.current = e.currentTarget.getBoundingClientRect();
            }
          : undefined
      }
      onPointerMove={
        enabled
          ? (e) => {
              const r = rect.current;
              if (!r) return;
              x.set((e.clientX - (r.left + r.width / 2)) * strength);
              y.set((e.clientY - (r.top + r.height / 2)) * strength);
            }
          : undefined
      }
      onPointerLeave={
        enabled
          ? () => {
              rect.current = null;
              x.set(0);
              y.set(0);
            }
          : undefined
      }
    >
      {children}
    </motion.div>
  );
}
