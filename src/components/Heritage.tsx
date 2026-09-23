"use client";

import { useRef } from "react";
import { models, type Model } from "@/lib/content";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { library, type ImageAsset } from "@/lib/media";
import { cx, vars } from "@/lib/utils";
import { Frame } from "./ui/Frame";

const H = library.heritage;

/**
 * A print grade, always written as the same five functions so that GSAP can
 * interpolate between two grades: grayscale, sepia, saturate, contrast, brightness.
 */
type Grade = readonly [grayscale: number, sepia: number, saturate: number, contrast: number, brightness: number];

/** Old silver prints: colour drained, a little warmth, blacks that never quite reach black. */
const ARCHIVAL: Grade = [1, 0.28, 1, 0.86, 1.04];
/** A bright daylight street, brought down to sit beside the night and the archive. */
const DAYLIGHT: Grade = [0, 0, 0.72, 1.02, 0.92];
/** Sodium and neon, calmed a little; the night's blacks lifted just off black, like a print. */
const NIGHT: Grade = [0, 0, 0.86, 0.95, 1.1];

const grade = ([g, s, sat, c, b]: Grade, lift = 1) =>
  `grayscale(${g}) sepia(${s}) saturate(${sat}) contrast(${c}) brightness(${Number((b * lift).toFixed(3))})`;

/** How much brighter a plate begins as it dissolves in: a print coming up in the tray. */
const DEVELOP = 1.25;

/** The coda's colour prints, graded to the section. */
const PREWAR_TINT = "sepia(0.2) saturate(0.7)";
const CABIN_TINT = "saturate(0.85) brightness(0.96)";
const MODERN = "saturate(0.55) brightness(0.82) contrast(1.06)";

/** The desktop timeline: a sticky plate beside the entries. Everything else stacks. */
const TIMELINE = "(min-width: 1024px) and (prefers-reduced-motion: no-preference)";
const STACKED = "(max-width: 1023.98px) and (prefers-reduced-motion: no-preference)";

/** Seconds for one archival dissolve. Slower than the scroll that triggers it, short enough never to look muddy. */
const DISSOLVE = 1.5;
/** The reading line, as a share of the viewport from the top: an entry owns the plate once its text crosses it. */
const READING_LINE = 66;
/** Resting opacity of the years that are not being read. */
const YEAR_REST = 0.4;
const COPY_REST = 0.7;

function model(id: string): Model {
  const found = models.find((m) => m.id === id);
  if (!found) throw new Error(`Heritage: no model "${id}" in content.ts`);
  return found;
}
const wraith = model("wraith");
const dawn = model("dawn");

type Entry = {
  year: string;
  title: string;
  body: string;
  /** Editorial caption beside the sticky plate; the alt text stays on the image. */
  caption: string;
  /** Position here is the crop for phones and the stacked layouts. */
  image: ImageAsset;
  grade: Grade;
  /** Crop for phones held upright, width / height. */
  phone: number;
  /**
   * The sticky desktop plate, when it needs its own crop. `keep` is the widest share of the
   * photograph's width that may show: on wider screens the plate is enlarged from `position`
   * until no more than that shows (it keeps a registration plate out of frame). `mask` deepens
   * the left feather, so street clutter falls into the dark and the car emerges from it.
   */
  desk?: { position: string; keep?: number; mask?: string };
  /** Stacked layouts from 640px: enlarge the 3:2 print from its left edge, for the same reason. */
  stackZoom?: boolean;
  /** Top feather of the stacked print. */
  feather?: string;
  model?: Model;
};

const entries: Entry[] = [
  {
    year: "1931",
    title: "The first Royce leaves the workshop",
    body: "Coachbuilt to order, finished by hand, and delivered only when the painters were satisfied.",
    caption: "Radiator, lamps and mascot",
    // Wide crops keep the mascot's wing; tall crops are unaffected.
    image: { ...H.radiator, position: "50% 22%" },
    grade: ARCHIVAL,
    phone: 4 / 5,
  },
  {
    year: "1955",
    title: "The Silver Cloud years",
    body: "A generation of owners learns what silence at speed feels like.",
    caption: "Silver Cloud, afternoon light",
    image: H.silverCloud,
    grade: ARCHIVAL,
    phone: 4 / 3,
  },
  {
    year: "1968",
    title: "Grand touring, in chrome",
    body: "Long bonnets, longer journeys.",
    caption: "Mascot and bonnet, hall light",
    image: H.hall,
    grade: ARCHIVAL,
    phone: 4 / 5,
  },
  {
    year: "2013",
    title: wraith.name,
    body: "A fastback grand tourer, and the most powerful Royce of its day.",
    caption: "Wraith, city afternoon",
    // Upright phones see flank, rear wheel and tail lamp, from about 14% to 67% across.
    image: { ...wraith.image, position: "30% 60%" },
    grade: DAYLIGHT,
    phone: 4 / 5,
    // Stops run from the right edge: solid across the right half, gone by 15% from the left.
    desk: { position: "0% 60%", keep: 0.64, mask: "mask-l-from-50% mask-l-to-85%" },
    stackZoom: true,
    model: wraith,
  },
  {
    year: "2016",
    title: dawn.name,
    body: "Four seats, an open roof, and the sky invited in.",
    caption: "Dawn, roof lowered, at night",
    // Phones: front wheel to rear wheel, the lit façade and street lamps in the top third.
    image: { ...dawn.image, position: "58% 62%" },
    grade: NIGHT,
    phone: 5 / 4,
    // Desktop: rear wheel and tail held in frame; the bonnet emerges from the feathered edge.
    desk: { position: "100% 62%", mask: "mask-l-from-60% mask-l-to-90%" },
    feather: "mask-t-from-94%",
    model: dawn,
  },
];

/** Rendered width of a cover-fitted photograph in a full-width frame of the given aspect, in vw. */
const coverVw = (image: ImageAsset, frame: number) => Math.ceil(100 * Math.max(1, image.width / image.height / frame));

/**
 * The sticky plate is 100svh tall and narrower than the photograph, so its width follows the
 * height: aspect x 100vh, x 1.1 for the push-in, x the enlargement for a kept crop.
 */
const plateSizes = (entry: Entry) =>
  `${Math.ceil(110 * (entry.desk?.keep ? 1.25 : 1) * (entry.image.width / entry.image.height))}vh`;

/** The pre-war car as coachwork, not another mascot: windscreen, bonnet crease, louvres and side lamp. */
const prewar: ImageAsset = { ...H.prewar, position: "100% 40%" };
/** Bonnet to tail lamp in every crop; the pan then carries the car on towards the left edge. */
const dawnMotion: ImageAsset = { ...H.dawnMotion, position: "50% 58%" };

/** A short unit stays on the line of its number: "22 s", "571 PS". */
const keepUnit = (value: string) => value.replace(/ (\S{1,2})$/, "\u00a0$1");

/** Spec labels are set in capitals; units are not. */
function SpecLabel({ label }: { label: string }) {
  return label.split(/(km\/h)/).map((part, i) =>
    i % 2 ? (
      <span key={i} className="normal-case tracking-[0.06em]">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

/**
 * Heritage. On desktop a two-column timeline: the entries scroll on the
 * left while a sticky plate on the right dissolves, slowly, to whichever
 * year is being read. The early plates are printed in monochrome; colour
 * arrives with the modern cars. Phones and reduced motion get each entry
 * as a plate followed by its text.
 */
export function Heritage() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const scope = root.current;
      if (!scope) return;
      const all = (s: string) => Array.from(scope.querySelectorAll<HTMLElement>(s));
      const mm = gsap.matchMedia();

      mm.add(TIMELINE, () => {
        const list = scope.querySelector<HTMLElement>("[data-entries]");
        const plates = all("[data-plate]");
        const inners = all("[data-plate-inner]");
        const fits = all("[data-plate-fit]");
        const captions = all("[data-plate-caption]");
        const items = all("[data-entry]");
        const marks = all("[data-entry-mark]");
        const years = all("[data-entry-year]");
        const copy = all("[data-entry-copy]");
        const rules = all("[data-entry-rule]");
        if (!list || plates.length !== entries.length || marks.length !== entries.length) return;

        let current = 0;
        let top = plates.length;
        gsap.set(plates, { autoAlpha: 0, zIndex: 1 });
        gsap.set(plates[0], { autoAlpha: 1, zIndex: top });
        gsap.set(captions, { autoAlpha: 0 });
        gsap.set(captions[0], { autoAlpha: 1 });
        gsap.set(years, { opacity: YEAR_REST });
        gsap.set(years[0], { opacity: 1 });
        gsap.set(copy, { opacity: COPY_REST });
        gsap.set(copy[0], { opacity: 1 });
        gsap.set(rules, { scaleX: 0, transformOrigin: "0% 50%" });
        gsap.set(rules[0], { scaleX: 1 });

        const opacity = (el: HTMLElement) => Number(gsap.getProperty(el, "opacity"));
        const depth = (el: HTMLElement) => Number(gsap.getProperty(el, "zIndex")) || 0;
        const others = <T,>(list: T[], i: number) => list.filter((_, k) => k !== i);

        /** Once a dissolve has finished, anything still beneath fades away and stops rendering. */
        const settle = (i: number) => () => {
          const beneath = others(plates, i).filter((p) => opacity(p) > 0);
          if (current !== i || !beneath.length) return;
          gsap.to(beneath, { autoAlpha: 0, duration: 0.8, ease: "sine.inOut", overwrite: true });
        };

        const show = (i: number) => {
          if (i === current) return;
          current = i;
          const plate = plates[i];
          const settled = grade(entries[i].grade);
          const fade = { duration: DISSOLVE, ease: "sine.inOut", overwrite: true } as const;
          const shown = others(plates, i).filter((p) => opacity(p) > 0.001);

          if (opacity(plate) > 0.001) {
            // Still on screen beneath an unfinished dissolve: let whatever lies over it fade away.
            const above = shown.filter((p) => depth(p) > depth(plate));
            if (above.length) gsap.to(above, { ...fade, autoAlpha: 0 });
            gsap.to(plate, { ...fade, autoAlpha: 1, filter: settled, onComplete: settle(i) });
          } else {
            // A true dissolve: the new print develops over the old one, from light, never through black.
            gsap.set(plate, { zIndex: ++top });
            gsap.fromTo(
              plate,
              { filter: grade(entries[i].grade, DEVELOP) },
              { ...fade, autoAlpha: 1, filter: settled, onComplete: settle(i) },
            );
            // The old print lets go once the new one has half developed, so no double exposure
            // lingers where the new plate's feather is transparent.
            if (shown.length) {
              gsap.to(shown, {
                autoAlpha: 0,
                duration: DISSOLVE * 0.8,
                delay: DISSOLVE * 0.4,
                ease: "sine.inOut",
                overwrite: true,
              });
            }
          }

          gsap.to(others(captions, i), { autoAlpha: 0, duration: 0.5, ease: "power2.out", overwrite: true });
          gsap.to(captions[i], { autoAlpha: 1, duration: 1.2, delay: 0.5, ease: "power2.out", overwrite: true });
          gsap.to(others(years, i), { opacity: YEAR_REST, duration: 1.1, ease: "power2.out", overwrite: true });
          gsap.to(years[i], { opacity: 1, duration: 1.1, ease: "power2.out", overwrite: true });
          gsap.to(others(copy, i), { opacity: COPY_REST, duration: 1.1, ease: "power2.out", overwrite: true });
          gsap.to(copy[i], { opacity: 1, duration: 1.1, ease: "power2.out", overwrite: true });
          gsap.to(others(rules, i), { scaleX: 0, duration: 0.9, ease: "power2.inOut", overwrite: true });
          gsap.to(rules[i], { scaleX: 1, duration: 1.8, ease: "expo.out", overwrite: true });
        };

        // Where each entry's text begins, measured from the top of the list.
        let offsets: number[] = [];
        const measure = () => {
          const origin = list.getBoundingClientRect().top;
          offsets = marks.map((m) => m.getBoundingClientRect().top - origin);
        };

        /** Kept crops: enlarge from the crop's anchor until no more than `keep` of the photograph shows. */
        const fit = () => {
          fits.forEach((el) => {
            const entry = entries[Number(el.dataset.plateFit)];
            const keep = entry?.desk?.keep;
            if (!keep || !el.clientHeight) return;
            const shown = Math.min(1, el.clientWidth / el.clientHeight / (entry.image.width / entry.image.height));
            gsap.set(el, { scale: Math.max(1, shown / keep), transformOrigin: entry.desk?.position });
          });
        };

        /**
         * One source of truth for the plate: the last entry whose text has crossed the
         * reading line. Computed from the scroll position itself, so a jump of any size
         * (Home, End, an anchor, a restored reload) always lands on the right print.
         */
        const pick = (self: ScrollTrigger) => {
          const reached = self.scroll() - self.start;
          let i = 0;
          for (let k = 1; k < offsets.length; k++) if (offsets[k] <= reached) i = k;
          show(i);
        };

        ScrollTrigger.create({
          trigger: list,
          start: `top ${READING_LINE}%`,
          end: `bottom ${READING_LINE}%`,
          invalidateOnRefresh: true,
          onUpdate: pick,
          onToggle: pick,
          onRefresh: (self) => {
            measure();
            fit();
            pick(self);
          },
        });

        items.forEach((item, i) => {
          // A gentle push-in while its entry is read.
          gsap.fromTo(
            inners[i],
            { scale: 1 },
            { scale: 1.1, ease: "none", scrollTrigger: { trigger: item, start: "top bottom", end: "bottom top", scrub: true } },
          );
        });

        // The coda's cabin print floats a little nearer than the coachwork it overlaps.
        all("[data-coda-float]").forEach((el) => {
          const lift = () => window.innerHeight * 0.06;
          gsap.fromTo(
            el,
            { y: lift },
            {
              y: () => -lift(),
              ease: "none",
              scrollTrigger: { trigger: el.parentElement ?? el, start: "top bottom", end: "bottom top", scrub: true, invalidateOnRefresh: true },
            },
          );
        });
      });

      mm.add(STACKED, () => {
        all("[data-stack-zoom]").forEach((el) => {
          gsap.fromTo(
            el,
            { scale: 1.12 },
            {
              scale: 1,
              ease: "none",
              scrollTrigger: { trigger: el.parentElement ?? el, start: "top bottom", end: "bottom 35%", scrub: true },
            },
          );
        });
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="heritage"
      aria-labelledby="heritage-title"
      className="relative isolate overflow-x-clip bg-obsidian text-ivory"
    >
      <div className="relative motion-safe:lg:grid motion-safe:lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* The title spans both columns so it can run into the plate's feathered edge. */}
        <header className="relative z-20 px-page pb-5 pt-[clamp(3rem,9svh,9rem)] sm:pb-[clamp(2rem,5svh,4rem)] sm:pt-[clamp(4.5rem,13svh,9rem)] motion-safe:lg:col-[1/-1] motion-safe:lg:row-[1] motion-safe:lg:pb-[2svh] motion-safe:lg:pt-[24svh]">
          <h2
            id="heritage-title"
            data-lines
            className="type-brand text-[clamp(2.25rem,12.4vw,6rem)] font-[200] leading-[0.92] tracking-[0.04em] motion-safe:lg:text-[clamp(3rem,6.8vw,10rem)]"
          >
            <span className="block overflow-hidden pb-[0.06em]">
              <span data-line className="block">
                Heritage
              </span>
            </span>
          </h2>
          <p data-fade className="type-lede mt-6 max-w-[30ch] text-pretty text-ivory/75 lg:mt-8">
            Ninety-five years of motor cars, each one built to order.
          </p>
        </header>

        <ol data-entries className="relative z-10 motion-safe:lg:col-[1] motion-safe:lg:row-[2]">
          {entries.map((entry, i) => (
            <TimelineEntry key={entry.year} entry={entry} first={i === 0} />
          ))}
        </ol>

        {/* The sticky plate, from the top of the section to the last entry. */}
        <div className="relative hidden motion-safe:lg:col-[2] motion-safe:lg:row-[1/span_2] motion-safe:lg:block">
          <div className="sticky top-0 -ml-[9vw] h-[100svh]">
            <div className="absolute inset-0 overflow-hidden mask-l-from-72% mask-t-from-91% mask-b-from-78%">
              {entries.map((entry, i) => (
                <div
                  key={entry.year}
                  data-plate
                  className={cx("absolute inset-0", entry.desk?.mask)}
                  style={{
                    filter: grade(entry.grade),
                    ...(i === 0 ? null : { opacity: 0, visibility: "hidden" }),
                  }}
                >
                  <div data-plate-inner className="absolute inset-0">
                    <div data-plate-fit={entry.desk?.keep ? i : undefined} className="absolute inset-0">
                      <Frame
                        image={entry.desk ? { ...entry.image, position: entry.desk.position } : entry.image}
                        sizes={plateSizes(entry)}
                        quality={85}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div aria-hidden className="absolute bottom-[6.5svh] right-[clamp(1.25rem,4.5vw,5.5rem)] h-6">
              {entries.map((entry, i) => (
                <p
                  key={entry.year}
                  data-plate-caption
                  className="type-caption absolute bottom-0 right-0 whitespace-nowrap text-ivory/80"
                  style={i === 0 ? undefined : { opacity: 0, visibility: "hidden" }}
                >
                  {entry.caption}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Coda />
    </section>
  );
}

function TimelineEntry({ entry, first }: { entry: Entry; first: boolean }) {
  const { model: car } = entry;
  // Cover-fitted widths: the phone crop, and the native 3:2 frame used from 640px up.
  const wide = coverVw(entry.image, 3 / 2) * (entry.stackZoom ? 1.5 : 1);
  const sizes = `(min-width: 640px) ${wide}vw, ${coverVw(entry.image, entry.phone)}vw`;

  return (
    <li
      data-entry
      id={car ? `heritage-${car.id}` : undefined}
      className="relative scroll-mt-0 pb-[clamp(2.5rem,6svh,4.5rem)] md:pb-[clamp(2.5rem,5svh,4rem)] motion-safe:lg:flex motion-safe:lg:min-h-[92svh] motion-safe:lg:flex-col motion-safe:lg:justify-center motion-safe:lg:pb-0"
    >
      {/* Phones, tablets and reduced motion: the plate sits above its text. */}
      <figure className={cx("relative motion-safe:lg:hidden", first && "-mt-14 sm:-mt-[clamp(3.5rem,9svh,6rem)] lg:-mt-[clamp(6rem,16svh,12rem)]")}>
        <div
          className={cx(
            "relative aspect-(--phone) w-full overflow-hidden mask-b-from-60% sm:aspect-[3/2] sm:mask-b-from-68% sm:max-h-[86svh]",
            entry.feather ?? "mask-t-from-86%",
            // As on the desktop plate: road markings and passers-by fall into the dark on the left.
            entry.stackZoom && "sm:mask-l-from-60% sm:mask-l-to-88%",
          )}
          style={vars({ "--phone": entry.phone })}
        >
          <div data-stack-zoom className="absolute inset-0" style={{ filter: grade(entry.grade) }}>
            <div className={cx("absolute inset-0", entry.stackZoom && "sm:origin-[0%_62%] sm:scale-150")}>
              <Frame image={entry.image} sizes={sizes} />
            </div>
          </div>
        </div>
      </figure>

      <div
        data-entry-mark
        className="relative px-page md:grid md:grid-cols-12 md:items-start md:gap-x-8 motion-safe:lg:block motion-safe:lg:pr-[3vw]"
      >
        <div aria-hidden className="relative mb-9 hidden h-px bg-ivory/15 motion-safe:lg:block">
          <span data-entry-rule className="absolute inset-0 bg-champagne" style={{ transform: "scaleX(0)" }} />
        </div>

        <time
          dateTime={entry.year}
          data-entry-year
          className="type-brand relative -mt-[0.42em] block text-[clamp(4.5rem,24vw,9.5rem)] font-[200] leading-[0.8] tracking-[-0.01em] tabular-nums md:col-span-6 md:text-[clamp(5rem,14vw,10rem)] motion-safe:lg:mt-0 motion-safe:lg:text-[clamp(5rem,10.5vw,13.5rem)]"
        >
          {entry.year}
        </time>

        <div data-entry-copy className="mt-7 md:col-span-6 md:mt-0 motion-safe:lg:mt-9">
          {car ? (
            <>
              <h3 className="type-brand text-[clamp(1.75rem,8vw,3rem)] font-[250] leading-none tracking-[0.06em] motion-safe:lg:text-[clamp(2rem,3vw,3.5rem)]">
                {entry.title}
              </h3>
              <p className="type-caption mt-3 text-pewter">{car.kind}</p>
            </>
          ) : (
            <h3 className="type-statement max-w-[15ch] text-balance text-[clamp(1.85rem,7.4vw,3rem)] leading-[1.06] motion-safe:lg:text-[clamp(2rem,2.9vw,3.5rem)]">
              {entry.title}
            </h3>
          )}
          <p className="type-body mt-5 max-w-[36ch] text-ivory/80 min-[1920px]:max-w-[40ch] min-[1920px]:text-[1.1875rem]">
            {entry.body}
          </p>

          {car && (
            <dl className="mt-8 grid max-w-[28rem] grid-cols-3 gap-x-5 border-t border-ivory/15 pt-5 min-[1920px]:max-w-[32rem]">
              {car.specs.map((spec) => (
                <div key={spec.label}>
                  <dt className="type-micro text-pewter">
                    <SpecLabel label={spec.label} />
                  </dt>
                  <dd className="mt-2 text-[0.9375rem] leading-snug text-ivory/90 min-[1920px]:text-[1.1875rem]">{keepUnit(spec.value)}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </li>
  );
}

/** Each sentence breaks in two on phones, so the inscription stands as four even lines. */
const QUOTE = [
  ["The tools", "have changed."],
  ["The patience", "has not."],
];

/** The patience line over the pre-war radiator, the materials, then the modern car at speed: old, craft, new. */
function Coda() {
  return (
    <div className="relative">
      {/*
        Chrome, full bleed; the quote is set like an inscription in the dark field above the mascot.
        On phones the print is enlarged from its top edge, which lowers the mascot and turns the
        crop into an upright portrait of mascot and radiator shell with room for the words above.
      */}
      <div className="relative h-[max(160vw,32rem)] sm:h-[max(92svh,34rem)] lg:h-[max(112svh,42rem)]">
        <div
          className="absolute inset-0 overflow-hidden mask-t-from-92% mask-b-from-72% sm:mask-t-from-90% lg:mask-t-from-72%"
          style={{ filter: grade(ARCHIVAL) }}
        >
          <div data-zoom="1.1" className="absolute inset-x-0 top-0 h-[140%] sm:bottom-0 sm:h-auto">
            <Frame image={H.chrome} sizes="(min-width: 1024px) 120vw, (min-width: 640px) 190vw, 340vw" quality={85} />
          </div>
        </div>
        <blockquote className="absolute inset-x-0 top-[3%] px-page text-center sm:top-[7%] lg:top-[6%]">
          <p
            data-lines
            className="type-statement text-[clamp(2rem,10vw,2.75rem)] sm:text-[7vw] lg:text-[clamp(3rem,4.6vw,7rem)]"
          >
            {QUOTE.map(([first, rest]) => (
              <span key={first} className="block overflow-hidden pb-[0.1em]">
                <span data-line className="block">
                  {first}
                  <br className="sm:hidden" /> {rest}
                </span>
              </span>
            ))}
          </p>
        </blockquote>
      </div>

      {/*
        The materials: coachwork bleeding off the left, the cabin laid over its feathered edge on
        the right, one line and one caption for the pair. On desktop the spread rises until its
        feathered top meets the chrome's feathered foot.
      */}
      <figure className="relative grid grid-cols-12 lg:-mt-[12svh]">
        <div
          className="relative col-[1/-1] row-[1] aspect-square overflow-hidden mask-t-from-86% mask-b-from-58% sm:aspect-[4/3] lg:col-[1/span_8] lg:aspect-auto lg:h-[max(108svh,40rem)] lg:mask-r-from-66% lg:mask-t-from-64% lg:mask-b-from-70%"
          style={{ filter: PREWAR_TINT }}
        >
          <div data-drift="5" className="absolute inset-x-0 -inset-y-[6%]">
            <Frame image={prewar} sizes="(min-width: 1024px) 121vw, (min-width: 640px) 112vw, 150vw" />
          </div>
        </div>

        {/* Parallax on desktop only: on a phone it would slide the cabin over the words above it. */}
        <div
          data-coda-float
          className="relative col-[4/-1] row-[3] mt-[clamp(1.5rem,6vw,3rem)] sm:col-[7/-1] sm:row-[2] sm:-mt-[10vw] lg:col-[8/-1] lg:row-[1] lg:mt-[calc(12svh+max(16rem,15vw))] lg:self-start"
        >
          <div className="relative aspect-[4/5] overflow-hidden mask-l-from-78% mask-y-from-84%" style={{ filter: CABIN_TINT }}>
            <Frame image={H.cabin} sizes="(min-width: 1024px) 78vw, (min-width: 640px) 94vw, 141vw" />
          </div>
        </div>

        <figcaption
          data-fade
          className="relative col-[1/-1] row-[2] -mt-[14vw] px-page sm:col-[1/span_6] sm:mt-0 sm:self-center sm:pr-0 lg:col-[9/-1] lg:row-[1] lg:self-start lg:pl-0 lg:pt-[calc(12svh+2vw)]"
        >
          <span className="type-lede block max-w-[26ch] text-pretty text-ivory/85">
            Hide, chrome and coachwork: the materials have barely changed.
          </span>
          <span className="type-caption mt-4 block max-w-[36ch] text-pretty text-pewter">
            Pre-war coachwork: windscreen frame, bonnet crease and louvres. And the rear cabin of a classic saloon, in tan
            hide.
          </span>
        </figcaption>
      </figure>

      <DawnAtSpeed />
    </div>
  );
}

/**
 * The last plate of the section, and the ground the gallery rises from: the Dawn at speed,
 * full bleed, panned sideways as it passes, the way the camera followed it. Its feathered top
 * runs up under the prints above, so the spread and the plate read as one continuous field.
 */
function DawnAtSpeed() {
  return (
    <figure className="relative -mt-[16vw] aspect-square overflow-hidden sm:-mt-[12vw] sm:aspect-[4/3] lg:-mt-[26svh] lg:aspect-auto lg:h-[max(100svh,36rem)]">
      <div className="absolute inset-0 mask-t-from-62% lg:mask-t-from-58%" style={{ filter: MODERN }}>
        <div data-pan="-10" className="absolute inset-y-0 left-0 w-[114%]">
          <Frame image={dawnMotion} sizes="(min-width: 640px) 118vw, 158vw" quality={85} />
        </div>
        {/* Ground for the line above the car and the caption below it; the road stays in daylight. */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-[58%] bg-gradient-to-b from-obsidian/70 via-obsidian/35 to-transparent" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-[26%] bg-gradient-to-t from-obsidian/60 to-transparent" />
      </div>
      <div className="absolute inset-x-0 top-[13%] px-page lg:top-[16%]">
        <p data-lines className="type-statement text-[clamp(2rem,9.6vw,2.75rem)] sm:text-[6vw] lg:text-[clamp(3rem,4.6vw,7rem)]">
          <span className="block overflow-hidden pb-[0.1em]">
            <span data-line className="block">
              Unhurried,
            </span>
          </span>
          <span className="block overflow-hidden pb-[0.1em]">
            <span data-line className="block">
              even at speed.
            </span>
          </span>
        </p>
      </div>
      <figcaption className="type-caption absolute bottom-[clamp(1.25rem,4svh,2.5rem)] left-0 px-page text-ivory/80">
        {dawn.name}, roof raised, at speed.
      </figcaption>
    </figure>
  );
}
