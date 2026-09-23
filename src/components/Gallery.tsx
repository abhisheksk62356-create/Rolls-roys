"use client";

import { useCallback, useRef, useState } from "react";
import { gsap, onReach, useGSAP } from "@/lib/gsap";
import { library, type ImageAsset } from "@/lib/media";
import { cx } from "@/lib/utils";
import { Lightbox } from "./Lightbox";
import { Frame } from "./ui/Frame";

const g = library.gallery;

const MOTION = "(prefers-reduced-motion: no-preference)";

/**
 * How far a picture starts above its place as its frame rises, in % of its height: it travels
 * slower than the frame, as if lying beneath the one above (the film chapters arrive the same way).
 * The two halves of a diptych rise by different amounts, so they settle at different depths.
 */
const RISE = { near: 22, far: 12 } as const;
/** The sideways travel of the panned frame, in % of its (116% wide) picture. */
const PAN = 12;
/** The last frame's slow push-in as it leaves, towards the finale, which opens close in and pulls back. */
const PUSH = 1.08;

/**
 * How each photograph moves in its frame:
 *   near / far   it rises from beneath and settles once the whole frame is on screen
 *   pan          it travels sideways through a frame narrower than itself
 *   push         it rises, then pushes in as it hands over to the finale
 */
type Move = "near" | "far" | "pan" | "push";

type Shot = {
  image: ImageAsset;
  move: Move;
  /** Width and height of the frame at each size. */
  frame: string;
  sizes: string;
};

/** Full height on desktop; the frame's own aspect below. Below 768px every frame spans the screen. */
const TALL = "lg:aspect-auto lg:h-[max(100svh,36rem)]";

/**
 * Seven photographs, in the order of the light: dusk, chrome by day and by lamplight,
 * warm lamps, then the stage and its starlight, which the finale takes up.
 */
const shots: Shot[] = [
  {
    // Sky above, the horizon's lights, then the mascot: the title sits in the sky.
    image: { ...g[1], position: "50% 55%" },
    move: "near",
    frame: cx("w-full aspect-[9/16] md:aspect-[4/5]", TALL),
    sizes: "(min-width: 1024px) 113vw, (min-width: 768px) 188vw, 267vw",
  },
  {
    image: { ...g[4], position: "50% 38%" },
    move: "near",
    frame: cx("w-full aspect-[4/5] md:w-1/2 md:aspect-[2/3]", TALL),
    sizes: "(min-width: 768px) 60vw, 100vw",
  },
  {
    // The mascot stands high in this upright print; wide crops keep it.
    image: { ...g[2], position: "50% 20%" },
    move: "far",
    frame: cx("w-full aspect-[2/3] md:w-1/2", TALL),
    sizes: "(min-width: 768px) 50vw, 100vw",
  },
  {
    // A letterbox on desktop; on phones an upright crop that pans from lamp to lamp.
    image: { ...g[3], position: "50% 50%" },
    move: "pan",
    frame: "w-full aspect-[4/5] lg:aspect-[21/9]",
    sizes: "(min-width: 1024px) 116vw, 188vw",
  },
  {
    image: { ...g[7], position: "26% 40%" },
    move: "far",
    frame: cx("w-full aspect-[2/3] md:w-1/2 lg:w-[40%]", TALL),
    sizes: "(min-width: 768px) 50vw, 100vw",
  },
  {
    image: { ...g[5], position: "50% 50%" },
    move: "near",
    frame: cx("w-full aspect-[4/3] md:w-1/2 md:aspect-[2/3] lg:w-[60%]", TALL),
    sizes: "(min-width: 1024px) 130vw, 129vw",
  },
  {
    // The car and the stage lights over it; the finale's starlight rises from beneath.
    image: { ...g[0], position: "64% 60%" },
    move: "push",
    frame: cx("w-full aspect-[4/5]", TALL),
    sizes: "(min-width: 1024px) 122vw, 203vw",
  },
];

const count = shots.length;

/**
 * Gallery: a sequence of details rather than a wall of thumbnails. Every
 * frame runs to the edges of the screen and meets the next with no ground
 * between them, from the dusk the heritage chapter ends on to the stage
 * light the finale begins in. Each picture rises from beneath the frame
 * above; the portraits pair into diptychs whose halves settle at different
 * depths; one letterboxed frame pans sideways; the last pushes in
 * as the finale arrives. Every photograph opens full screen, by pointer or
 * keyboard. Reduced motion keeps the same frames, still.
 */
export function Gallery() {
  const root = useRef<HTMLElement>(null);
  const [index, setIndex] = useState<number | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const close = useCallback(() => setIndex(null), []);

  useGSAP(
    () => {
      const scope = root.current;
      if (!scope) return;
      const mm = gsap.matchMedia();

      mm.add(MOTION, () => {
        const pass = (trigger: Element, start = "top bottom", end = "bottom top") => ({
          trigger,
          start,
          end,
          scrub: true,
          invalidateOnRefresh: true,
        });

        gsap.utils.toArray<HTMLElement>("[data-shot]", scope).forEach((frame) => {
          const picture = frame.querySelector<HTMLElement>("[data-move]");
          if (!picture) return;
          const move = frame.dataset.shot as Move;

          // The caption follows once the frame is well on screen, however the page got there.
          const caption = frame.querySelector("[data-caption]");
          if (caption) {
            gsap.set(caption, { autoAlpha: 0, y: 16 });
            onReach(frame, "top 70%", () => gsap.to(caption, { autoAlpha: 1, y: 0, duration: 1.4, delay: 0.2, ease: "expo.out" }));
          }

          if (move === "pan") {
            gsap.fromTo(picture, { xPercent: 0 }, { xPercent: -PAN, ease: "none", scrollTrigger: pass(frame) });
            return;
          }
          // Rises from beneath the frame above, and settles once the whole frame is on screen.
          const rise = RISE[move === "far" ? "far" : "near"];
          gsap.fromTo(picture, { yPercent: -rise }, { yPercent: 0, ease: "none", scrollTrigger: pass(frame, "top bottom", "bottom bottom") });
          if (move === "push") {
            const lens = frame.querySelector("[data-push]");
            if (lens) gsap.fromTo(lens, { scale: 1 }, { scale: PUSH, ease: "none", scrollTrigger: pass(frame, "bottom bottom", "bottom top") });
          }
        });
      });
    },
    { scope: root },
  );

  const open = (i: number, button: HTMLButtonElement) => {
    opener.current = button;
    setIndex(i);
  };

  return (
    <section ref={root} id="gallery" aria-labelledby="gallery-title" className="relative isolate overflow-x-clip bg-obsidian text-ivory">
      {/* The title, set in the sky of the first photograph. */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 px-page pt-[clamp(5rem,12svh,9rem)] lg:flex lg:items-end lg:justify-between lg:gap-10">
        <div>
          <p data-fade className="type-micro text-ivory/70">
            Gallery
          </p>
          <h2
            id="gallery-title"
            data-lines
            className="type-brand mt-4 text-[clamp(2.75rem,13vw,4.75rem)] font-[200] leading-[0.9] tracking-[0.04em] md:text-[clamp(4rem,11vw,7rem)] lg:mt-5 lg:text-[clamp(4.5rem,8.4vw,12rem)]"
          >
            <span className="block overflow-hidden pb-[0.06em]">
              <span data-line className="block">
                Details
              </span>
            </span>
          </h2>
        </div>
        <div data-fade className="mt-5 lg:mt-0 lg:pb-[0.5rem] lg:text-right">
          <p className="type-lede max-w-[24ch] text-ivory/85 lg:ml-auto">In the light they were made for.</p>
          <p className="type-micro mt-3 text-balance text-ivory/60">Every photograph opens full screen</p>
        </div>
      </header>

      <ol className="flex flex-wrap">
        {shots.map((shot, i) => (
          <li key={shot.image.src} data-shot={shot.move} className={cx("relative overflow-hidden bg-obsidian", shot.frame)}>
            <button
              type="button"
              onClick={(e) => open(i, e.currentTarget)}
              aria-label={`View photograph ${i + 1} of ${count}: ${shot.image.alt}`}
              data-cursor="view"
              data-cursor-label="View"
              className="group absolute inset-0 block size-full"
            >
              <span data-move className={cx("absolute block", shot.move === "pan" ? "inset-y-0 left-0 w-[116%]" : "inset-0")}>
                <span data-push={shot.move === "push" ? "" : undefined} className="absolute inset-0 block">
                  <span className="absolute inset-0 block transition-transform duration-[1600ms] ease-film group-hover:scale-[1.03]">
                    <Frame image={shot.image} sizes={shot.sizes} />
                  </span>
                </span>
              </span>
              {/* Keyboard focus, drawn inside the frame like a viewfinder: the frame clips anything outside it. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-[clamp(0.75rem,2vw,1.5rem)] border border-champagne opacity-0 group-focus-visible:opacity-100"
              />
            </button>
            {/* Ground for the caption, and no more of the frame than it needs. */}
            <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-obsidian/60 to-transparent" />
            <p aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 flex items-baseline gap-4 px-page pb-[clamp(1.25rem,4svh,2.5rem)]">
              <span data-caption className="type-caption max-w-[34ch] text-ivory/85">
                {shot.image.alt}
              </span>
            </p>
          </li>
        ))}
      </ol>

      <Lightbox items={shots.map((s) => s.image)} index={index} setIndex={setIndex} onClose={close} returnFocus={opener} />
    </section>
  );
}
