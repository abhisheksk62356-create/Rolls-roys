"use client";

import { useRef } from "react";
import { models } from "@/lib/content";
import { gsap, onReach, useGSAP } from "@/lib/gsap";
import { library, type ImageAsset } from "@/lib/media";
import { cx } from "@/lib/utils";
import { Frame } from "./ui/Frame";
import { LineCta } from "./ui/LineCta";

const model = models[2];
const shots = library.cullinan;

/**
 * Wide, landscape screens with motion get the pinned panorama: the chapter sets
 * data-panorama and the layout follows it, so CSS and motion always agree.
 * Everything else (phones, tablets, 4:3, 5:4 and 21:9 screens, reduced motion,
 * no script) reads as a vertical sequence. Outside 3:2 to 2:1 the profile frame
 * crops so tightly around the car that neither the specs below it nor the
 * name above it have clear ground.
 */
const CONDITIONS = {
  wide: "(min-width: 1024px) and (min-aspect-ratio: 3/2) and (max-aspect-ratio: 2/1)",
  motion: "(prefers-reduced-motion: no-preference)",
};

/** Panorama timeline, in its own 0 to 1 units: a beat of stillness either side of the travel. */
const TRAVEL_FROM = 0.05;
const TRAVEL_TO = 0.92;
/** The name leaves through its mask as the last frame comes in, so the closing statement holds alone. */
const NAME_EXIT = 0.56;
/** The longest the pin may run, in viewport heights, however wide the screen. */
const PIN_MAX = 2.7;

const GUTTER = "clamp(1.25rem,4.5vw,5.5rem)";

type Still = {
  image: ImageAsset;
  /** Crop on phones and tablets, chosen so the whole car stays in frame through the drift. */
  aspect: string;
  sizes: string;
  /** Panorama only: where the caption sits on the picture, placed around the car. */
  place: string;
  /** Panorama only: the grade that grounds that caption, and no more of the frame than it needs. */
  grade: string;
};

const STILLS: Still[] = [
  {
    image: shots.hero,
    aspect: "aspect-[3/4] sm:aspect-[4/3]",
    sizes: "(min-width: 1024px) 116vw, (min-width: 640px) 126vw, 224vw",
    // Low, on the soft verge in the foreground, clear of the bumper.
    place: "[[data-panorama]_&]:bottom-[max(3.75rem,8svh)]",
    grade: "h-[42%] from-obsidian/50 via-obsidian/15",
  },
  {
    // Bottom-anchored, which leaves the most paving beneath the car for the specs.
    image: { ...shots.profile, position: "52% 100%" },
    aspect: "aspect-[4/3] sm:aspect-[16/10]",
    sizes: "(min-width: 1024px) 116vw, (min-width: 640px) 105vw, 126vw",
    // On the paving under the car, level with the instruments.
    place: "[[data-panorama]_&]:bottom-[max(1.75rem,4.25svh)]",
    grade: "h-[30%] from-obsidian/50 via-obsidian/15",
  },
  {
    image: shots.rear,
    aspect: "aspect-square sm:aspect-[4/3]",
    sizes: "(min-width: 1024px) 116vw, (min-width: 640px) 126vw, 168vw",
    // Over the hedge, above the band where the frame dissolves into the paper of the coda.
    place: "[[data-panorama]_&]:bottom-[max(7rem,19svh)]",
    grade: "h-[50%] from-obsidian/45 via-obsidian/15",
  },
];

/** "Effortless, everywhere." becomes ["Effortless,", "everywhere."]: a line break after each comma. */
const afterCommas = (text: string) => text.split(", ").map((part, i, parts) => (i < parts.length - 1 ? `${part},` : part));

/** Lines that rise from behind a mask; driven by this chapter's own timelines. */
function Lines({ lines }: { lines: string[] }) {
  return lines.map((line) => (
    <span key={line} className="block overflow-hidden pb-[0.1em]">
      <span data-cl className="block">
        {line}
      </span>
    </span>
  ));
}

/**
 * Chapter three, Cullinan: the one daylight chapter in a dark film.
 *
 * On wide screens the chapter arrives like dawn (the first frame lifts out
 * of darkness), then pins and travels sideways through a panoramic strip of
 * three frames. The name drifts far slower than the strip, then leaves as
 * the last frame arrives and the light comes fully up. The strip dissolves
 * into a coda on paper with the coach doors. Phones, tablets and reduced
 * motion get the same frames as a vertical sequence, with every line of
 * copy in place.
 */
export function CullinanChapter() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = section.current;
      const st = stage.current;
      const track = strip.current;
      if (!root || !st || !track) return;

      const all = (s: string, scope: ParentNode = root) => Array.from(scope.querySelectorAll<HTMLElement>(s));
      const frames = all("[data-frame]");
      const inners = all("[data-inner]");
      const shade = all("[data-dawn-shade]");
      const rise = all("[data-mark-line]");
      const captionLines = (i: number) => all("[data-cl]", frames[i]);
      const mm = gsap.matchMedia();

      const panorama = () => {
        root.dataset.panorama = "";
        const mark = all("[data-mark]");
        const word = rise[0];
        const count = all("[data-count]");
        const grades = all("[data-grade]");
        const images = frames.map((f) => f.querySelector("img")).filter((img): img is HTMLImageElement => !!img);

        const travel = () => Math.max(0, track.scrollWidth - st.clientWidth);
        const gutter = () => parseFloat(getComputedStyle(mark[0]).paddingLeft) || 0;
        // The name starts centred and drifts to the gutter: slower than the strip, and never cropped.
        const centred = () => {
          const range = document.createRange();
          range.selectNodeContents(word);
          return Math.max(0, (st.clientWidth - range.getBoundingClientRect().width) / 2 - gutter());
        };

        // Frames two and three start clipped off to the side, where native lazy loading would fetch
        // them late; fetch them as the chapter approaches instead.
        onReach(st, `top bottom+=${Math.round(window.innerHeight * 1.5)}`, () =>
          images.forEach((img) => (img.loading = "eager")),
        );

        // Dawn: as the chapter rises into view, the first frame lifts out of darkness. The feather
        // at its top stays whole until the frame has docked, so no hard edge ever meets the black above.
        gsap
          .timeline({
            defaults: { ease: "none" },
            scrollTrigger: { trigger: st, start: "top bottom", end: "top top", scrub: true, invalidateOnRefresh: true },
          })
          .fromTo(shade, { opacity: 0.75 }, { opacity: 0, duration: 1 }, 0)
          .fromTo(inners[0], { scale: 1.12 }, { scale: 1, duration: 1 }, 0)
          .fromTo(rise, { yPercent: 104 }, { yPercent: 0, duration: 0.5 }, 0.4)
          .fromTo(captionLines(0), { yPercent: 112 }, { yPercent: 0, duration: 0.4, stagger: 0.07 }, 0.55);

        // The journey: a pinned, scrubbed sideways travel through the strip.
        let shown = 1;
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: st,
            start: "top top",
            end: () => `+=${Math.round(Math.min(travel() * 0.92, window.innerHeight * PIN_MAX))}`,
            pin: true,
            anticipatePin: 1,
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
          onUpdate() {
            // The count turns when a frame is half on screen, read from where the strip actually is.
            const x = Number(gsap.getProperty(track, "x")) || 0;
            const n = Math.min(3, Math.max(1, Math.round(-x / st.clientWidth) + 1));
            if (n !== shown) {
              shown = n;
              count.forEach((c) => (c.textContent = `0${n}`));
            }
          },
        });

        tl
          // The last of the dark lifts from the sky once the chapter has settled.
          .fromTo(all("[data-dawn-edge]"), { opacity: 1 }, { opacity: 0, duration: 0.1 }, 0)
          .to(track, { x: () => -travel(), duration: TRAVEL_TO - TRAVEL_FROM, ease: "sine.inOut" }, TRAVEL_FROM)
          .fromTo(all("[data-bar]"), { scaleX: 0 }, { scaleX: 1, duration: TRAVEL_TO - TRAVEL_FROM, ease: "sine.inOut" }, TRAVEL_FROM)
          // Each photograph moves a little slower than its frame, like a view through a window.
          .fromTo(inners, { xPercent: -6 }, { xPercent: 6, duration: 1 }, 0)
          // The name drifts at a small fraction of the travel: the world passes, the title stays with you.
          .fromTo(mark, { x: centred }, { x: () => -gutter() * 0.9, duration: NAME_EXIT + 0.06 }, 0)
          .fromTo(all("[data-cf]", frames[1]), { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.1, stagger: 0.025 }, 0.3)
          // Then it leaves the way it came, and the sky grade that carried it lifts: full daylight.
          .fromTo(all("[data-mark-exit]"), { yPercent: 0 }, { yPercent: -104, duration: 0.13, ease: "power1.in" }, NAME_EXIT)
          .fromTo(all("[data-sky]"), { opacity: 1 }, { opacity: 0, duration: 0.2 }, NAME_EXIT)
          .fromTo(captionLines(2), { yPercent: 112 }, { yPercent: 0, duration: 0.1, stagger: 0.025 }, 0.72)
          // Final hold: the instruments go and the ground lightens, ready to fade into the paper below.
          .to(all("[data-instruments]"), { autoAlpha: 0, duration: 0.05 }, 0.93)
          .to(grades[2], { opacity: 0.5, duration: 0.08 }, 0.92)
          .set({}, {}, 1);

        return () => {
          delete root.dataset.panorama;
          images.forEach((img) => (img.loading = "lazy"));
        };
      };

      const sequence = () => {
        // Dawn on the first frame, then each frame drifts as it passes.
        gsap
          .timeline({
            defaults: { ease: "none" },
            scrollTrigger: { trigger: frames[0], start: "top bottom", end: "top 15%", scrub: true },
          })
          .fromTo(shade, { opacity: 0.75 }, { opacity: 0, duration: 1 }, 0)
          .fromTo(rise, { yPercent: 104 }, { yPercent: 0, duration: 0.5 }, 0.35);

        inners.forEach((el) =>
          gsap.fromTo(
            el,
            { yPercent: -5 },
            {
              yPercent: 5,
              ease: "none",
              scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true },
            },
          ),
        );

        frames.forEach((frame) => {
          const cap = frame.querySelector("figcaption");
          if (!cap) return;
          const lines = all("[data-cl]", cap);
          const facts = all("[data-cf]", cap);
          const tl = gsap.timeline({ paused: true });
          if (lines.length) tl.from(lines, { yPercent: 112, duration: 1.5, ease: "expo.out", stagger: 0.1 }, 0);
          if (facts.length) tl.from(facts, { autoAlpha: 0, y: 22, duration: 1.3, ease: "expo.out", stagger: 0.09 }, 0);
          onReach(cap, "top 88%", () => tl.play());
        });
      };

      mm.add(CONDITIONS, (ctx) => {
        const { wide, motion } = ctx.conditions ?? {};
        if (!motion) return;
        if (wide) return panorama();
        sequence();
      });
    },
    { scope: section },
  );

  return (
    <section ref={section} id="cullinan" aria-labelledby="cullinan-title" className="relative bg-paper text-charcoal">
      {/* ---------- The panorama ---------- */}
      <div ref={stage} className="relative isolate [[data-panorama]_&]:h-[100svh] [[data-panorama]_&]:overflow-hidden">
        {/* The name: its own layer, drifting behind the travel. */}
        <div
          data-mark
          className="pointer-events-none absolute inset-x-0 top-[clamp(5.5rem,11vw,7.5rem)] z-20 px-page lg:top-[max(5rem,min(10svh,6.5vw))]"
        >
          <h2
            id="cullinan-title"
            className="type-brand overflow-hidden whitespace-nowrap pb-[0.02em] text-[13.8vw] font-[200] leading-[0.86] tracking-[-0.012em] text-ivory lg:text-[min(13vw,24svh)]"
          >
            <span data-mark-exit className="block">
              <span data-mark-line className="block">
                {model.name}
              </span>
            </span>
          </h2>
        </div>

        {/* Sky grade: carries the name against a bright sky, and lifts when the name leaves (panorama only). */}
        <div
          data-sky
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-10 hidden h-[46%] bg-gradient-to-b from-obsidian/30 via-obsidian/15 via-45% to-transparent [[data-panorama]_&]:block"
        />

        <div
          ref={strip}
          className="flex flex-col gap-[2px] [[data-panorama]_&]:h-full [[data-panorama]_&]:w-[calc(300%_+_4px)] [[data-panorama]_&]:flex-row [[data-panorama]_&]:bg-obsidian"
        >
          {STILLS.map((still, i) => (
            <figure
              key={still.image.src}
              data-frame={i}
              className="relative shrink-0 [[data-panorama]_&]:h-full [[data-panorama]_&]:w-[calc((100%_-_4px)/3)]"
            >
              <div
                className={cx(
                  "relative overflow-hidden lg:aspect-auto lg:h-[min(100svh,66vw)] [[data-panorama]_&]:absolute [[data-panorama]_&]:inset-0 [[data-panorama]_&]:h-auto [[data-panorama]_&]:bg-paper",
                  still.aspect,
                )}
              >
                <div
                  data-inner
                  className="absolute inset-x-0 -top-[6%] h-[112%] [[data-panorama]_&]:top-0 [[data-panorama]_&]:right-auto [[data-panorama]_&]:-left-[8%] [[data-panorama]_&]:h-full [[data-panorama]_&]:w-[116%]"
                >
                  <Frame image={still.image} sizes={still.sizes} quality={85} />
                </div>

                <div
                  data-grade
                  aria-hidden
                  className={cx(
                    "absolute inset-x-0 bottom-0 hidden bg-gradient-to-t to-transparent [[data-panorama]_&]:block",
                    still.grade,
                  )}
                />

                {i === 0 && (
                  <>
                    {/* Where the chapter meets the dark film above: feathered, never a hard edge. */}
                    <div
                      data-dawn-edge
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-[34%] bg-gradient-to-b from-obsidian via-obsidian/45 to-transparent lg:h-[36%]"
                    />
                    <div data-dawn-shade aria-hidden className="absolute inset-0 bg-obsidian opacity-0" />
                  </>
                )}
              </div>

              <figcaption
                className={cx(
                  "relative px-page pt-10 sm:pt-12 lg:pt-14 [[data-panorama]_&]:absolute [[data-panorama]_&]:inset-x-0 [[data-panorama]_&]:py-0 [[data-panorama]_&]:text-ivory",
                  i === 2 ? "pb-10 sm:pb-14 lg:pb-16" : "pb-16 sm:pb-20 lg:pb-24",
                  still.place,
                )}
              >
                {i === 0 && (
                  <p className="type-statement text-[clamp(2.1rem,9.6vw,4rem)] lg:text-[clamp(3rem,4.6vw,6rem)]">
                    <Lines lines={afterCommas(model.line)} />
                  </p>
                )}
                {i === 1 && (
                  <dl className="border-y border-charcoal/15 lg:flex lg:border-0">
                    {model.specs.map((spec) => (
                      <div
                        key={spec.label}
                        data-cf
                        className="flex items-baseline justify-between gap-6 border-charcoal/15 py-5 [&+&]:border-t lg:block lg:py-1 lg:pl-[clamp(1.75rem,3vw,3.5rem)] lg:pr-[clamp(1.75rem,3vw,3.5rem)] lg:first:pl-0 lg:[&+&]:border-l lg:[&+&]:border-t-0 [[data-panorama]_&]:[&+&]:border-ivory/30"
                      >
                        <dt className="type-micro text-stone [[data-panorama]_&]:text-ivory/75">{spec.label}</dt>
                        <dd className="type-brand text-right text-[clamp(1.05rem,4.8vw,1.5rem)] font-[300] lg:mt-5 lg:text-left lg:text-[clamp(1.5rem,2.1vw,2.6rem)] lg:font-[250] [[data-panorama]_&]:mt-3 [[data-panorama]_&]:text-[clamp(1.3rem,1.75vw,2.35rem)] [[data-panorama]_&]:leading-none">
                          {spec.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
                {i === 2 && (
                  <p className="type-statement max-w-[15ch] text-[clamp(2rem,9vw,3.6rem)] lg:max-w-none lg:text-[clamp(2.5rem,3.6vw,4.75rem)]">
                    <Lines lines={["From the boulevard", "to the dunes,", "the same composure."]} />
                  </p>
                )}
              </figcaption>
            </figure>
          ))}
        </div>

        {/* Instruments: which frame, and how far through the journey. */}
        <div
          data-instruments
          aria-hidden
          style={{ paddingRight: GUTTER }}
          className="pointer-events-none absolute bottom-[max(1.75rem,4.25svh)] right-0 z-20 hidden w-[min(30vw,28rem)] items-center gap-5 text-ivory [[data-panorama]_&]:flex"
        >
          <span className="relative block h-px flex-1 bg-ivory/25">
            <span data-bar className="absolute inset-0 origin-left bg-ivory" style={{ transform: "scaleX(0)" }} />
          </span>
        </div>
      </div>

      {/* ---------- Coda: the coach doors ---------- */}
      <div className="relative grid grid-cols-1 pt-[clamp(2.5rem,7svh,4rem)] sm:grid-cols-[54fr_3fr_43fr] lg:grid-cols-[40vw_1fr_34vw] lg:pt-[clamp(4.5rem,12svh,9rem)]">
        {/* The panorama's ground dissolves into this paper as the pin lets go, rather than ending on an edge. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-full z-10 hidden h-[18svh] bg-[linear-gradient(to_bottom,transparent,color-mix(in_oklab,var(--color-paper)_8%,transparent)_35%,color-mix(in_oklab,var(--color-paper)_45%,transparent)_65%,color-mix(in_oklab,var(--color-paper)_88%,transparent)_88%,var(--color-paper))] [[data-panorama]_&]:block"
        />

        <div className="col-span-full row-start-3 px-page pt-12 sm:row-start-2 sm:pt-20 lg:col-span-2 lg:col-start-2 lg:row-start-1 lg:pb-[6svh] lg:pl-[6vw] lg:pt-[7svh]">
          <p data-lines className="type-statement text-[clamp(2.1rem,9.6vw,3.6rem)] lg:text-[clamp(3rem,4.6vw,6rem)]">
            {["Coach doors,", "opened for arrival."].map((line) => (
              <span key={line} className="block overflow-hidden pb-[0.1em]">
                <span data-line className="block">
                  {line}
                </span>
              </span>
            ))}
          </p>
          <div data-fade className="mt-8 lg:mt-12">
            <LineCta
              href="#contact"
              label="Arrange a viewing"
              arrow="always"
              className="[&:focus-visible>span:first-child]:outline-charcoal"
            />
          </div>
        </div>

        {/* Doors and studio travel in opposite directions, so the pair shifts against itself as it passes. */}
        <figure data-speed="-0.07" className="row-start-1 w-[80vw] sm:col-start-1 sm:w-auto lg:row-span-2">
          <div data-unveil="up" className="relative aspect-[2/3] overflow-hidden">
            <div data-unveil-inner className="absolute inset-0">
              <Frame image={shots.doors} sizes="(min-width: 1024px) 58vw, (min-width: 640px) 78vw, 116vw" />
            </div>
          </div>
          <figcaption className="type-caption mt-4 max-w-[36vw] text-stone sm:max-w-none" style={{ paddingLeft: GUTTER }}>
            Rear-hinged coach doors.
          </figcaption>
        </figure>

        <figure
          data-speed="0.14"
          className="row-start-2 -mt-[calc(3.75rem+5vw)] w-[62vw] justify-self-end sm:col-start-3 sm:row-start-1 sm:mt-[24vw] sm:w-auto sm:justify-self-stretch lg:row-start-2 lg:mt-0"
        >
          <div data-unveil="up" className="relative aspect-[4/5] overflow-hidden">
            <div data-unveil-inner className="absolute inset-0">
              <Frame image={shots.studio} sizes="(min-width: 1024px) 49vw, (min-width: 640px) 62vw, 90vw" />
            </div>
          </div>
          <figcaption className="type-caption mt-4 text-stone" style={{ paddingRight: GUTTER }}>
            In the studio, doors open.
          </figcaption>
        </figure>
      </div>

      {/* Dusk: the daylight gives way to the next dark chapter. */}
      <div
        aria-hidden
        className="mt-[clamp(1.5rem,4svh,3rem)] h-[clamp(9rem,24svh,16rem)] bg-[linear-gradient(to_bottom,var(--color-paper)_0%,color-mix(in_oklab,var(--color-paper)_90%,black)_22%,color-mix(in_oklab,var(--color-paper)_64%,black)_46%,color-mix(in_oklab,var(--color-paper)_32%,black)_68%,color-mix(in_oklab,var(--color-paper)_10%,black)_86%,var(--color-obsidian)_100%)]"
      />
    </section>
  );
}
