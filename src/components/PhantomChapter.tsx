"use client";

import { useRef, type CSSProperties } from "react";
import { models } from "@/lib/content";
import { gsap, onReach, useGSAP } from "@/lib/gsap";
import { library } from "@/lib/media";
import { cx, vars } from "@/lib/utils";
import { Frame } from "./ui/Frame";
import { LineCta } from "./ui/LineCta";

const shots = library.phantom;
const phantom = models.find((m) => m.id === "phantom") ?? models[0];
const extended = phantom.variants?.find((v) => v.name.endsWith("Extended"));
const NAME = "Phantom";

/** Published wheelbases in millimetres: the standard car, and the Extended's (the variant note carries the difference). */
const WHEELBASE = { standard: 3552, extended: 3772 } as const;
/** Where the standard car's mark falls along the Extended's dimension line. */
const STANDARD_SHARE = `${(WHEELBASE.standard / WHEELBASE.extended) * 100}%`;
const millimetres = (n: number) => n.toLocaleString("en-GB");

/** "220 mm more, all of it in the rear" set as lines broken at its comma, closed with a full stop. */
const noteLines = (note: string) => {
  const parts = note.split(/,\s*/);
  return parts.map((part, i) => (i < parts.length - 1 ? `${part},` : `${part}.`));
};

/** Clip states for the opening frame: a picture parting from its centre line. */
const OPEN = "inset(0% 0% 0% 0%)";
/** The opening frame's doors start ajar, so the parting is seen while the frame is still arriving. */
const AJAR = "inset(0% 26% 0% 26%)";
const LEVEL = "inset(50% 0% 50% 0%)";

/**
 * The grille close-up is cut from the full photograph rather than fitted to
 * it. The layer keeps the photograph's 3:2 shape and is sized in container
 * units of the frame, wide enough that the cut always covers it (with room
 * for the drift). The badge, 38.3% across the photograph, stands on the centre
 * line, and the cut starts 39% down, so the frame holds the badge above the
 * vanes and leaves out the signage reflected in the bonnet above them.
 */
const GRILLE_CUT: CSSProperties = {
  ...vars({ "--ph-gw": "max(258cqh, 131cqw)" }),
  width: "var(--ph-gw)",
  aspectRatio: "3 / 2",
  left: "calc(50cqw - var(--ph-gw) * 0.383)",
  top: "calc(var(--ph-gw) / 1.5 * -0.39)",
};

/**
 * The closing frame is cut from the opening photograph, closer in. The layer
 * keeps the photograph's 16:9 shape and is sized in container units of the
 * frame (--ph-hw, set per layout on the frame), always large enough to cover
 * it. The car's centre, 47% across and 56.5% down the photograph, is placed at
 * (--ph-cx, --ph-cy), and the push closes in on that point.
 */
const HERO_CUT: CSSProperties = {
  width: "var(--ph-hw)",
  aspectRatio: "16 / 9",
  left: "calc(var(--ph-cx) - var(--ph-hw) * 0.47)",
  top: "calc(var(--ph-cy) - var(--ph-hw) * 0.5625 * 0.565)",
  transformOrigin: "47% 56.5%",
};

/**
 * Masked lines and letters rise into place. y is pinned to 0 at both ends, so
 * a transform left behind by an earlier run (a StrictMode re-run, or scroll
 * restoration on reload) can never hold them down under their mask.
 */
const sunk = (yPercent = 115) => ({ y: 0, yPercent });
const risen = { y: 0, yPercent: 0 };

const WIDE = "(min-width: 1024px)";
const MOTION = "(prefers-reduced-motion: no-preference)";

/** A hairline (colour given by the caller). Drawn in from its origin by the chapter timelines; fully drawn without them. */
function Rule({
  className,
  style,
  ...data
}: { className?: string; style?: CSSProperties } & Record<`data-${string}`, string>) {
  return <span aria-hidden {...data} style={style} className={cx("pointer-events-none block", className)} />;
}

/** Lines that rise from behind a mask. A trailing space keeps the sentence whole for screen readers. */
function Lines({ lines, className }: { lines: string[]; className?: string }) {
  return (
    <p className={className}>
      {lines.map((line, i) => (
        <span key={line} className="-mb-[0.14em] block overflow-hidden pb-[0.14em]">
          <span data-ph-line className="block">
            {line}
          </span>
          {i < lines.length - 1 && " "}
        </span>
      ))}
    </p>
  );
}

/**
 * A pair of shaded leaves over a full-bleed picture, meeting on its centre
 * line. The timelines slide them apart as the picture rises into view, so it
 * opens like a pair of doors while it is already on screen. Each leaf is a
 * hairline edge with its shade feathered in behind it, never opaque, so the
 * picture is always seen through them. Without the timelines they stay hidden.
 */
function Leaves({ id }: { id: string }) {
  const leaf = "invisible absolute inset-y-0 w-1/2 border-ivory/35 from-transparent to-obsidian/60 to-45%";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <span data-ph-leaf={`${id}-l`} className={cx(leaf, "left-0 border-r bg-linear-to-l")} />
      <span data-ph-leaf={`${id}-r`} className={cx(leaf, "right-0 border-l bg-linear-to-r")} />
    </div>
  );
}

/**
 * The Extended's wheelbase as an architect's dimension line: ticked at both
 * ends, marked where the standard car's wheelbase ends, and carried on by the
 * extra length in champagne. The figure reads the whole line.
 */
function Wheelbase({ className }: { className?: string }) {
  return (
    <div data-ph-e-dim className={className}>
      <p className="sr-only">
        Wheelbase: {NAME} {millimetres(WHEELBASE.standard)} mm, {extended?.name} {millimetres(WHEELBASE.extended)} mm.
      </p>
      <div aria-hidden>
        <div data-ph-e-read className="flex items-end justify-between gap-6">
          <span className="type-micro pb-1 text-pewter">Wheelbase</span>
          <span className="type-brand text-[clamp(1.35rem,2.3vw,2.6rem)] font-[250] leading-none tracking-[0.02em] tabular-nums">
            <span data-ph-e-count>{millimetres(WHEELBASE.extended)}</span>
            <span className="ml-[0.3em] text-[0.5em] tracking-[0.12em] text-ivory/70">mm</span>
          </span>
        </div>
        <div className="relative mt-4 h-3">
          <Rule data-ph-e-tick="start" className="absolute inset-y-0 left-0 w-px origin-bottom bg-ivory/70" />
          <Rule
            data-ph-e-run="standard"
            className="absolute left-0 top-1/2 h-px origin-left bg-ivory/60"
            style={{ width: STANDARD_SHARE }}
          />
          <Rule
            data-ph-e-mark=""
            className="absolute inset-y-0 w-px bg-ivory/70"
            style={{ left: `calc(${STANDARD_SHARE} - 1px)` }}
          />
          <Rule
            data-ph-e-run="more"
            className="absolute right-0 top-1/2 h-px origin-left bg-champagne"
            style={{ left: STANDARD_SHARE }}
          />
          <Rule data-ph-e-tick="end" className="absolute inset-y-0 right-0 w-px origin-bottom bg-champagne" />
        </div>
        <div data-ph-e-mark="" className="mt-3 grid" style={{ gridTemplateColumns: `${STANDARD_SHARE} 1fr` }}>
          <span className="type-micro pr-3 text-right text-pewter">
            {NAME} {millimetres(WHEELBASE.standard)}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Chapter one, Phantom: quiet, architectural, symmetric.
 *
 * Every picture fills the frame and arrives the same way, parting from its
 * centre line like a pair of doors, then holds with a slow push. Fine
 * hairlines draw in to frame each composition. The opening frame holds for a
 * moment while the name is lowered into place beneath two plumb lines at the
 * thirds; the closing frame returns to the same car, closer, and draws the
 * Extended's wheelbase beneath it.
 *
 * Reduced motion gets the same composition, fully drawn and unpinned.
 */
export function PhantomChapter() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const mm = gsap.matchMedia();

      mm.add({ wide: WIDE, motion: MOTION }, (context) => {
        const { wide, motion } = context.conditions as { wide: boolean; motion: boolean };
        if (!motion) return;
        const pass = (trigger: Element) => ({
          trigger,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true,
        });
        /** A clip that opens from a centre line as its frame rises into view. */
        const part = (target: Element[], trigger: Element, from: string, start: string, end: string) =>
          gsap.fromTo(target, { clipPath: from }, {
            clipPath: OPEN,
            ease: "power2.out",
            scrollTrigger: { trigger, start, end, scrub: 0.6, invalidateOnRefresh: true },
          });
        /** Doors: the leaves over a picture slide apart from its centre line as it rises into view. */
        const doors = (id: string, trigger: Element, start: string, end: string) =>
          gsap
            .timeline({
              defaults: { ease: "power2.inOut" },
              scrollTrigger: { trigger, start, end, scrub: 0.6, invalidateOnRefresh: true },
            })
            .fromTo(q(`[data-ph-leaf="${id}-l"]`), { autoAlpha: 1, xPercent: 0 }, { autoAlpha: 1, xPercent: -101 }, 0)
            .fromTo(q(`[data-ph-leaf="${id}-r"]`), { autoAlpha: 1, xPercent: 0 }, { autoAlpha: 1, xPercent: 101 }, 0);
        /**
         * Plays once, the first time its block comes into view (or at once if the page opens past it).
         * The timeline is filled before its trigger exists, so an immediate play never meets an empty timeline.
         */
        const rise = (trigger: Element, start: string, build: (tl: gsap.core.Timeline) => void) => {
          const tl = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } });
          build(tl);
          onReach(trigger, start, () => tl.play());
        };
        const lines = (block: Element) => block.querySelectorAll("[data-ph-line]");

        /* A. Arrival: the doors, already ajar, part fully as the frame locks into place. */
        gsap
          .timeline({
            defaults: { ease: "none" },
            scrollTrigger: { trigger: el, start: "top bottom", end: "top 20%", scrub: 0.6, invalidateOnRefresh: true },
          })
          .fromTo(q("[data-ph-a-doors]"), { clipPath: AJAR }, { clipPath: OPEN, duration: 1, ease: "power1.inOut" }, 0)
          .fromTo(q("[data-ph-a-far]"), { scale: 1.07 }, { scale: 1, duration: 1 }, 0);

        // Then a brief hold: the push completes, the plumb lines draw down and the name is lowered in.
        gsap
          .timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: q("[data-ph-stage]")[0],
              start: "top top",
              end: wide ? "+=90%" : "+=60%",
              pin: true,
              scrub: 0.8,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          })
          .fromTo(q("[data-ph-a-near]"), { scale: 1.05 }, { scale: 1, duration: 1 }, 0)
          .fromTo(q("[data-ph-plumb]"), { scaleY: 0 }, { scaleY: 1, duration: 0.34, ease: "power2.inOut" }, 0.02)
          .fromTo(
            q("[data-ph-letter]"),
            sunk(118),
            { ...risen, duration: 0.3, ease: "power3.out", stagger: { each: 0.035, from: "center" } },
            0.2,
          )
          .fromTo(q("[data-ph-kind]"), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.2, ease: "power2.out" }, 0.48);

        /* B. Presence: the doors part on the head-on car, a centre line is lowered to the words, a beam draws under the figures. */
        const presence = q("[data-ph-b]")[0];
        doors("b", presence, "top 96%", "top 40%");
        gsap.fromTo(q("[data-ph-b-push]"), { scale: 1 }, { scale: 1.08, ease: "none", scrollTrigger: pass(presence) });
        const statement = q("[data-ph-b-statement]")[0];
        rise(statement, "top 80%", (tl) =>
          tl
            .fromTo(q("[data-ph-b-plumb]"), { scaleY: 0 }, { scaleY: 1, duration: 1.3, ease: "power2.inOut" }, 0)
            .fromTo(lines(statement), sunk(), { ...risen, duration: 1.6, stagger: 0.1 }, 0.45),
        );
        const specs = q("[data-ph-specs]")[0];
        rise(specs, "top 90%", (tl) =>
          tl
            .fromTo(q("[data-ph-beam]"), { scaleX: 0 }, { scaleX: 1, duration: 1.6, ease: "power3.inOut" }, 0)
            .fromTo(q("[data-ph-spec]"), { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 1.4, stagger: 0.12 }, 0.4),
        );

        /* C. The grille opens along its horizon, then drifts. */
        const grille = q("[data-ph-c]")[0];
        part(q("[data-ph-c-doors]"), grille, LEVEL, "top bottom", wide ? "top 42%" : "top 62%");
        gsap.fromTo(q("[data-ph-c-drift]"), { yPercent: -2.4 }, { yPercent: 2.4, ease: "none", scrollTrigger: pass(grille) });
        rise(q("[data-ph-c-caption]")[0], "top 90%", (tl) =>
          tl
            .fromTo(q("[data-ph-c-rule]"), { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: "power3.inOut" }, 0)
            .fromTo(q("[data-ph-c-text]"), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 1.4 }, 0.3),
        );

        /* D. The cabin: the doors part, the picture drifts, the words settle over its shaded side. */
        const cabin = q("[data-ph-d-frame]")[0];
        doors("d", cabin, "top 96%", wide ? "top 40%" : "top 50%");
        gsap.fromTo(q("[data-ph-d-drift]"), { yPercent: -4 }, { yPercent: 4, ease: "none", scrollTrigger: pass(cabin) });
        const cabinWords = q("[data-ph-d-statement]")[0];
        rise(cabinWords, "top 85%", (tl) =>
          tl
            .fromTo(q("[data-ph-d-rule]"), { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: "power3.inOut" }, 0)
            .fromTo(lines(cabinWords), sunk(), { ...risen, duration: 1.6, stagger: 0.1 }, 0.25),
        );

        /* E. Extended: back to the opening car, closer; a slow push while the wheelbase is drawn beneath it. */
        const close = q("[data-ph-e-frame]")[0];
        doors("e", close, "top 96%", wide ? "top 40%" : "top 50%");
        gsap.fromTo(q("[data-ph-e-push]"), { scale: 1 }, { scale: 1.06, ease: "none", scrollTrigger: pass(q("[data-ph-e]")[0]) });
        const words = q("[data-ph-e-copy]")[0];
        if (words) {
          rise(words, "top 85%", (tl) =>
            tl
              .fromTo(q("[data-ph-e-kind]"), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 1.2 }, 0)
              .fromTo(lines(words), sunk(), { ...risen, duration: 1.6, stagger: 0.1 }, 0.2),
          );
        }
        // The line runs to the standard car's mark, then on by the Extended's extra length while the figure counts it.
        const dimension = q("[data-ph-e-dim]")[0];
        const figure = q("[data-ph-e-count]")[0];
        if (dimension && figure) {
          const reading = { mm: WHEELBASE.standard as number };
          const show = () => (figure.textContent = millimetres(Math.round(reading.mm)));
          show();
          rise(dimension, "top 92%", (tl) =>
            tl
              .fromTo(q("[data-ph-e-read]"), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 1.2 }, 0)
              .fromTo(q('[data-ph-e-tick="start"]'), { scaleY: 0 }, { scaleY: 1, duration: 0.5, ease: "power2.out" }, 0.1)
              .fromTo(q('[data-ph-e-run="standard"]'), { scaleX: 0 }, { scaleX: 1, duration: 1.6, ease: "power2.inOut" }, 0.2)
              .fromTo(q("[data-ph-e-mark]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, ease: "power1.out" }, 1.55)
              .fromTo(q('[data-ph-e-run="more"]'), { scaleX: 0 }, { scaleX: 1, duration: 1.3, ease: "power1.inOut" }, 1.85)
              .to(reading, { mm: WHEELBASE.extended, duration: 1.3, ease: "power1.inOut", onUpdate: show }, 1.85)
              .fromTo(q('[data-ph-e-tick="end"]'), { scaleY: 0 }, { scaleY: 1, duration: 0.5, ease: "power2.out" }, 3.05),
          );
        }
        rise(q("[data-ph-e-cta]")[0], "top 96%", (tl) =>
          tl.fromTo(q("[data-ph-e-cta]"), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 1.4 }, 0.6),
        );

        return () => {
          if (figure) figure.textContent = millimetres(WHEELBASE.extended);
        };
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="phantom" aria-labelledby="phantom-title" className="relative bg-obsidian text-ivory">
      {/* ---------- A. The name ---------- */}
      <div data-ph-stage className="relative h-[100svh] min-h-[32rem] overflow-hidden [--ph-title-top:max(7rem,19svh)]">
        <div data-ph-a-doors className="absolute inset-0 overflow-hidden">
          <div data-ph-a-far className="absolute inset-0 will-change-transform">
            {/* Landscape screens widen the picture and anchor it right, so the grille stands on the centre line beneath the name. */}
            <div data-ph-a-near className="absolute inset-0 landscape:-left-[22%] landscape:origin-[58%_52%]">
              <Frame
                image={shots.hero}
                sizes="(orientation: portrait) 178vh, 122vw"
                quality={85}
                className="portrait:object-[60%_58%]!"
              />
            </div>
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-0 top-0 h-[56%] bg-linear-to-b from-obsidian/70 via-obsidian/35 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-[26%] bg-linear-to-t from-obsidian via-obsidian/40 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,transparent_55%,rgb(0_0_0/0.4)_100%)]" />
          </div>
        </div>

        {/* Two plumb lines at the thirds, drawn down to the name. */}
        <Rule data-ph-plumb="" className="absolute left-1/3 top-0 h-[calc(var(--ph-title-top)-1.1rem)] w-px origin-top bg-ivory/55" />
        <Rule data-ph-plumb="" className="absolute left-2/3 top-0 h-[calc(var(--ph-title-top)-1.1rem)] w-px origin-top bg-ivory/55" />

        <div className="absolute inset-x-0 top-[var(--ph-title-top)] px-page text-center">
          <h2
            id="phantom-title"
            className="type-brand whitespace-nowrap text-[min(12.2vw,15rem)] font-[200] leading-[0.8] tracking-[0.04em] text-ivory"
          >
            <span className="sr-only">{NAME}</span>
            <span aria-hidden className="-my-[0.08em] inline-block overflow-hidden py-[0.08em] pl-[0.04em]">
              {NAME.split("").map((letter, i) => (
                <span key={i} data-ph-letter className="inline-block">
                  {letter}
                </span>
              ))}
            </span>
          </h2>
          <p data-ph-kind className="type-micro mt-[clamp(1.25rem,2.6svh,2.25rem)] text-ivory/80">
            {phantom.kind}
          </p>
        </div>
      </div>

      {/* ---------- B. Presence ---------- */}
      {/*
        The head-on car, full bleed and taller than the screen: the words stand in the
        dusk above its roofline, the figures on the ground beneath its bumper. On phones
        the picture stops short of the block and feathers into the ground, so the
        stacked figures sit beneath the car rather than across it.
      */}
      <div data-ph-b className="relative h-[178vw] overflow-hidden md:h-[150vw] lg:h-[min(150vw,175svh)]">
        <div className="absolute inset-x-0 top-0 h-[156vw] overflow-hidden md:h-full">
          <div data-ph-b-push className="absolute inset-0 origin-[50%_62%]">
            <Frame
              image={shots.front}
              sizes="(min-width: 768px) 108vw, 114vw"
              quality={85}
              className="brightness-[0.86] saturate-[0.5]"
            />
          </div>
          {/* The daylight sky is taken down to dusk above the car, and the drive into the ground beneath it. */}
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_bottom,#000,rgb(0_0_0/0.78)_12%,rgb(0_0_0/0.5)_28%,transparent_44%,transparent_72%,rgb(0_0_0/0.62)_88%,#000)] md:bg-[linear-gradient(to_bottom,#000,rgb(0_0_0/0.74)_10%,rgb(0_0_0/0.42)_24%,transparent_38%,transparent_70%,rgb(0_0_0/0.6)_86%,#000)]"
          />
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_58%,transparent_50%,rgb(0_0_0/0.45)_100%)]" />
        </div>
        <Leaves id="b" />

        <div data-ph-b-statement className="absolute inset-x-0 top-0 px-page text-center">
          {/* The centre line, lowered from the frame's top edge to the words. */}
          <Rule data-ph-b-plumb="" className="mx-auto h-[clamp(2.75rem,9svh,7.5rem)] w-px origin-top bg-ivory/45" />
          <Lines
            lines={["An expression of", "uncompromising", "presence."]}
            className="type-statement mx-auto mt-[clamp(1rem,2.6svh,2.25rem)] text-[clamp(1.85rem,8vw,3.4rem)] lg:text-[clamp(2.2rem,3.5vw,4.8rem)]"
          />
        </div>

        <div data-ph-specs className="absolute inset-x-0 bottom-[clamp(1.25rem,4.5%,5rem)] px-page">
          <Rule data-ph-beam="" className="mx-auto h-px w-full max-w-[max(52rem,58vw)] origin-center bg-ivory/35" />
          <dl className="mx-auto grid max-w-[max(52rem,58vw)] grid-cols-2 gap-y-4 pt-5 text-center md:grid-cols-3 md:pt-[clamp(1.5rem,3svh,2.5rem)]">
            {phantom.specs.map((spec, i) => (
              <div
                key={spec.label}
                data-ph-spec
                className={cx(
                  "px-3",
                  i === 0 && "col-span-2 md:col-span-1",
                  i === 1 && "md:border-l md:border-ivory/20",
                  i > 1 && "border-l border-ivory/20",
                )}
              >
                <dt className="type-micro text-pewter">{spec.label}</dt>
                <dd className="type-brand mt-2.5 whitespace-nowrap text-[clamp(1.05rem,4.4vw,1.5rem)] font-[250] leading-none tracking-[0.02em] md:text-[clamp(1.2rem,1.8vw,2.4rem)] lg:mt-3">
                  {spec.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* ---------- C. The grille ---------- */}
      <figure data-ph-c className="relative h-[min(100svh,150vw)] lg:h-[100svh] lg:min-h-[36rem]">
        <div data-ph-c-doors className="absolute inset-0 overflow-hidden [container-type:size]">
          {/* The badge above the vanes, cut on the centre line (see GRILLE_CUT). */}
          <div data-ph-c-drift className="absolute" style={GRILLE_CUT}>
            <Frame image={shots.grille} sizes="(orientation: portrait) 390vw, max(259vh, 131vw)" quality={85} />
          </div>
          <div aria-hidden className="absolute inset-x-0 top-0 h-[14%] bg-linear-to-b from-obsidian to-transparent" />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_58%,rgb(0_0_0/0.5)_86%,#000)] lg:bg-[linear-gradient(to_bottom,transparent_50%,rgb(0_0_0/0.6)_80%,#000)]"
          />
        </div>
        <figcaption data-ph-c-caption className="absolute inset-x-0 bottom-[max(2.75rem,12%)] px-page text-center">
          <Rule data-ph-c-rule="" className="mx-auto mb-6 h-px w-16 origin-center bg-ivory/45" />
          <span data-ph-c-text className="type-caption mx-auto block max-w-[27rem] text-balance text-ivory/85 md:text-[1.0625rem]">
            Each vane is polished by hand, then aligned so the grille reads as one surface.
          </span>
        </figcaption>
      </figure>

      {/* ---------- D. The cabin ---------- */}
      <div data-ph-d className="relative lg:h-[100svh] lg:min-h-[40rem]">
        <div data-ph-d-frame className="relative h-[118vw] overflow-hidden md:h-[82vw] lg:absolute lg:inset-0 lg:h-auto">
          {/* On wide screens the picture is set wider than the screen and anchored right, so the wheel stands left of centre. */}
          <div data-ph-d-drift className="absolute inset-x-0 -top-[6%] h-[112%] lg:-left-[16vw]">
            <Frame
              image={shots.interior}
              sizes="(min-width: 1024px) 116vw, (min-width: 768px) 124vw, 176vw"
              quality={85}
              className="object-[50%_50%]!"
            />
          </div>
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_bottom,#000,rgb(0_0_0/0.45)_12%,transparent_26%,transparent_62%,rgb(0_0_0/0.7)_84%,#000)] lg:bg-[linear-gradient(to_bottom,#000,rgb(0_0_0/0.4)_10%,transparent_24%,transparent_72%,rgb(0_0_0/0.6)_90%,#000)]"
          />
          {/* The pale seats beyond the wheel are shaded down to hold the words. */}
          <div
            aria-hidden
            className="absolute inset-0 hidden bg-[linear-gradient(to_right,transparent_48%,rgb(0_0_0/0.55)_64%,rgb(0_0_0/0.8)_82%,rgb(0_0_0/0.86))] lg:block"
          />
          <Leaves id="d" />
        </div>

        <div
          data-ph-d-statement
          className="relative z-10 -mt-[22vw] px-page pb-[4vw] md:-mt-[14vw] lg:absolute lg:bottom-[16svh] lg:left-[64vw] lg:mt-0 lg:p-0"
        >
          <Rule data-ph-d-rule="" className="mb-[clamp(1.5rem,3.5svh,2.5rem)] h-px w-16 origin-left bg-ivory/45" />
          <Lines
            lines={["A drawing room", "that happens", "to travel."]}
            className="type-statement text-[clamp(2rem,8.2vw,3.4rem)] lg:text-[clamp(2rem,3.2vw,4.3rem)]"
          />
        </div>
      </div>

      {/* ---------- E. Extended ---------- */}
      {/*
        The opening car again, closer, framed on its length. The words above its
        roofline name the longer car; the photograph is captioned as what it
        shows, and the dimension line beneath it is a drawing, not a measurement
        of the picture.
      */}
      <div data-ph-e className="relative lg:h-[118svh] lg:min-h-[46rem]">
        {/* Wide screens set the car a little left of centre, so the column at the photograph's left edge falls outside the cut. */}
        <figure
          data-ph-e-frame
          className="relative h-[104vw] overflow-hidden [--ph-cx:48cqw] [--ph-cy:50cqh] [--ph-hw:max(222cqw,206cqh)] [container-type:size] lg:absolute lg:inset-0 lg:h-auto lg:[--ph-cx:46cqw] lg:[--ph-cy:51cqh] lg:[--ph-hw:max(170cqw,205cqh)]"
        >
          <div data-ph-e-push className="absolute" style={HERO_CUT}>
            <Frame
              image={shots.hero}
              sizes="(min-width: 1024px) 192vw, 236vw"
              quality={85}
              className="brightness-[0.92] saturate-[0.55]"
            />
          </div>
          {/* Shaded into the ground at both ends; the bottom meets the next film's stage as it rises. */}
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_bottom,#000,rgb(0_0_0/0.5)_12%,transparent_28%,transparent_66%,rgb(0_0_0/0.75)_88%,#000)] lg:bg-[linear-gradient(to_bottom,#000,rgb(0_0_0/0.62)_9%,rgb(0_0_0/0.25)_20%,transparent_28%,transparent_68%,rgb(0_0_0/0.6)_82%,rgb(0_0_0/0.9))]"
          />
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,transparent_50%,rgb(0_0_0/0.4)_100%)]" />
          <Leaves id="e" />
          <figcaption className="type-micro absolute right-[clamp(1.25rem,4.5vw,5.5rem)] top-[clamp(1.25rem,5vw,2rem)] text-ivory/55 lg:top-[max(5rem,8svh)]">
            Pictured: {NAME}
          </figcaption>
        </figure>

        {extended && (
          <div
            data-ph-e-copy
            className="relative z-10 -mt-[8vw] px-page text-center lg:absolute lg:inset-x-0 lg:top-[max(5rem,8svh)] lg:mt-0"
          >
            <h3 data-ph-e-kind className="type-micro text-champagne">
              {extended.name}
            </h3>
            <Lines
              lines={noteLines(extended.note)}
              className="type-statement mt-[clamp(1rem,2.2svh,1.75rem)] text-[clamp(1.85rem,8vw,3.4rem)] lg:text-[clamp(2rem,3.2vw,4.2rem)]"
            />
          </div>
        )}

        <div className="relative z-10 px-page pb-[14vw] pt-[12vw] md:pb-[9vw] md:pt-[8vw] lg:absolute lg:inset-x-0 lg:bottom-[clamp(1.75rem,5svh,4rem)] lg:p-0 lg:px-page">
          {extended && <Wheelbase className="mx-auto max-w-[max(40rem,34vw)]" />}
          <div data-ph-e-cta className="mt-[clamp(2rem,4.5svh,3rem)] flex justify-center">
            <LineCta href="#contact" label="Arrange a viewing" arrow="always" />
          </div>
        </div>
      </div>
    </section>
  );
}
