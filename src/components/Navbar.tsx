"use client";

import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { navigation } from "@/lib/content";
import { useFilmStore } from "@/lib/film-store";
import { ease } from "@/lib/motion";
import { cx } from "@/lib/utils";
import { MenuOverlay } from "./MenuOverlay";
import { Magnetic } from "./ui/Magnetic";

/**
 * Transparent over film; once the opening film is behind you it gains a
 * dark, blurred ground. It steps aside while you read down the page and
 * returns the moment you scroll back up.
 */
export function Navbar() {
  const { scrollY } = useScroll();
  const { revealed } = useFilmStore();
  const [grounded, setGrounded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useMotionValueEvent(scrollY, "change", (v) => {
    const prev = scrollY.getPrevious() ?? 0;
    const film = document.getElementById("top");
    const filmEnd = film ? film.offsetHeight - window.innerHeight * 0.5 : window.innerHeight;
    setGrounded(v > filmEnd);
    if (v > prev + 1 && v > window.innerHeight * 0.6) setHidden(true);
    else if (v < prev - 1) setHidden(false);
  });

  return (
    <>
      <motion.header
        className="fixed inset-x-0 top-0 z-50"
        initial={false}
        animate={{ opacity: revealed ? 1 : 0, y: hidden && !open ? "-100%" : "0%" }}
        transition={{ opacity: { duration: 1.2, delay: revealed ? 0.6 : 0 }, y: { duration: 0.9, ease: ease.film } }}
      >
        <div
          className={cx(
            "border-b transition-[background-color,border-color,backdrop-filter] duration-700 ease-film",
            grounded ? "border-ivory/[0.07] bg-obsidian/55 backdrop-blur-xl" : "border-transparent bg-transparent",
          )}
        >
          <nav aria-label="Primary" className="px-page flex h-16 items-center justify-between lg:grid lg:h-[4.75rem] lg:grid-cols-[1fr_auto_1fr]">
            <a
              href="#top"
              aria-label="Royce, back to the start"
              className="type-brand justify-self-start py-3 text-[0.9375rem] font-light tracking-[0.5em]"
            >
              Royce
            </a>

            <ul className="hidden items-center gap-[clamp(1.75rem,3.2vw,3.25rem)] lg:flex">
              {navigation.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="group type-micro relative block py-3 text-ivory/70 transition-colors duration-500 hover:text-ivory"
                  >
                    {item.label}
                    <span
                      aria-hidden
                      className="absolute inset-x-0 bottom-1.5 h-px origin-center scale-x-0 bg-ivory/60 transition-transform duration-700 ease-film group-hover:scale-x-100"
                    />
                  </a>
                </li>
              ))}
            </ul>

            <div className="justify-self-end">
              <Magnetic>
                <button
                  ref={menuButton}
                  type="button"
                  onClick={() => setOpen(true)}
                  aria-expanded={open}
                  aria-haspopup="dialog"
                  className="group type-micro flex min-h-11 items-center gap-4"
                >
                  <span>Menu</span>
                  <span aria-hidden className="flex w-6 flex-col items-end gap-[5px]">
                    <span className="h-px w-6 bg-ivory" />
                    <span className="h-px w-3.5 bg-ivory transition-[width] duration-500 ease-film group-hover:w-6" />
                  </span>
                </button>
              </Magnetic>
            </div>
          </nav>
        </div>
      </motion.header>

      <MenuOverlay open={open} onClose={close} returnFocus={menuButton} />
    </>
  );
}
