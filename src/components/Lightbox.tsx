"use client";

import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import { createPortal } from "react-dom";
import { trapFocus } from "@/lib/a11y";
import type { ImageAsset } from "@/lib/media";
import { useMounted } from "@/lib/hooks";
import { ease } from "@/lib/motion";
import { useSmoothScroll } from "./providers/Providers";
import { Frame } from "./ui/Frame";
import { Magnetic } from "./ui/Magnetic";

const slide = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 90, scale: 0.985 }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -90, scale: 0.985 }),
};

export function Lightbox({
  items,
  index,
  setIndex,
  onClose,
  returnFocus,
}: {
  items: ImageAsset[];
  index: number | null;
  setIndex: Dispatch<SetStateAction<number | null>>;
  onClose: () => void;
  returnFocus: RefObject<HTMLButtonElement | null>;
}) {
  const mounted = useMounted();
  const { lock } = useSmoothScroll();
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [dir, setDir] = useState(1);
  const open = index !== null;
  const count = items.length;

  const step = useCallback(
    (by: number) => {
      setDir(by);
      setIndex((i) => (i === null ? i : (i + by + count) % count));
    },
    [setIndex, count],
  );

  useEffect(() => {
    if (!open) return;
    lock(true);
    const focusTimer = window.setTimeout(() => closeButton.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      trapFocus(e, panel.current);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      lock(false);
    };
  }, [open, lock, onClose, step]);

  if (!mounted) return null;
  const asset = index === null ? null : items[index];

  return createPortal(
    <AnimatePresence onExitComplete={() => returnFocus.current?.focus()}>
      {asset && index !== null && (
        <motion.div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
          data-lenis-prevent
          className="fixed inset-0 z-[95] flex flex-col bg-obsidian/[0.97] text-ivory"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.7, ease: ease.film } }}
          exit={{ opacity: 0, transition: { duration: 0.6, ease: ease.silk } }}
        >
          <div className="px-page flex h-16 shrink-0 items-center justify-between lg:h-[4.75rem]">
            <p className="type-micro text-ivory/60" aria-live="polite">
              {index + 1} / {count}
            </p>
            <Magnetic>
              <button ref={closeButton} type="button" onClick={onClose} className="type-micro flex min-h-11 items-center gap-3">
                Close
                <X aria-hidden strokeWidth={1} className="size-4" />
              </button>
            </Magnetic>
          </div>

          <motion.div
            className="relative grid flex-1 place-items-center overflow-hidden px-4"
            initial={{ scale: 0.96, y: 18 }}
            animate={{ scale: 1, y: 0, transition: { duration: 1.1, ease: ease.film } }}
          >
            <AnimatePresence initial={false} custom={dir}>
              <motion.figure
                key={index}
                custom={dir}
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.9, ease: ease.film }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -70 || info.velocity.x < -500) step(1);
                  else if (info.offset.x > 70 || info.velocity.x > 500) step(-1);
                }}
                className="relative cursor-grab touch-pan-y [grid-area:1/1] active:cursor-grabbing"
                style={{
                  aspectRatio: `${asset.width} / ${asset.height}`,
                  width: `min(92vw, calc(72svh * ${asset.width / asset.height}))`,
                }}
              >
                <Frame image={asset} sizes="92vw" quality={85} fit="contain" className="pointer-events-none" />
              </motion.figure>
            </AnimatePresence>
          </motion.div>

          <div className="px-page flex min-h-24 shrink-0 items-center justify-between gap-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <p className="type-caption max-w-[40ch] text-ivory/60">{asset.alt}</p>
            <div className="flex shrink-0 items-center gap-2">
              <Magnetic>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Previous image"
                  className="grid size-12 place-items-center rounded-full border border-ivory/20 transition-colors duration-500 hover:border-ivory/60"
                >
                  <ArrowLeft aria-hidden strokeWidth={1} className="size-4" />
                </button>
              </Magnetic>
              <Magnetic>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Next image"
                  className="grid size-12 place-items-center rounded-full border border-ivory/20 transition-colors duration-500 hover:border-ivory/60"
                >
                  <ArrowRight aria-hidden strokeWidth={1} className="size-4" />
                </button>
              </Magnetic>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
