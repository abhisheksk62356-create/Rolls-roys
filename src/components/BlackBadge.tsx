"use client";

import { Fragment, useRef } from "react";
import { models } from "@/lib/content";
import { gsap, onReach, useGSAP } from "@/lib/gsap";
import { useReducedMotionPref } from "@/lib/hooks";
import { library, type ImageAsset } from "@/lib/media";
import { cx, vars } from "@/lib/utils";
import { Frame } from "./ui/Frame";

const found = models.find((m) => m.id === "black-badge");
if (!found) throw new Error('BlackBadge: no model "black-badge" in content.ts');
const model = found;
const B = library.blackBadge;

/**
 * On landscape screens a portrait photograph stands centred at full height
 * as a column of light, dissolving into the dark on every side.
 */
type Column = {
  /** [left, right] side fades, in % of the column's width. */
  feather: [number, number];
  /**
   * An ellipse the photograph also dissolves out of, so lit corners die inside
   * the frame: [radius x, radius y, centre x, centre y, solid core], in %.
   */
  pool?: [number, number, number, number, number];
  /** Widest the column may open, as width over screen height: [up to 16:9, from 16:9, from 2:1]. */
  cap: [number, number, number];
  /**
   * Vertical focus on screens of 2:1 and wider, where the widest column crops
   * hardest; elsewhere the photograph's own position holds.
   */
  focusWide?: string;
  /** Widest the column may open as a share of the screen's width. */
  max: string;
  /** A grade for this photograph only, laid over it before the mask. */
  grade?: string;
};

type Shot = {
  image: ImageAsset;
  caption: string;
  column?: Column;
  sizes: string;
};

/** A landscape position whose vertical focus can shift on the widest screens. */
const focus = (x: string, y: string) => `${x} var(--focus-y, ${y})`;

/**
 * Four frames, cut hard. On landscape screens a portrait frame shows its full
 * width, so only the vertical position matters there; on portrait screens it
 * shows its full height, so only the horizontal one does.
 */
const SHOTS: Shot[] = [
  {
    image: B.mascot,
    caption: "On a base of woven carbon.",
    sizes: "max(100vw, 150vh)",
  },
  {
    // The figure stands right of centre with its wing close to the right edge,
    // over a lit ground: that side is graded down before it is feathered.
    image: { ...B.mascotDark, position: focus("74%", "22%") },
    caption: "Chrome, taken to its darkest.",
    column: {
      feather: [24, 18],
      pool: [78, 84, 60, 44, 56],
      // Any wider and the wings or the base would be cropped.
      cap: [0.9, 0.98, 0.98],
      max: "64vw",
      grade: "linear-gradient(90deg, transparent 56%, rgba(0,0,0,0.38) 100%)",
    },
    sizes: "(orientation: portrait) 125vw, min(70vw, 108vh)",
  },
  {
    // A bright reflection crosses the bonnet under the figure: the ellipse lets it die before the edges do.
    // The darkest photograph: on the widest screens it opens further, trading the top light for width.
    image: { ...B.bokeh, position: focus("50%", "30%") },
    caption: "After hours.",
    column: {
      feather: [27, 27],
      pool: [70, 80, 50, 40, 50],
      cap: [0.95, 1.1, 1.3],
      focusWide: "39%",
      max: "64vw",
    },
    sizes: "(orientation: portrait) 125vw, min(70vw, 143vh)",
  },
  {
    // The name stands either side of this one: it stays narrower so the words clear the car.
    image: { ...B.hero, position: focus("50%", "76%") },
    caption: "Head-on, under the lights.",
    column: {
      feather: [22, 22],
      cap: [0.82, 0.86, 0.92],
      focusWide: "70%",
      max: "50vw",
    },
    sizes: "(orientation: portrait) 100vw, min(55vw, 102vh)",
  },
];

/**
 * A photograph of one member of the family. It travels sideways under the
 * name, on a track wider than the screen, while the camera eases in or out.
 */
type Still = {
  image: ImageAsset;
  /** The point held at the centre of the screen, from and to, as shares of the photograph's width. */
  pan: [number, number];
  /** Scale over the frame's time on screen, from and to. */
  push: [number, number];
  /** Where the push closes in. */
  origin: string;
  /** A grade for this photograph only. */
  grade?: string;
};

type Member = {
  /** The full name, as content.ts has it: "Black Badge Ghost". */
  title: string;
  /** The model alone: "Ghost". */
  name: string;
  /** "600 PS". */
  power: string;
  /** The rest of the note: "Darkened chrome". */
  detail: string;
  caption: string;
  still?: Still;
};

/**
 * How each member is shown, by its name in content.ts. A member is shown in a
 * photograph of that car or in none: no photograph of a Black Badge Spectre
 * exists, so its frame is set in type alone, and a name missing here falls
 * back to the same rather than borrowing another car's picture.
 */
const FRAMING: Record<string, { caption: string; still?: Still }> = {
  "Black Badge Ghost": {
    caption: "In profile, beneath the stage lights.",
    still: {
      image: { ...library.ghost.side, alt: "Black Badge Ghost in profile under stage light" },
      // From the rear door to the bonnet: on a phone the whole car passes under the name.
      pan: [0.34, 0.68],
      push: [1.06, 1],
      origin: "50% 66%",
    },
  },
  "Black Badge Cullinan": {
    caption: "Its headlamp, set into matte black.",
    still: {
      image: B.lamp,
      pan: [0.4, 0.58],
      push: [1, 1.08],
      origin: "50% 56%",
      // Shot against a white studio wall: the corner above the wing is taken down to the dark of the reel.
      grade: "radial-gradient(ellipse 80% 70% at 88% 0%, rgba(0,0,0,0.72), transparent 72%)",
    },
  },
  // The strongest figure in the collection (content.ts has no Royce above 659 PS).
  "Black Badge Spectre": { caption: "The most powerful Royce yet." },
};

/** "600 PS, darkened chrome" reads as a figure and a detail. */
function member(variant: { name: string; note: string }): Member {
  const [power, ...rest] = variant.note.split(", ");
  const detail = rest.join(", ");
  return {
    title: variant.name,
    name: variant.name.replace(`${model.name} `, ""),
    power,
    detail: detail.charAt(0).toUpperCase() + detail.slice(1),
    ...(FRAMING[variant.name] ?? { caption: variant.note }),
  };
}

const FAMILY = (model.variants ?? []).map(member);

/** "Built beyond ordinary.", one word to a cut. */
const WORDS = model.line.split(" ");
const LINE = `${model.kind} of every Royce.`;

/*
 * The reel, in screens of scroll from the moment the section pins. The
 * montage cuts at CUTS (the first puts "Built" over the opening frame); the
 * name holds, then each member of the family wipes in over the frame before.
 */
const CUTS = [0.06, 0.78, 1.5, 2.22];
/** Scroll over which a cut settles from 1.1x to rest. */
const PUNCH = 0.18;
/** The first member arrives, then one every BEAT. */
const FAMILY_AT = 3.05;
const BEAT = 0.9;
/** The wipe that brings each member in. */
const WIPE = 0.42;
const rollAt = (i: number) => FAMILY_AT + i * BEAT;
const REEL = rollAt(FAMILY.length);
/** Phones take the same reel in less scroll. */
const PACE_MOBILE = 0.75;

/** A member waits shut against the right edge, then opens across the screen. */
const SHUT = "inset(0% 0% 0% 100%)";
const OPEN = "inset(0% 0% 0% 0%)";

/** A member's photograph rides a track this much wider than the screen, so it can travel. */
const TRACK_VW = 112;

const isFinal = (i: number) => i === SHOTS.length - 1;
/** Portrait screens stack the last frame over its copy, so the car and the name never collide. */
const FINAL_STACK = "portrait:flex portrait:flex-col";

/**
 * The montage words and the name share one size, so the name lands at full
 * volume. Near square, the name also stays clear of the car: the last term
 * is the room either side of it.
 */
const WORD_SIZE = "landscape:text-[min(8.2vw,15.5svh)]";
const NAME_SIZE = "landscape:text-[min(8.2vw,15.5svh,calc(11.6vw_-_5.2svh))]";
/** Near square, the line also keeps to the room beside the car (the last term). */
const LINE_WIDTH = "landscape:max-w-[min(17ch,26vw,calc(45.5vw_-_24svh_-_1.5rem))]";
/** Set in type alone, the name is the picture: it takes the width of the frame, gutter to gutter (about 6em wide). */
const SET_SIZE = "text-[14vw] landscape:text-[min(15vw,24svh)]";

/**
 * Mask stops for an eased fade (smoothstep) between two points, in %.
 * A linear fade shows where it ends; this one has no visible edge.
 */
function ramp(from: number, to: number, rising: boolean) {
  return [0, 0.12, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88, 1].map((t) => {
    const k = rising ? t : 1 - t;
    return `rgba(0,0,0,${(k * k * (3 - 2 * k)).toFixed(3)}) ${(from + (to - from) * t).toFixed(2)}%`;
  });
}

/** Feathers a column's sides into black. */
const featherSides = ([l, r]: [number, number]) =>
  `linear-gradient(90deg, ${[...ramp(0, l, true), ...ramp(100 - r, 100, false)].join(", ")})`;

/** The ellipse a column dissolves out of; without one, the whole column. */
const pool = (p?: Column["pool"]) =>
  p ? `radial-gradient(${p[0]}% ${p[1]}% at ${p[2]}% ${p[3]}%, ${ramp(p[4], 100, false).join(", ")})` : "linear-gradient(#000, #000)";

/** On portrait screens the last frame dissolves into the copy beneath it. */
const FADE_FOOT = `linear-gradient(180deg, ${ramp(56, 100, false).join(", ")})`;

/** Width to fetch for a cover-fitted photograph at a given zoom, on a box `vw` wide and a screen high. */
const coverSizes = (image: ImageAsset, vw: number, zoom = 1) =>
  `max(${Math.ceil(vw * zoom)}vw, ${Math.ceil((image.width / image.height) * 100 * zoom)}vh)`;

/**
 * Black Badge. A pinned montage cut hard, like a trailer: four frames, one
 * word to each, a short scale punch as every frame lands and a single pass
 * of light across it. The last cut resolves to the name. Then the family,
 * one member to a frame: each wipes in over the one before and its name
 * rises out of the dark, the photograph travelling slowly beneath it. The
 * Spectre, which no photograph shows, is cut in hard and closes the reel in
 * type alone.
 */
export function BlackBadge() {
  const reduced = useReducedMotionPref();
  return reduced ? <StillBadge /> : <MontageBadge />;
}

/** The name and the montage line, first in the section for anyone navigating by heading. */
function Heading() {
  return (
    <>
      <h2 id="black-badge-title" className="sr-only">
        {model.name}
      </h2>
      <p className="sr-only">{model.line}</p>
    </>
  );
}

function MontageBadge() {
  const section = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = section.current;
      if (!el) return;
      const mm = gsap.matchMedia();

      mm.add(
        { desktop: "(min-width: 768px)", motion: "(prefers-reduced-motion: no-preference)" },
        (ctx) => {
          const { desktop, motion } = ctx.conditions as { desktop: boolean; motion: boolean };
          if (!motion) return;

          const q = gsap.utils.selector(el);
          const layers = q("[data-layer]");
          const inners = q("[data-inner]");
          const bands = q("[data-band]");
          const words = q("[data-word]");
          const resolve = q("[data-resolve]");
          const members = q("[data-member]");

          // Without scripts the section rests on the name. Armed, it opens on the first frame,
          // and the family waits shut at the right edge.
          gsap.set(layers, { opacity: (i: number) => (i === 0 ? 1 : 0) });
          gsap.set(words[0], { opacity: 0 });
          gsap.set(inners[0], { scale: 1.06 });
          gsap.set(members, { opacity: 1, clipPath: SHUT });

          // Shut, the family's photographs may never register as on screen with native lazy
          // loading: fetch them as the section approaches instead.
          const images = q("[data-member] img") as HTMLImageElement[];
          onReach(el, `top bottom+=${Math.round(window.innerHeight)}`, () => images.forEach((img) => (img.loading = "eager")));

          // One pass of light each time a frame lands, in either direction.
          // The band waits off the left edge; 267% of its width carries it clear of the right.
          const sweep = (i: number) => {
            const band = bands[i];
            if (!band) return;
            gsap.fromTo(band, { xPercent: 0 }, { xPercent: 267, duration: 1.1, ease: "power2.inOut", overwrite: true });
          };
          const lands = [...CUTS, ...FAMILY.map((m, i) => rollAt(i) + (m.still ? WIPE : 0))];

          let shown = -1;
          const tl = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: el,
              start: "top top",
              end: () => `+=${Math.round(window.innerHeight * REEL * (desktop ? 1 : PACE_MOBILE))}`,
              pin: true,
              anticipatePin: 1,
              scrub: 0.35,
              invalidateOnRefresh: true,
            },
            onUpdate() {
              const t = tl.time();
              const frame = lands.filter((at) => t >= at).length - 1;
              if (frame !== shown) {
                shown = frame;
                sweep(Math.max(frame, 0));
              }
            },
          });

          // Opening frame: "Built" lands as the pin takes hold.
          tl.set(words[0], { opacity: 1 }, CUTS[0]);
          tl.fromTo(inners[0], { scale: 1.06 }, { scale: 1, duration: PUNCH, ease: "power3.out", immediateRender: false }, CUTS[0]);

          // Hard cuts: the previous frame is gone in the same instant the next arrives.
          for (let i = 1; i < SHOTS.length; i++) {
            tl.set(layers[i - 1], { opacity: 0 }, CUTS[i]);
            tl.set(layers[i], { opacity: 1 }, CUTS[i]);
            tl.fromTo(inners[i], { scale: 1.1 }, { scale: 1, duration: PUNCH, ease: "power3.out", immediateRender: false }, CUTS[i]);
          }

          // The name holds; the line settles in beneath it.
          tl.fromTo(resolve, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.21, ease: "power2.out" }, CUTS[3] + 0.12);

          // The family. Each member with a photograph wipes in from the right over the frame before;
          // once it has covered it, the name rises out of the dark and the figures settle beside it.
          // A name never rises before then, so it never stands beside another car's photograph.
          // The photograph keeps travelling until the next member has covered it.
          const across = (track: HTMLElement, at: number) => () => {
            const view = el.clientWidth;
            const w = track.offsetWidth;
            return gsap.utils.clamp(view - w, 0, view / 2 - at * w);
          };
          members.forEach((frame, i) => {
            const at = rollAt(i);
            const $ = gsap.utils.selector(frame);
            const still = FAMILY[i].still;
            const name = $("[data-name]");
            const meta = $("[data-meta]");
            const settle = { opacity: 1, y: 0, duration: 0.2, stagger: 0.06, ease: "power2.out" };

            if (!still) {
              // Set in type alone, a member arrives the way the montage's frames did: cut hard, its
              // name already rising and its line of light drawing out as the frame appears. A wipe
              // would either stand the name beside the photograph it covers or uncover an empty ground.
              tl.set(frame, { clipPath: OPEN }, at);
              tl.fromTo($("[data-rule]"), { scaleX: 0 }, { scaleX: 1, duration: 0.3, ease: "power2.out" }, at - 0.04);
              tl.fromTo(name, { yPercent: 112 }, { yPercent: 0, duration: 0.3, ease: "power3.out" }, at - 0.08);
              tl.fromTo(meta, { opacity: 0, y: 18 }, settle, at + 0.1);
              return;
            }

            const life = Math.min(BEAT + WIPE, REEL - at);
            const [edge] = q(`[data-edge="${i}"]`);
            tl.fromTo(frame, { clipPath: SHUT }, { clipPath: OPEN, duration: WIPE, ease: "power2.inOut", immediateRender: false }, at);
            // A hairline of light rides the leading edge of the wipe, and is gone once it has crossed.
            tl.fromTo(edge, { x: () => el.clientWidth, opacity: 1 }, { x: 0, duration: WIPE, ease: "power2.inOut", immediateRender: false }, at);
            tl.to(edge, { opacity: 0, duration: 0.06 }, at + WIPE - 0.06);
            const [track] = $("[data-track]") as HTMLElement[];
            tl.fromTo(track, { x: across(track, still.pan[0]) }, { x: across(track, still.pan[1]), duration: life }, at);
            tl.fromTo($("[data-push]"), { scale: still.push[0] }, { scale: still.push[1], duration: life }, at);
            tl.fromTo(name, { yPercent: 112 }, { yPercent: 0, duration: 0.3, ease: "power3.out" }, at + WIPE);
            tl.fromTo(meta, { opacity: 0, y: 18 }, settle, at + WIPE + 0.08);
          });
          tl.set({}, {}, REEL);

          // Arrival: the opening frame settles as the section rises into view. Its own wrapper,
          // so it never contends with the punch for the same transform.
          gsap.fromTo(
            q("[data-arrive]")[0],
            { scale: 1.06 },
            {
              scale: 1,
              ease: "none",
              scrollTrigger: { trigger: el, start: "top bottom", end: "top top", scrub: true, invalidateOnRefresh: true },
            },
          );

          // Sweeps are started from scroll callbacks, outside this context's record: stop any in flight.
          return () => gsap.killTweensOf(bands);
        },
      );
    },
    { scope: section },
  );

  return (
    <section
      ref={section}
      id="black-badge"
      aria-labelledby="black-badge-title"
      className="relative h-[100svh] overflow-hidden bg-obsidian"
    >
      <Heading />
      {SHOTS.map((shot, i) => (
        <div key={shot.image.src} data-layer className={cx("absolute inset-0", !isFinal(i) && "opacity-0", isFinal(i) && FINAL_STACK)}>
          <Picture shot={shot} index={i} />
          {i < WORDS.length ? <Word index={i} /> : <Resolution animated />}
        </div>
      ))}
      {FAMILY.map((m, i) => (
        <Fragment key={m.title}>
          <div data-member className="absolute inset-0 overflow-hidden opacity-0">
            <FamilyFrame member={m} />
          </div>
          {m.still && (
            <span data-edge={i} aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-px bg-ivory/45 opacity-0" />
          )}
        </Fragment>
      ))}
    </section>
  );
}

/** Reduced motion: the same frames, still, one after another, with every line of copy. */
function StillBadge() {
  return (
    <section id="black-badge" aria-labelledby="black-badge-title" className="relative bg-obsidian">
      <Heading />
      {SHOTS.map((shot, i) => (
        <div key={shot.image.src} className={cx("relative h-[100svh] min-h-[34rem] overflow-hidden", isFinal(i) && FINAL_STACK)}>
          <Picture shot={shot} index={i} still />
          {i < WORDS.length ? <Word index={i} /> : <Resolution />}
        </div>
      ))}
      {FAMILY.map((m) => (
        <div key={m.title} className="relative h-[100svh] min-h-[34rem] overflow-hidden">
          <FamilyFrame member={m} still />
        </div>
      ))}
    </section>
  );
}

/** A single narrow band of light, passed across the frame as it lands. Overlay: it lifts the chrome, never the black. */
function LightPass() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden mix-blend-overlay">
      <div
        data-band
        className="absolute inset-y-[-10%] left-[-60%] w-[60%] bg-[linear-gradient(110deg,transparent_40%,rgba(236,231,222,0.18)_46%,rgba(236,231,222,0.4)_50%,rgba(236,231,222,0.18)_54%,transparent_60%)]"
      />
    </div>
  );
}

/** A line about the picture. */
function Slate({ caption, as: Tag = "figcaption", className }: { caption: string; as?: "figcaption" | "p"; className?: string }) {
  return (
    <Tag
      className={cx(
        "absolute inset-x-0 bottom-[max(1.25rem,3.5svh)] flex items-baseline justify-between gap-6 px-page text-ivory/55",
        className,
      )}
    >
      <span className="type-caption ml-auto text-right">{caption}</span>
    </Tag>
  );
}

function Picture({ shot, index, still = false }: { shot: Shot; index: number; still?: boolean }) {
  const final = isFinal(index);
  const { image, column } = shot;

  return (
    <figure className={cx("absolute inset-0 m-0", final && "portrait:relative portrait:min-h-0 portrait:flex-1")}>
      <div
        className={cx(
          "absolute overflow-hidden",
          column
            ? // Landscape: centred at full height, dissolving into black on every side.
              cx(
                "inset-y-0 portrait:inset-x-0 landscape:inset-x-0 landscape:mx-auto",
                "[--cap:var(--cap-n)] [@media(min-aspect-ratio:16/9)_and_(max-aspect-ratio:2/1)]:[--cap:var(--cap-w)]",
                "[@media(min-aspect-ratio:2/1)]:[--cap:var(--cap-u)] [@media(min-aspect-ratio:2/1)]:[--focus-y:var(--focus-u)]",
                "landscape:w-[min(100%,max(calc(100svh*var(--ar)),min(var(--max),calc(100svh*var(--cap)))))]",
                "landscape:[mask-composite:intersect] landscape:[mask-image:var(--feather),var(--pool)]",
              )
            : "inset-0",
          // Portrait screens: the last frame sits above the name and dissolves into it.
          final && "portrait:[mask-image:var(--fade)]",
        )}
        style={
          column
            ? vars({
                "--ar": image.width / image.height,
                "--cap-n": column.cap[0],
                "--cap-w": column.cap[1],
                "--cap-u": column.cap[2],
                ...(column.focusWide ? { "--focus-u": column.focusWide } : {}),
                "--max": column.max,
                "--feather": featherSides(column.feather),
                "--pool": pool(column.pool),
                ...(final ? { "--fade": FADE_FOOT } : {}),
              })
            : undefined
        }
      >
        <div data-arrive className="absolute inset-0">
          <div data-inner className="absolute inset-0">
            <Frame image={image} sizes={shot.sizes} quality={85} />
          </div>
        </div>
        {/* Grade: ground the type at the foot, close the corners. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {column?.grade && <div className="absolute inset-0" style={{ backgroundImage: column.grade }} />}
          <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-obsidian/85 via-obsidian/30 to-transparent" />
          {/* Stacked still, every frame ends in true black, so it meets the next frame's black without a seam. */}
          {still && <div className="absolute inset-x-0 bottom-0 h-[9%] bg-gradient-to-t from-obsidian to-transparent" />}
          {/* The opening frame rises out of the dark: no line where it meets the section above. */}
          {index === 0 && <div className="absolute inset-x-0 top-0 h-[24%] bg-gradient-to-b from-obsidian via-obsidian/45 to-transparent" />}
          {/* Stacked still, each frame rises out of the one before it rather than butting against it. */}
          {still && index > 0 && <div className="absolute inset-x-0 top-0 h-[16%] bg-gradient-to-b from-obsidian via-obsidian/35 to-transparent" />}
          {!column && <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_42%,rgba(0,0,0,0.62)_100%)]" />}
          {column && <div className="absolute inset-x-0 top-0 h-[38%] bg-gradient-to-b from-obsidian/50 to-transparent" />}
          {!column && <div className="absolute inset-0 bg-obsidian/20" />}
        </div>
        {!still && <LightPass />}
      </div>

      <Slate caption={shot.caption} className={cx(final && "hidden landscape:flex")} />
    </figure>
  );
}

/** One word of the line, huge, set to a different edge on each cut. */
function Word({ index }: { index: number }) {
  const align = ["text-left", "text-right", "text-center"][index];
  return (
    <p
      aria-hidden
      data-word
      className={cx(
        "type-brand pointer-events-none absolute inset-x-0 bottom-[max(3.75rem,9.5svh)] whitespace-nowrap px-page font-[200] leading-[0.78]",
        // One size for all three, so the line builds rather than shrinks: the longest word sets the measure on a phone.
        "text-[13.2vw] tracking-[-0.02em] landscape:tracking-[-0.01em]",
        WORD_SIZE,
        align,
      )}
    >
      {WORDS[index]}
    </p>
  );
}

/** The last cut: the name either side of the car, the line beneath. The family that follows carries the figures. */
function Resolution({ animated = false }: { animated?: boolean }) {
  return (
    <div className="relative -mt-[9svh] px-page pb-[max(2.25rem,5.5svh)] landscape:absolute landscape:inset-x-0 landscape:bottom-[max(4.5rem,13svh)] landscape:mt-0 landscape:pb-0">
      {/* The heading itself opens the section; this is its display setting. */}
      <div
        aria-hidden
        className={cx(
          "type-brand flex flex-col whitespace-nowrap font-[200] leading-[0.84] tracking-[-0.01em] text-[min(18vw,8.2svh)]",
          "landscape:flex-row landscape:items-baseline landscape:justify-between",
          NAME_SIZE,
        )}
      >
        {model.name.split(" ").map((w, i) => (
          <span key={w} className={cx(i === 1 && "self-end landscape:self-auto")}>
            {w}
          </span>
        ))}
      </div>

      <p
        {...(animated ? { "data-resolve": "" } : {})}
        className={cx(
          "type-statement mt-5 max-w-[17ch] text-balance text-[clamp(1.35rem,1rem+1.4vw,2.35rem)] text-ivory/85 landscape:mt-[9.5svh]",
          LINE_WIDTH,
        )}
      >
        {LINE}
      </p>
    </div>
  );
}

/**
 * One member of the family: its photograph, travelling, with the name over
 * it; or, where no photograph of the car exists, the name alone on a lit
 * ground, standing on a line of light.
 */
function FamilyFrame({ member, still = false }: { member: Member; still?: boolean }) {
  if (!member.still) {
    return (
      <>
        <LitGround />
        <FamilyTitle member={member} />
        {!still && <LightPass />}
        <Slate as="p" caption={member.caption} />
      </>
    );
  }
  return (
    <>
      <FamilyTitle member={member} />
      <figure className="absolute inset-0 m-0">
        <FamilyPicture shot={member.still} still={still} />
        <Slate caption={member.caption} />
      </figure>
    </>
  );
}

function FamilyPicture({ shot, still }: { shot: Still; still: boolean }) {
  const { image, push } = shot;
  return (
    <div className="absolute inset-0 overflow-hidden">
      {still ? (
        // Held still, the photograph simply covers the frame at its own focus.
        <Frame image={image} sizes={coverSizes(image, 100)} quality={85} />
      ) : (
        <div
          data-track
          className="absolute inset-y-0 left-0 w-[max(var(--track),calc(100svh*var(--ar)))]"
          style={vars({ "--track": `${TRACK_VW}vw`, "--ar": image.width / image.height })}
        >
          <div data-push className="absolute inset-0" style={{ transformOrigin: shot.origin }}>
            <Frame image={image} sizes={coverSizes(image, TRACK_VW, Math.max(...push))} quality={85} />
          </div>
        </div>
      )}
      {/* Grade: lift the sky for the navigation, ground the name at the foot. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {shot.grade && <div className="absolute inset-0" style={{ backgroundImage: shot.grade }} />}
        <div className="absolute inset-x-0 top-0 h-[30%] bg-gradient-to-b from-obsidian/55 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-obsidian/90 via-obsidian/40 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.45)_100%)]" />
        {/* Stacked still, each frame rises out of the one before it and ends in true black. */}
        {still && <div className="absolute inset-x-0 top-0 h-[16%] bg-gradient-to-b from-obsidian via-obsidian/35 to-transparent" />}
        {still && <div className="absolute inset-x-0 bottom-0 h-[9%] bg-gradient-to-t from-obsidian to-transparent" />}
      </div>
      {!still && <LightPass />}
    </div>
  );
}

/**
 * The ground for a name set in type alone: a broad light falling on the
 * middle of the frame, the charcoal around it dying to black at every edge,
 * so the frame meets the reel's black, and the film below, without a seam.
 */
function LitGround() {
  return (
    <div aria-hidden className="absolute inset-0 bg-charcoal">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_62%_46%_at_50%_50%,rgba(236,231,222,0.075),transparent_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_80%_at_50%_50%,transparent_35%,rgba(0,0,0,0.75)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-[22%] bg-gradient-to-b from-obsidian to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[22%] bg-gradient-to-t from-obsidian to-transparent" />
    </div>
  );
}

/**
 * The member's name: "Black Badge" small above it, the model huge, rising
 * from behind its own baseline; the power and the one detail that sets it
 * apart beside it. Over a photograph it sits at the foot, where the montage
 * words land; set in type alone it takes the middle of the frame.
 */
function FamilyTitle({ member }: { member: Member }) {
  const set = !member.still;
  const [value, unit] = member.power.split(" ");

  return (
    <div
      className={cx(
        "pointer-events-none absolute z-10 flex px-page",
        set
          ? "inset-0 flex-col items-center justify-center text-center"
          : "inset-x-0 bottom-[max(5.5rem,11.5svh)] flex-col gap-4 landscape:bottom-[max(3.75rem,9.5svh)] landscape:flex-row landscape:items-end landscape:justify-between landscape:gap-10",
      )}
    >
      <h3 className={cx(set && "flex flex-col items-center")}>
        <span data-meta className="type-micro block text-ivory/60">
          {model.name}
        </span>{" "}
        <span className={cx("block [overflow-y:clip] pb-[0.04em]", set ? "mt-[2.5svh]" : "mt-[1.6svh]")}>
          <span
            data-name
            className={cx(
              "type-brand block whitespace-nowrap font-[200] leading-[0.9]",
              set ? cx(SET_SIZE, "tracking-[0.02em]") : cx("text-[13.2vw] tracking-[-0.02em] landscape:tracking-[-0.01em]", WORD_SIZE),
            )}
          >
            {member.name}
          </span>
        </span>
      </h3>

      {set && (
        <span
          data-rule
          aria-hidden
          className="block h-px w-full bg-[linear-gradient(90deg,transparent,rgba(236,231,222,0.7)_28%,rgba(236,231,222,0.7)_72%,transparent)]"
        />
      )}

      <p
        data-meta
        className={cx(
          "flex items-baseline gap-x-5 gap-y-2",
          set
            ? // Upright, the frame is tall and the name narrow: the figure grows to share the frame with it.
              "mt-[3.5svh] flex-col items-center gap-y-[2.5svh] landscape:flex-row landscape:flex-wrap landscape:justify-center landscape:gap-y-2"
            : "landscape:flex-col landscape:items-end landscape:text-right",
        )}
      >
        <span className="whitespace-nowrap">
          <span
            className={cx(
              "type-brand font-[200] leading-none tabular-nums",
              set ? "text-[min(32vw,24svh)] landscape:text-[clamp(1.5rem,1rem+1.8vw,4rem)]" : "text-[clamp(1.5rem,1rem+1.8vw,4rem)]",
            )}
          >
            {value}
          </span>
          <span className="type-micro ml-2 text-ivory/70">{unit}</span>
        </span>
        <span className="sr-only">, </span>
        <span className="type-micro text-pewter">{member.detail}</span>
      </p>
    </div>
  );
}
