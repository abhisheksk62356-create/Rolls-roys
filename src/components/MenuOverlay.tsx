"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, type MouseEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import { trapFocus } from "@/lib/a11y";
import { menu } from "@/lib/content";
import { useMounted } from "@/lib/hooks";
import { ease } from "@/lib/motion";
import { useSmoothScroll } from "./providers/Providers";
import { LineCta } from "./ui/LineCta";
import { Magnetic } from "./ui/Magnetic";


export function MenuOverlay({
  open,
  onClose,
  returnFocus,
}: {
  open: boolean;
  onClose: () => void;
  returnFocus: RefObject<HTMLButtonElement | null>;
}) {
  const mounted = useMounted();
  const { lock, scrollTo } = useSmoothScroll();
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const destination = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    lock(true);
    const focusTimer = window.setTimeout(() => closeButton.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      trapFocus(e, panel.current);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      lock(false);
    };
  }, [open, lock, onClose]);

  // Links close the menu first, then travel once the curtain has lifted.
  const go = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    destination.current = href;
    onClose();
  };

  const onExitComplete = () => {
    const href = destination.current;
    destination.current = null;
    if (href) scrollTo(href);
    else returnFocus.current?.focus();
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence onExitComplete={onExitComplete}>
      {open && (
        <motion.div
          ref={panel}
          id="site-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          data-lenis-prevent
          className="fixed inset-0 z-[90] flex flex-col overflow-y-auto overscroll-contain bg-obsidian text-ivory"
          initial={{ clipPath: "inset(0% 0% 100% 0%)" }}
          animate={{ clipPath: "inset(0% 0% 0% 0%)", transition: { duration: 1.1, ease: ease.silk } }}
          exit={{ clipPath: "inset(0% 0% 100% 0%)", transition: { duration: 0.9, ease: ease.silk, delay: 0.2 } }}
        >
          <div className="px-page flex h-16 shrink-0 items-center justify-between lg:h-[4.75rem]">
            <span className="type-brand text-[0.9375rem] font-light tracking-[0.5em]">Royce</span>
            <Magnetic>
              <button
                ref={closeButton}
                type="button"
                onClick={onClose}
                className="type-micro flex min-h-11 items-center gap-3"
              >
                Close
                <X aria-hidden strokeWidth={1} className="size-4" />
              </button>
            </Magnetic>
          </div>

          <div className="px-page grid flex-1 content-center gap-y-14 py-12 lg:grid-cols-12 lg:items-end">
            <nav aria-label="Menu" className="lg:col-span-8">
              <ul className="group/list">
                {menu.map((item, i) => (
                  <li key={item.href} className="overflow-hidden">
                    <motion.a
                      href={item.href}
                      onClick={(e) => go(e, item.href)}
                      className="type-brand block py-[0.1em] text-[clamp(1.9rem,7vw,5.25rem)] font-[200] leading-[1.02] transition-[opacity,translate] duration-700 ease-film group-hover/list:opacity-30 hover:translate-x-3 hover:opacity-100! focus-visible:opacity-100!"
                      initial={{ y: "110%" }}
                      animate={{ y: "0%", transition: { duration: 1.3, ease: ease.film, delay: 0.45 + i * 0.07 } }}
                      exit={{ y: "-110%", transition: { duration: 0.6, ease: ease.silk, delay: i * 0.03 } }}
                    >
                      {item.label}
                    </motion.a>
                  </li>
                ))}
              </ul>
            </nav>

            <motion.div
              className="flex flex-col gap-8 lg:col-span-3 lg:col-start-10 lg:pb-4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 1.2, ease: ease.film, delay: 0.9 } }}
              exit={{ opacity: 0, transition: { duration: 0.3 } }}
            >
              <p className="type-lede max-w-[26ch] text-ivory/70">
                Private viewings are arranged by appointment at the atelier.
              </p>
              <div>
                <LineCta href="#contact" label="Contact the atelier" onClick={(e) => go(e, "#contact")} />
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
