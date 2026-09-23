"use client";

import { useRef, type ComponentProps, type CSSProperties, type RefObject } from "react";
import { models, type Model } from "@/lib/content";
import { gsap, onReach, ScrollTrigger, useGSAP } from "@/lib/gsap";
import type { ImageAsset } from "@/lib/media";
import { cx, vars } from "@/lib/utils";
import { Frame } from "./ui/Frame";
import { LineCta } from "./ui/LineCta";

/** The pinned showroom needs a wide screen and permission to move; everything else gets the editorial list. */
const SHOWROOM = "(min-width: 1024px) and (prefers-reduced-motion: no-preference)";
const LIST_MOTION = "(max-width: 1023px) and (prefers-reduced-motion: no-preference)";
/** Screens of scroll each model holds the stage. */
const HOLD = 0.42;
/** Resting names: quiet, yet still legible as large text. */
const DIM = 0.4;
/** Kind captions stay readable (AA) at rest; the chosen one lifts a little. */
const CAPTION = { rest: 0.62, active: 0.92 };
/** A name must hold the pointer this long before the stage answers, so a sweep down the list stays calm. */
const INTENT = 0.12;
/** Small capitals grow a little on very wide screens instead of turning into fine print. */
const MICRO = "text-[max(0.6875rem,0.52vw)]!";

/** Focal point inside a frame, 0–1 on each axis (as object-position percentages). */
type Focus = readonly [x: number, y: number];
type Art = {
  /** Showroom stage, a near-square panel. */
  stage: Focus;
  /** The stage on squarer screens (1024 × 768 and the like), where it turns upright. */
  narrow?: Focus;
  /**
   * The car's lowest line in its stage picture, as a share of the picture's
   * height. The picture is lifted just enough for that line to clear the words below it.
   */
  clear: number;
  /** How far the picture may rise at most, as a share of the stage height (0.26); more only where the roof sits low. */
  rise?: number;
  /** An upright frame whose car would overfill the stage is drawn at this share of it, from the top right corner. */
  scale?: number;
  /** Phone frame, upright 4:5. */
  phone: Focus;
  /** Tablet and reduced-motion frame, 16:10, optionally zoomed towards the right edge. */
  wide: Focus;
  zoom?: number;
  /** High-key daylight frames get a grade on the side facing the names, so the sky melts rather than fogs. */
  grade?: boolean;
  /** Exposure lift for the darkest night frame. */
  tone?: number;
};

const ART: Record<string, Art> = {
  phantom: { stage: [0.3, 0.6], narrow: [0.42, 0.6], clear: 0.72, phone: [0.44, 0.6], wide: [1, 0.6], zoom: 1.14 },
  ghost: { stage: [0.5, 0.62], narrow: [0.62, 0.62], clear: 0.85, rise: 0.34, phone: [0.64, 0.62], wide: [0.5, 0.7] },
  cullinan: { stage: [0.12, 0.64], narrow: [0.16, 0.64], clear: 0.68, phone: [0.43, 0.64], wide: [0.4, 0.64], grade: true },
  spectre: { stage: [0.55, 0.66], clear: 0.72, phone: [0.68, 0.66], wide: [0.7, 0.66], grade: true },
  "black-badge": { stage: [0.5, 0.9], clear: 0.75, scale: 0.86, phone: [0.5, 0.8], wide: [0.5, 0.8] },
  wraith: { stage: [0.9, 0.6], narrow: [0.72, 0.6], clear: 0.8, phone: [0.9, 0.6], wide: [0.5, 0.6] },
  dawn: { stage: [1, 0.72], clear: 0.72, phone: [1, 0.72], wide: [0.5, 0.72], tone: 1.12 },
};
const FALLBACK: Art = { stage: [0.5, 0.6], clear: 0.7, phone: [0.5, 0.6], wide: [0.5, 0.6] };
const artOf = (m: Model) => ART[m.id] ?? FALLBACK;
const ratio = (image: ImageAsset) => image.width / image.height;

/** Everything the showroom says about a model, read out with its name. */
function describe(m: Model) {
  const specs = m.specs.map((s) => `${s.label}: ${s.value}.`);
  const versions = m.variants?.length ? [`Versions: ${m.variants.map((v) => `${v.name}, ${v.note}.`).join(" ")}`] : [];
  return [m.line, ...specs, ...versions].join(" ");
}

/**
 * How far a picture rises on the stage: the car's lowest line must sit 7rem
 * above its words, whose height is measured per model into --words
 * (versions add lines), plus their bottom margin. Short screens lift more;
 * very tall ones not at all.
 */
const lift = ({ clear, rise = 0.26, scale = 1 }: Art) =>
  `clamp(0px, calc(${+(clear * scale).toFixed(4)} * 100svh - 100svh + max(2.5rem, 6.5svh) + var(--words, 12rem) + 7rem), ${Math.round(rise * 100)}svh)`;

/** The stage picture fades out at its foot, and at its left edge too when it is drawn smaller than the stage. */
const FOOT = "linear-gradient(to top, transparent, #000 16%)";
const footStyle = (scale = 1): CSSProperties => {
  const mask = scale < 1 ? `${FOOT}, linear-gradient(to right, transparent, #000 26%)` : FOOT;
  return { maskImage: mask, WebkitMaskImage: mask, maskComposite: "intersect", WebkitMaskComposite: "source-in" };
};

/** Rendered width of a cover-fitted image in a box of w × h (both in vw). */
const coverVw = (ar: number, w: number, h: number, zoom = 1) => Math.ceil(Math.max(w, ar * h) * zoom);

/** Feathered wipe: 0 hides the layer, 1 shows it whole; the soft edge travels from the right towards the names. */
const WIPE = "linear-gradient(to left, #000 calc(var(--wipe) * 130% - 30%), transparent calc(var(--wipe) * 130%))";
const wipeStyle: CSSProperties = { maskImage: WIPE, WebkitMaskImage: WIPE };

type Hand = { choose: (i: number, now?: boolean) => void; release: () => void };

/**
 * The collection. On wide screens, a pinned showroom: seven names on the
 * left, one car at a time on a stage that melts into black, chosen by
 * scroll or by pointing at a name. Elsewhere, and under reduced motion,
 * an editorial list with every word and picture in plain view.
 */
export function ModelsIndex() {
  const root = useRef<HTMLElement>(null);
  const hand = useRef<Hand | null>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const mm = gsap.matchMedia();

      mm.add(SHOWROOM, (_context, contextSafe) => {
        const room = q("[data-room]")[0] as HTMLElement | undefined;
        if (!room || !contextSafe) return;
        const layers = q("[data-layer]") as HTMLElement[];
        const pictures = q("[data-picture]") as HTMLElement[];
        const names = q("[data-name]") as HTMLElement[];
        const captions = q("[data-caption]") as HTMLElement[];
        const infos = q("[data-info]") as HTMLElement[];
        const counter = q("[data-count]")[0] as HTMLElement | undefined;
        const setProgress = gsap.quickSetter(q("[data-progress]"), "scaleX");
        const count = models.length;
        let active = -1;
        let depth = 1;

        gsap.set(layers, { autoAlpha: 0 });
        gsap.set(infos, { autoAlpha: 0 });

        // Each picture rises to clear its own words, whose height changes with the model and the width.
        const measure = new ResizeObserver(() =>
          infos.forEach((info, k) => layers[k].style.setProperty("--words", `${info.offsetHeight}px`)),
        );
        infos.forEach((info) => measure.observe(info));

        /**
         * Bring one model forward. Its picture is drawn across the stage from
         * the right with a soft edge and settles; the last one dims beneath it
         * (never to black) and is put away once covered. Its words follow.
         */
        const show = contextSafe((i: number, instant = false) => {
          if (i === active) return;
          const prev = active;
          active = i;
          const t = instant ? 0 : 1;

          const layer = layers[i];
          gsap.set(layer, { zIndex: ++depth, autoAlpha: 1 });
          gsap.fromTo(
            layer,
            { "--wipe": instant ? 1 : 0 },
            {
              "--wipe": 1,
              duration: 1.4 * t,
              ease: "expo.inOut",
              overwrite: true,
              onComplete: () => {
                if (active !== i) return;
                // Everything beneath is covered now: stop any dim still running and put it away.
                layers.forEach((other, k) => k !== i && gsap.set(other, { autoAlpha: 0, overwrite: true }));
              },
            },
          );
          gsap.fromTo(pictures[i], { scale: instant ? 1 : 1.08 }, { scale: 1, duration: 3 * t, ease: "power3.out", overwrite: true });
          if (prev >= 0) gsap.to(layers[prev], { autoAlpha: 0.35, duration: 1.1 * t, ease: "power2.inOut", overwrite: "auto" });

          if (counter) counter.textContent = String(i + 1).padStart(2, "0");
          names.forEach((name, k) =>
            gsap.to(name, { opacity: k === i ? 1 : DIM, duration: 0.8 * t, ease: "power2.out", overwrite: true }),
          );
          captions.forEach((caption, k) =>
            gsap.to(caption, {
              opacity: k === i ? CAPTION.active : CAPTION.rest,
              duration: 0.8 * t,
              ease: "power2.out",
              overwrite: true,
            }),
          );

          // Only the chosen model's words can take focus, even while the last ones are still fading.
          infos.forEach((info, k) => (info.inert = k !== i));
          if (prev >= 0) {
            gsap.to(infos[prev], { autoAlpha: 0, y: -14, duration: 0.5 * t, ease: "power2.in", overwrite: true });
          }
          // The block is visible (and its link focusable) at once; only its parts ease in.
          gsap.set(infos[i], { autoAlpha: 1, y: 0, overwrite: true });
          gsap.fromTo(
            infos[i].querySelectorAll("[data-part]"),
            { opacity: 0, y: 22 },
            { opacity: 1, y: 0, duration: 1.5 * t, ease: "expo.out", stagger: 0.09 * t, delay: 0.35 * t, overwrite: true },
          );
        }) as (i: number, instant?: boolean) => void;

        // Scroll chooses the model. A name under the pointer or focus overrules it while it is held there.
        let stepped = 0;
        let pending: gsap.core.Tween | null = null;
        const pin = ScrollTrigger.create({
          trigger: room,
          start: "top top",
          end: () => `+=${Math.round(window.innerHeight * HOLD * count)}`,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate(self) {
            setProgress(self.progress);
            const i = Math.min(count - 1, Math.floor(self.progress * count));
            if (i !== stepped) {
              stepped = i;
              pending?.kill();
              show(i);
            }
          },
        });
        setProgress(pin.progress);
        stepped = Math.min(count - 1, Math.floor(pin.progress * count));
        show(stepped, true);

        hand.current = {
          choose: (i, now = false) => {
            pending?.kill();
            if (now) show(i);
            else pending = gsap.delayedCall(INTENT, () => show(i));
          },
          release: () => {
            pending?.kill();
            show(stepped);
          },
        };

        // Arrival: the stage surfaces from the dark as the room rises, then the index sets.
        const approach = { trigger: room, start: "top bottom", end: "top top", scrub: true } as const;
        gsap.fromTo(q("[data-stage-zoom]"), { scale: 1.12 }, { scale: 1, ease: "none", scrollTrigger: approach });
        gsap.fromTo(q("[data-veil]"), { autoAlpha: 1, scaleY: 1 }, { scaleY: 0, ease: "none", scrollTrigger: approach });

        const intro = gsap.timeline({ paused: true });
        intro.from(q("[data-rise]"), { yPercent: 112, duration: 1.7, ease: "expo.out", stagger: 0.07 });
        intro.from(q("[data-rise-caption]"), { autoAlpha: 0, y: 10, duration: 1.2, ease: "expo.out", stagger: 0.07 }, 0.35);
        intro.from(
          infos[stepped].querySelectorAll("[data-part]"),
          { opacity: 0, y: 22, duration: 1.5, ease: "expo.out", stagger: 0.09 },
          0.45,
        );
        onReach(room, "top 62%", () => intro.play());

        return () => {
          pending?.kill();
          measure.disconnect();
          hand.current = null;
          infos.forEach((info) => (info.inert = false));
          layers.forEach((layer) => layer.style.removeProperty("--words"));
        };
      });

      // Phones and tablets: the title rises like every other line in the list.
      mm.add(LIST_MOTION, () => {
        const title = q("#models-title [data-rise]")[0] as HTMLElement | undefined;
        if (!title?.parentElement) return;
        const rise = gsap.timeline({ paused: true });
        rise.from(title, { yPercent: 112, duration: 1.6, ease: "expo.out" });
        onReach(title.parentElement, "top 88%", () => rise.play());
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="models"
      aria-labelledby="models-title"
      className="pointer-events-none relative z-10 -mt-[45svh]"
    >
      {/* The seam: whatever came before shows through, then gives way to black. */}
      <div
        aria-hidden
        className="h-[45svh] bg-[linear-gradient(to_bottom,transparent,rgb(0_0_0/0.3)_38%,rgb(0_0_0/0.72)_72%,rgb(0_0_0/0.9))]"
      />

      <div data-room className="pointer-events-auto relative bg-obsidian lg:motion-safe:h-[100svh] lg:motion-safe:overflow-hidden">
        <h2
          id="models-title"
          className="type-statement relative z-10 px-page pb-[clamp(3rem,10vw,6.5rem)] pt-[clamp(0.5rem,3vw,2rem)] text-[clamp(2.6rem,9vw,5.5rem)] lg:motion-safe:absolute lg:motion-safe:left-0 lg:motion-safe:top-[max(6.75rem,14svh)] lg:motion-safe:p-0 lg:motion-safe:px-page lg:motion-safe:text-[clamp(1.9rem,2.5vw,3.25rem)]"
        >
          <span className="block overflow-hidden pb-[0.1em]">
            <span data-rise className="block">
              The collection
            </span>
          </span>
        </h2>

        <Showroom hand={hand} />
      </div>

      <List />
    </section>
  );
}

/* ---------- Pictures ---------- */

/**
 * A cover-fitted photograph drawn in its own coordinates (container units
 * emulate object-fit: cover), so the focal point can change per breakpoint
 * through --fx / --fy.
 */
function Photo({
  image,
  sizes,
  quality,
  className,
  style,
}: {
  image: ImageAsset;
  sizes: string;
  quality: 75 | 85;
  className?: string;
  style?: CSSProperties;
}) {
  const ar = ratio(image);
  const w = `max(100cqw, ${(ar * 100).toFixed(3)}cqh)`;
  const h = `max(100cqh, ${(100 / ar).toFixed(3)}cqw)`;
  return (
    <div className={cx("absolute inset-0 overflow-hidden [container-type:size]", className)} style={style}>
      <div
        className="absolute"
        style={{
          width: w,
          height: h,
          left: `calc((100cqw - ${w}) * var(--fx, 0.5))`,
          top: `calc((100cqh - ${h}) * var(--fy, 0.5))`,
        }}
      >
        <Frame image={{ ...image, position: undefined }} sizes={sizes} quality={quality} />
      </div>
    </div>
  );
}

/**
 * Further versions of a model, a quieter tier under its figures and on the
 * same columns: each name in small capitals over its note. A single version
 * takes the whole row. On the stage, which already names the model, a
 * version drops that name from its own ("Extended"), still read out in full.
 */
function Versions({ model, stage, className, ...rest }: { model: Model; stage?: boolean } & ComponentProps<"ul">) {
  if (!model.variants?.length) return null;
  const own = `${model.name} `;
  return (
    <ul aria-label={`${model.name} versions`} className={cx("grid", className)} {...rest}>
      {model.variants.map((v) => (
        <li key={v.name} className="only:col-span-full">
          <span className={cx("type-micro block text-ivory/80", stage && MICRO)}>
            {stage && v.name.startsWith(own) ? (
              <>
                <span className="sr-only">{own}</span>
                {v.name.slice(own.length)}
              </>
            ) : (
              v.name
            )}
          </span>
          <span
            className={cx(
              "type-caption mt-1 block leading-snug text-ivory/60",
              stage && "text-[max(0.875rem,0.72vw)]",
            )}
          >
            {v.note}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Showroom (wide screens, motion allowed) ---------- */

function Showroom({ hand }: { hand: RefObject<Hand | null> }) {
  return (
    <div
      className="absolute inset-0 hidden lg:motion-safe:block"
      // Focus hands the stage back only once it leaves the showroom, so Tab from a name reaches that model's own link.
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) hand.current?.release();
      }}
    >
      {/* Stage: every car stacked, the chosen one on top. Feathered into the black on the side facing the names. */}
      <div className="absolute inset-y-0 right-0 w-[64%] [mask-image:linear-gradient(to_right,transparent,rgb(0_0_0/0.12)_14%,rgb(0_0_0/0.45)_26%,#000_40%)]"
      >
        <div data-stage-zoom className="absolute inset-0">
          {models.map((m, i) => {
            const art = artOf(m);
            const scale = art.scale ?? 1;
            return (
              <div
                key={m.id}
                data-layer
                className={cx(
                  // Backed with black, so a wipe covers the last car even where this picture is lifted or drawn smaller.
                  "absolute inset-0 bg-obsidian [--fx:var(--fx-s)] [--fy:var(--fy-s)] [@media(max-aspect-ratio:3/2)]:[--fx:var(--fx-n)] [@media(max-aspect-ratio:3/2)]:[--fy:var(--fy-n)]",
                  i !== 0 && "invisible opacity-0",
                )}
                style={{
                  ...wipeStyle,
                  ...vars({
                    "--wipe": 1,
                    "--fx-s": art.stage[0],
                    "--fy-s": art.stage[1],
                    "--fx-n": (art.narrow ?? art.stage)[0],
                    "--fy-n": (art.narrow ?? art.stage)[1],
                    "--lift": lift(art),
                  }),
                }}
              >
                {/* Lifted so the car clears the words; its lower edge fades out before the shade takes over. */}
                <div
                  data-picture
                  className="absolute right-0"
                  style={{
                    top: "calc(-1 * var(--lift))",
                    width: `${Math.round(scale * 100)}%`,
                    height: `${Math.round(scale * 100)}%`,
                  }}
                >
                  <Photo
                    image={m.image}
                    sizes={`max(${Math.ceil(64 * scale)}vw, ${Math.ceil(ratio(m.image) * 100 * scale)}vh)`}
                    quality={85}
                    style={{ ...footStyle(scale), filter: art.tone ? `brightness(${art.tone})` : undefined }}
                  />
                </div>
                {art.grade && (
                  <div aria-hidden className="absolute inset-y-0 left-0 w-[45%] bg-gradient-to-r from-obsidian/50 via-obsidian/10 to-transparent" />
                )}
              </div>
            );
          })}
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-[26%] bg-gradient-to-b from-obsidian/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[66%] bg-[linear-gradient(to_top,#000_0_14%,rgb(0_0_0/0.72)_34%,rgb(0_0_0/0.28)_66%,transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_85%_100%,rgb(0_0_0/0.6),transparent)]" />
        </div>
        {/* While the room rises its top edge stays soft; the shade draws up as it arrives. */}
        <div
          data-veil
          aria-hidden
          className="pointer-events-none invisible absolute inset-x-0 top-0 h-[52%] origin-top bg-[linear-gradient(to_bottom,rgb(0_0_0/0.88),rgb(0_0_0/0.66)_26%,rgb(0_0_0/0.28)_62%,transparent)]"
        />
      </div>

      {/* Where the scroll stands in the collection: an instrument line under the title, always on black. It sets with the captions. */}
      <div
        aria-hidden
        data-rise-caption
        className={cx(
          "type-micro absolute left-0 top-[calc(max(6.75rem,14svh)+clamp(1.9rem,2.5vw,3.25rem)*1.1+clamp(0.875rem,2.2svh,1.75rem))] z-10 flex items-center gap-4 px-page tabular-nums text-ivory/70",
          MICRO,
        )}
      >
        <span className="relative block h-px w-[clamp(3.5rem,6vw,7rem)] overflow-hidden bg-ivory/20">
          <span data-progress className="absolute inset-0 origin-left bg-champagne" style={{ transform: "scaleX(0)" }} />
        </span>
      </div>

      {/* Index. Pointing at a name (or focusing it) shows that car; leaving the list hands the stage back to the scroll. */}
      <ol
        className="absolute bottom-[max(2.5rem,6.5svh)] left-0 z-10 px-page"
        onPointerLeave={() => hand.current?.release()}
      >
        {models.map((m, i) => (
          <li key={m.id}>
            <a
              href={m.href}
              data-cursor="link"
              aria-describedby={`models-desc-${m.id}`}
              onPointerEnter={() => hand.current?.choose(i)}
              onFocus={() => hand.current?.choose(i, true)}
              className="flex w-fit items-start gap-[0.9vw] py-[0.08em] text-[min(4.1vw,6.4svh)] leading-none"
            >
              <span data-name className={cx("block overflow-hidden pb-[0.04em]", i !== 0 && "opacity-40")}>
                <span data-rise className="type-brand block font-[200] tracking-[0.02em]">
                  {m.name}
                </span>
              </span>
              <span
                data-caption
                className={cx(
                  "type-caption mt-[0.1em] block max-w-[9.5rem] text-[max(0.8125rem,0.72vw)] leading-[1.3] text-ivory",
                  i === 0 ? "opacity-[0.92]" : "opacity-[0.62]",
                )}
              >
                <span data-rise-caption className="block">
                  {m.kind}
                </span>
              </span>
            </a>
            <p id={`models-desc-${m.id}`} className="sr-only">
              {describe(m)}
            </p>
          </li>
        ))}
      </ol>

      {/* Words for the chosen model, stacked in one cell so each can crossfade over the last. */}
      <div className="absolute bottom-[max(2.5rem,6.5svh)] right-[clamp(1.25rem,4.5vw,5.5rem)] z-10 grid w-[35vw]">
        {models.map((m, i) => (
          <div key={m.id} data-info className={cx("self-end [grid-area:1/1]", i !== 0 && "invisible opacity-0")}>
            <p data-part className="type-statement text-balance text-[clamp(1.75rem,2.4vw,3.75rem)]">
              {m.line}
            </p>
            <dl
              data-part
              className="mt-[clamp(1rem,2.4svh,2rem)] grid grid-cols-3 gap-x-[1.5vw] border-t border-ivory/15 pt-5"
            >
              {m.specs.map((s) => (
                <div key={s.label}>
                  <dt className={cx("type-micro text-ivory/55", MICRO)}>{s.label}</dt>
                  <dd className="mt-2.5 text-[max(0.9375rem,0.78vw)] leading-snug text-ivory/90">{s.value}</dd>
                </div>
              ))}
            </dl>
            <Versions
              model={m}
              stage
              data-part
              className="mt-[clamp(0.875rem,2svh,1.5rem)] grid-cols-3 gap-x-[1.5vw] border-t border-ivory/10 pt-[clamp(0.75rem,1.6svh,1.25rem)]"
            />
            <div data-part className="mt-[clamp(1rem,2.4svh,2rem)]">
              <LineCta href={m.href} label={`Explore ${m.name}`} arrow="always" className={MICRO} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Editorial list (phones, tablets, reduced motion) ---------- */

/** Cover width of each list frame: 4:5 on phones, 16:10 on tablets, 8 of 12 columns at 16:10 on wide screens. */
function listSizes(m: Model) {
  const ar = ratio(m.image);
  const zoom = artOf(m).zoom ?? 1;
  // The list frames settle from 1.2x as they unveil, so each hint carries that extra fifth.
  return `(min-width: 1024px) ${coverVw(ar, 66.7, 41.7, zoom * 1.2)}vw, (min-width: 768px) ${coverVw(ar, 100, 62.5, zoom * 1.2)}vw, ${coverVw(ar, 100, 125, 1.2)}vw`;
}

function List() {
  return (
    <ol className="pointer-events-auto bg-obsidian pb-[clamp(5rem,14vw,10rem)] lg:motion-safe:hidden">
      {models.map((m) => {
        const art = artOf(m);
        const words = m.name.split(" ");
        return (
          <li
            key={m.id}
            className="relative [&+&]:mt-[clamp(5rem,16vw,10rem)] md:[&+&]:mt-[clamp(4rem,9vw,7rem)] lg:grid lg:grid-cols-12 lg:items-end lg:[&+&]:mt-[clamp(1rem,3vw,4rem)]"
          >
            <div
              data-unveil="up"
              className="relative aspect-[4/5] w-full overflow-hidden md:aspect-[16/10] lg:col-span-8 lg:col-start-5 lg:row-start-1"
            >
              {/* The soft edges live on their own layer, so the shutter opens without repainting the photograph every frame. */}
              <div className="absolute inset-0 [transform:translateZ(0)] [mask-image:linear-gradient(to_bottom,transparent,#000_14%,#000_56%,transparent)] lg:[mask-composite:intersect] lg:[mask-image:linear-gradient(to_right,transparent,#000_34%),linear-gradient(to_bottom,transparent,#000_14%,#000_70%,transparent)]">
                <div data-unveil-inner className="absolute inset-0">
                  <div
                    style={vars({
                      "--fx-p": art.phone[0],
                      "--fy-p": art.phone[1],
                      "--fx-w": art.wide[0],
                      "--fy-w": art.wide[1],
                      "--zoom": art.zoom ?? 1,
                    })}
                    className="absolute inset-0 origin-right [--fx:var(--fx-p)] [--fy:var(--fy-p)] md:[--fx:var(--fx-w)] md:[--fy:var(--fy-w)] md:[scale:var(--zoom)]"
                  >
                    <Photo
                      image={m.image}
                      sizes={listSizes(m)}
                      quality={75}
                      style={art.tone ? { filter: `brightness(${art.tone})` } : undefined}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 -mt-[clamp(4.5rem,17vw,8rem)] px-page md:grid md:grid-cols-[1fr_1.2fr] md:gap-x-10 lg:col-span-7 lg:col-start-1 lg:row-start-1 lg:mt-0 lg:block lg:pb-[6%]">
              <div className="md:col-span-2">
                <h3
                  data-lines
                  className="type-brand text-[min(13vw,5.75rem)] font-[200] leading-[0.95] tracking-[0.02em] md:flex md:flex-wrap md:gap-x-[0.3em] md:text-[min(9.2vw,5.75rem)] lg:text-[min(4.4vw,6rem)]"
                >
                  {words.map((word, k) => (
                    <span key={word} className="block overflow-hidden pb-[0.05em]">
                      <span data-line className="block">
                        {word}
                        {k < words.length - 1 ? " " : ""}
                      </span>
                    </span>
                  ))}
                </h3>
                <p data-fade className="type-caption mt-2 text-ivory/70">
                  {m.kind}
                </p>
              </div>

              <p data-fade className="type-statement mt-8 text-balance text-[clamp(1.6rem,5.6vw,3.25rem)] md:mt-10">
                {m.line}
              </p>

              <div data-fade className="mt-8 md:mt-10 lg:max-w-[34rem]">
                <dl className="border-t border-ivory/15 md:grid md:grid-cols-3 md:gap-x-6 md:pt-5">
                  {m.specs.map((s) => (
                    <div
                      key={s.label}
                      className="flex items-baseline justify-between gap-6 border-b border-ivory/10 py-3.5 md:block md:border-0 md:py-0"
                    >
                      <dt className="type-micro text-ivory/55">{s.label}</dt>
                      <dd className="text-right text-[0.9375rem] leading-snug text-ivory/90 md:mt-2.5 md:text-left">{s.value}</dd>
                    </div>
                  ))}
                </dl>
                <Versions model={m} className="mt-6 gap-y-4 md:mt-8 md:border-t md:border-ivory/10 md:pt-5" />
                <div className="mt-7 md:mt-8">
                  <LineCta href={m.href} label={`Explore ${m.name}`} arrow="always" />
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
