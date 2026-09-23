"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotionPref } from "@/lib/hooks";
import type { ImageAsset } from "@/lib/media";
import { createScrubber, whenMetadata } from "@/lib/scrub";
import { createSequencePlayer, frameUrl } from "@/lib/sequence";
import { cx } from "@/lib/utils";
import { FilmHud } from "../film/FilmHud";
import { useHasMedia } from "../providers/Providers";
import { Frame } from "../ui/Frame";
import { LineCta } from "../ui/LineCta";
import type { Beat, BeatPlace, ChapterConfig, Shot, Transition } from "./types";

const PLACE: Record<BeatPlace, string> = {
  "bottom-left": "left-0 bottom-[max(4.5rem,12svh)] max-w-[min(100%,46rem)]",
  "bottom-right":
    "left-0 bottom-[max(4.5rem,12svh)] md:left-auto md:right-0 md:max-w-[min(100%,34rem)] md:items-end md:text-right",
  // Shares the foot with a bottom-left block: on phones it moves to the top, where there is room.
  side: "left-0 top-[calc(4.75rem+3.25rem)] md:left-auto md:right-0 md:top-auto md:bottom-[max(4.5rem,12svh)] md:max-w-[min(100%,34rem)] md:items-end",
  "bottom-center": "inset-x-0 bottom-[max(4.5rem,11svh)] text-center items-center",
  center: "inset-x-0 top-1/2 -translate-y-1/2 text-center items-center",
  "center-left": "left-0 top-1/2 -translate-y-1/2 max-w-[min(100%,52rem)]",
  "top-left": "left-0 top-[calc(4.75rem+7svh)] max-w-[min(100%,40rem)]",
  "top-right": "right-0 top-[calc(4.75rem+7svh)] max-w-[min(100%,34rem)] text-right items-end",
};

/** Clip-paths each transition opens from (the "to" state is always fully open). */
function clipFrom(t: Transition, iris = "50% 50%") {
  switch (t) {
    case "wipe-left":
      return "inset(0% 0% 0% 100%)";
    case "wipe-right":
    case "sweep":
      return "inset(0% 100% 0% 0%)";
    case "wipe-up":
      return "inset(100% 0% 0% 0%)";
    case "split":
      return "inset(0% 50% 0% 50%)";
    case "iris":
      return `circle(0% at ${iris})`;
    default:
      return null;
  }
}
const clipTo = (t: Transition, iris = "50% 50%") => (t === "iris" ? `circle(85% at ${iris})` : "inset(0% 0% 0% 0%)");

export function CinematicChapter({ config }: { config: ChapterConfig }) {
  const reduced = useReducedMotionPref();
  const has = useHasMedia();
  const filmReady = config.film ? has(config.film.src) : false;
  const seq = config.sequence;
  const seqReady = seq ? has(frameUrl(seq, 0)) && has(frameUrl(seq, seq.count - 1)) : false;

  if (reduced) return <StillChapter config={config} />;
  return <PlayingChapter config={config} filmReady={filmReady} seqReady={seqReady} />;
}

/** How long a chapter film may take to report its duration before the chapter plays its shot list instead. */
const FILM_PATIENCE_MS = 10000;

function PlayingChapter({ config, filmReady: filmOnDisk, seqReady }: { config: ChapterConfig; filmReady: boolean; seqReady: boolean }) {
  const section = useRef<HTMLElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [duration, setDuration] = useState(0);
  const [filmFailed, setFilmFailed] = useState(false);
  const filmReady = filmOnDisk && !filmFailed;
  const { travel, shots, beats, sequence: seq } = config;

  // Video: learn the duration, then buffer the whole clip for instant seeking. A
  // film that errors or never reports its duration gives way to the shot list,
  // so the chapter is never a pinned, empty frame.
  useEffect(() => {
    const v = video.current;
    if (!filmReady || !v) return;
    let alive = true;
    const giveUp = (reason: string) => {
      if (!alive) return;
      if (process.env.NODE_ENV !== "production") console.warn(`[media] ${config.film?.src}: ${reason}; playing the shot list instead.`);
      setFilmFailed(true);
    };
    const timer = window.setTimeout(() => giveUp("no metadata in time"), FILM_PATIENCE_MS);
    whenMetadata(v)
      .then(() => {
        window.clearTimeout(timer);
        if (!alive) return;
        if (!Number.isFinite(v.duration) || v.duration <= 0) return giveUp("unusable duration");
        v.preload = "auto";
        setDuration(v.duration);
      })
      .catch(() => {
        window.clearTimeout(timer);
        giveUp("failed to load");
      });
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [filmReady, config.film?.src]);

  useGSAP(
    () => {
      const el = section.current;
      const pinEl = pin.current;
      if (!el || !pinEl || (filmReady && !duration)) return;
      const q = gsap.utils.selector(el);
      const barsY = q("[data-hud-bar='y']");
      const barsX = q("[data-hud-bar='x']");
      let disposeSequence: (() => void) | undefined;

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: "bottom bottom",
          pin: pinEl,
          pinSpacing: false,
          anticipatePin: 1,
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
        onUpdate() {
          const p = tl.progress();
          gsap.set(barsY, { scaleY: p });
          gsap.set(barsX, { scaleX: p });
        },
      });

      if (filmReady && video.current) {
        // Scroll is the playhead.
        const scrubber = createScrubber(video.current);
        const head = { t: 0 };
        tl.to(
          head,
          {
            t: 1,
            duration: 0.9,
            onUpdate() {
              scrubber.seek(head.t * duration);
            },
          },
          0,
        );
      } else {
        shots.forEach((shot, i) => addShot(tl, q, shot, i));
        if (seqReady && seq && canvas.current && config.sequenceSpan) {
          const player = createSequencePlayer(canvas.current, seq);
          const [a, b] = config.sequenceSpan;
          const head = { p: 0 };
          tl.fromTo(q("[data-seq]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.02 }, a);
          tl.to(head, { p: 1, duration: b - a, onUpdate: () => player.setProgress(head.p) }, a);
          tl.to(q("[data-seq]"), { autoAlpha: 0, duration: 0.02 }, b);
          const onResize = () => player.redraw();
          window.addEventListener("resize", onResize);
          disposeSequence = () => {
            window.removeEventListener("resize", onResize);
            player.destroy();
          };
        }
      }

      beats.forEach((beat, i) => addBeat(tl, q, beat, i));

      if (config.exitDim !== false) {
        tl.to(q("[data-exit]"), { opacity: 0.5, duration: 0.06 }, 0.94);
        tl.to(q("[data-scale]"), { scale: 0.97, duration: 0.06 }, 0.94);
        tl.to(q("[data-hud]"), { autoAlpha: 0, duration: 0.04 }, 0.95);
      }
      tl.set({}, {}, 1);

      // Arrival: the picture rises from beneath the previous chapter.
      gsap.fromTo(
        q("[data-stage]"),
        { yPercent: -24 },
        { yPercent: 0, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "top top", scrub: true } },
      );

      // No refresh here: creating the pin already queues one, and a synchronous
      // refresh inside setup re-measures every trigger on the page per chapter.
      el.dataset.armed = "";
      return () => {
        disposeSequence?.();
        delete el.dataset.armed;
      };
    },
    { dependencies: [duration, filmReady, seqReady], scope: section, revertOnUpdate: true },
  );

  const vars = {
    "--tm": `${travel.mobile * 100}svh`,
    "--tt": `${travel.tablet * 100}svh`,
    "--td": `${travel.desktop * 100}svh`,
  } as CSSProperties;
  const heading = beats.find((b) => b.heading);

  return (
    <section
      ref={section}
      id={config.id}
      aria-labelledby={`${config.id}-title`}
      style={vars}
      className="cinema relative h-[calc(100svh+var(--tm))] bg-obsidian md:h-[calc(100svh+var(--tt))] lg:h-[calc(100svh+var(--td))]"
    >
      {!heading && (
        <h2 id={`${config.id}-title`} className="sr-only">
          {config.title}
        </h2>
      )}
      <div ref={pin} className="relative h-[100svh] w-full overflow-hidden">
        <div data-stage className="absolute inset-0">
          <div data-scale className="absolute inset-0">
            {filmReady && config.film ? (
              <video
                ref={video}
                className="absolute inset-0 size-full object-cover"
                muted
                playsInline
                preload="metadata"
                poster={config.film.poster}
                aria-hidden
                tabIndex={-1}
              >
                {config.film.mobileSrc && (
                  <source src={config.film.mobileSrc} type="video/mp4" media="(max-aspect-ratio: 4/5)" />
                )}
                <source src={config.film.src} type="video/mp4" />
              </video>
            ) : (
              shots.map((shot, i) => <ShotLayer key={shot.image.src + i} shot={shot} index={i} />)
            )}
            {seqReady && (
              <canvas data-seq aria-hidden className="invisible absolute inset-0 z-40 size-full" ref={canvas} />
            )}
          </div>
          {/* Grade: lift the sky for the navigation, ground the words at the foot. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 z-[45]">
            <div className="absolute inset-x-0 top-0 h-[26%] bg-gradient-to-b from-obsidian/55 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-obsidian/85 via-obsidian/35 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.45)_100%)]" />
          </div>
          <div
            data-sweep
            aria-hidden
            className="pointer-events-none invisible absolute inset-y-0 -left-1/2 z-[46] w-1/2 bg-[linear-gradient(100deg,transparent_20%,rgba(236,231,222,0.16)_50%,transparent_80%)] mix-blend-screen"
          />
          <div data-exit aria-hidden className="pointer-events-none absolute inset-0 z-[47] bg-obsidian opacity-0" />
        </div>

        {beats.map((beat, i) => (
          <BeatBlock key={i} beat={beat} index={i} id={beat.heading ? `${config.id}-title` : undefined} />
        ))}

        <FilmHud />
      </div>
    </section>
  );
}

/* ---------- Timeline builders ---------- */

type Q = (selector: string) => Element[];

function addShot(tl: gsap.core.Timeline, q: Q, shot: Shot, i: number) {
  const layer = q(`[data-shot="${i}"]`);
  const cam = q(`[data-shot="${i}"] [data-cam]`);
  const shade = q(`[data-shot="${i}"] [data-shade]`);
  const c = shot.camera ?? {};
  const [s0, s1] = c.scale ?? [1.1, 1];
  const [x0, x1] = c.x ?? [0, 0];
  const [y0, y1] = c.y ?? [0, 0];
  const enter: Transition = shot.enter ?? (i === 0 ? "from-dark" : "dissolve");
  const span = shot.span ?? 0.04;

  // Camera: runs from the moment the shot starts arriving until it settles.
  tl.fromTo(
    cam,
    { scale: s0, xPercent: x0, yPercent: y0 },
    { scale: s1, xPercent: x1, yPercent: y1, duration: Math.max(0.01, shot.until - shot.at) },
    shot.at,
  );

  if (i === 0 && enter !== "from-dark") return;

  if (enter === "from-dark") {
    // The lights come up. The first shot is visible from the start; a later one
    // crossfades in over the last frame while its shade lifts, so the screen
    // never passes through black.
    if (i > 0) tl.fromTo(layer, { autoAlpha: 0 }, { autoAlpha: 1, duration: Math.max(span * 0.5, 0.02) }, shot.at);
    tl.fromTo(shade, { opacity: i === 0 ? 0.42 : 0.45 }, { opacity: 0, duration: Math.max(span, 0.08) }, shot.at);
    return;
  }
  if (enter === "cut") {
    tl.fromTo(layer, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.001 }, shot.at);
    return;
  }
  if (enter === "dissolve") {
    tl.fromTo(layer, { autoAlpha: 0 }, { autoAlpha: 1, duration: span }, shot.at);
    return;
  }
  const from = clipFrom(enter, shot.irisAt);
  tl.fromTo(
    layer,
    { autoAlpha: 1, clipPath: from ?? "inset(0% 0% 0% 0%)" },
    { autoAlpha: 1, clipPath: clipTo(enter, shot.irisAt), duration: span, ease: "power2.inOut", immediateRender: false },
    shot.at,
  );
  // Hidden until its moment, even though the clip tween does not render early.
  tl.set(layer, { autoAlpha: 0 }, 0);
  tl.set(layer, { autoAlpha: 1 }, shot.at);
  if (enter === "sweep") {
    const band = q("[data-sweep]");
    tl.fromTo(band, { autoAlpha: 1, xPercent: -40 }, { xPercent: 320, duration: span * 1.2, ease: "power1.inOut" }, shot.at - span * 0.1);
    tl.set(band, { autoAlpha: 0 }, shot.at + span * 1.15);
  }
}

function addBeat(tl: gsap.core.Timeline, q: Q, beat: Beat, i: number) {
  const el = q(`[data-beat="${i}"]`);
  const lines = q(`[data-beat="${i}"] [data-line]`);
  if (beat.kind === "title" && lines.length) {
    tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.001 }, beat.at);
    tl.fromTo(lines, { yPercent: 112 }, { yPercent: 0, duration: 0.05, stagger: 0.012, ease: "power3.out" }, beat.at);
  } else {
    tl.fromTo(el, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.035, ease: "power2.out" }, beat.at);
  }
  if (beat.until !== undefined && beat.until < 1) {
    tl.to(el, { autoAlpha: 0, y: -18, duration: 0.03, ease: "power2.in" }, beat.until);
  }
}

/* ---------- Layers ---------- */

function ShotLayer({ shot, index }: { shot: Shot; index: number }) {
  const zoom = Math.max(...(shot.camera?.scale ?? [1.1, 1]));
  return (
    <div
      data-shot={index}
      className={cx("absolute inset-0 overflow-hidden bg-obsidian", index > 0 && "invisible")}
      style={{ zIndex: index + 1 }}
    >
      <div
        data-cam
        className="absolute inset-0 will-change-transform"
        style={{ transformOrigin: shot.camera?.origin ?? shot.image.position ?? "50% 50%" }}
      >
        {shot.portrait ? (
          <>
            <div className="absolute inset-0 [@media(max-aspect-ratio:4/5)]:hidden">
              <Picture image={shot.image} contain={shot.contain} zoom={zoom} />
            </div>
            <div className="absolute inset-0 hidden [@media(max-aspect-ratio:4/5)]:block">
              <Picture image={shot.portrait} zoom={zoom} />
            </div>
          </>
        ) : (
          <Picture image={shot.image} contain={shot.contain} zoom={zoom} />
        )}
      </div>
      <div data-shade aria-hidden className="pointer-events-none absolute inset-0 bg-obsidian opacity-0" />
    </div>
  );
}

/**
 * The width to fetch: the photograph's cover-fitted width at the camera's
 * closest framing. On screens narrower than the photograph, cover fills the
 * height, so the drawn width is aspect x 100vh; a push-in multiplies it.
 */
function coverSizes(image: ImageAsset, zoom: number) {
  const z = Math.max(1, zoom);
  const ar = image.width / image.height;
  return `(max-aspect-ratio: ${image.width}/${image.height}) ${Math.ceil(ar * 100 * z)}vh, ${Math.ceil(100 * z)}vw`;
}

/** Cover by default; `contain` shows a portrait photograph whole, its sides feathered into black. */
function Picture({ image, contain, zoom = 1 }: { image: ImageAsset; contain?: boolean; zoom?: number }) {
  if (!contain) return <Frame image={image} sizes={coverSizes(image, zoom)} quality={85} />;
  return (
    <div
      className="absolute inset-y-0 left-1/2 h-full -translate-x-1/2 [mask-image:linear-gradient(to_right,transparent,#000_16%,#000_84%,transparent)]"
      style={{ aspectRatio: `${image.width} / ${image.height}` }}
    >
      <Frame image={image} sizes={`(max-aspect-ratio: 4/5) ${Math.ceil(100 * zoom)}vw, ${Math.ceil(60 * zoom)}vw`} quality={85} />
    </div>
  );
}

function BeatBlock({ beat, index, id }: { beat: Beat; index: number; id?: string }) {
  const lines = Array.isArray(beat.text) ? beat.text : beat.text ? [beat.text] : [];
  return (
    <div className={cx("pointer-events-none absolute z-[48] flex flex-col px-page", PLACE[beat.place])}>
      <div data-beat={index} className="pointer-events-auto invisible">
        <BeatBody beat={beat} lines={lines} id={id} />
      </div>
    </div>
  );
}

function BeatBody({ beat, lines, id }: { beat: Beat; lines: string[]; id?: string }) {
  const Heading = beat.heading ? "h2" : "p";
  switch (beat.kind) {
    case "title": {
      // The display face runs about 0.72em per character: a long word (DIFFERENTLY.) is sized
      // down to fit between the page gutters instead of running to the screen edge.
      const longest = Math.max(...lines.map((l) => l.length));
      const fit = `calc((100vw - 2 * clamp(1.25rem, 4.5vw, 5.5rem)) / ${(longest * 0.72).toFixed(2)})`;
      return (
        <Heading
          id={id}
          className="type-brand font-[200] leading-[0.9] tracking-[0.005em]"
          style={{ fontSize: `min(clamp(2.4rem, min(11vw, 17svh), 10rem), ${fit})` }}
        >
          {lines.map((l) => (
            <span key={l} className="block whitespace-nowrap pb-[0.06em] [overflow-y:clip]">
              <span data-line className="block">
                {l}
              </span>
            </span>
          ))}
        </Heading>
      );
    }
    case "statement":
      return (
        <Heading id={id} className="type-statement text-[clamp(1.9rem,4.4vw,4.75rem)] text-ivory">
          {lines.map((l) => (
            <span key={l} className="block">
              {l}
            </span>
          ))}
        </Heading>
      );
    case "caption":
      return <p className="type-lede max-w-[30ch] text-ivory/85">{lines.join(" ")}</p>;
    case "names":
      return (
        <ul className="flex flex-wrap justify-center gap-x-[clamp(1.25rem,4vw,3.5rem)] gap-y-3">
          {lines.map((l) => (
            <li key={l} className="type-brand text-[clamp(0.8rem,1.3vw,1.15rem)] font-light tracking-[0.34em] text-ivory/80">
              {l}
            </li>
          ))}
        </ul>
      );
    case "specs":
      return (
        <dl className="grid grid-cols-3 gap-x-[clamp(1rem,3vw,2.5rem)] gap-y-2 border-t border-ivory/20 pt-4 text-left">
          {beat.specs?.map((s) => (
            <div key={s.label}>
              <dt className="type-micro text-[0.625rem] text-ivory/50">{s.label}</dt>
              <dd className="mt-2 text-[0.875rem] leading-snug text-ivory/90 sm:text-[0.9375rem]">{s.value}</dd>
            </div>
          ))}
        </dl>
      );
    case "cta":
      return beat.cta ? <LineCta href={beat.cta.href} label={beat.cta.label} arrow="always" /> : null;
  }
}

/* ---------- Reduced motion: every shot and every line, in order, nothing pinned ---------- */

function StillChapter({ config }: { config: ChapterConfig }) {
  const heading = config.beats.find((b) => b.heading);
  return (
    <section id={config.id} aria-labelledby={`${config.id}-title`} className="relative bg-obsidian">
      {!heading && (
        <h2 id={`${config.id}-title`} className="sr-only">
          {config.title}
        </h2>
      )}
      {config.shots.map((shot, i) => {
        const next = config.shots[i + 1]?.at ?? 1.01;
        const here = config.beats.filter((b) => b.at >= (i === 0 ? -1 : shot.at) && b.at < next);
        return (
          <div key={shot.image.src + i} className="relative">
            <div className="relative h-[80svh] min-h-[28rem] overflow-hidden">
              <Picture image={shot.image} contain={shot.contain} />
              <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-obsidian to-transparent" />
            </div>
            {here.length > 0 && (
              <div className="px-page relative -mt-24 flex flex-col gap-6 pb-20">
                {here.map((beat, j) => {
                  const lines = Array.isArray(beat.text) ? beat.text : beat.text ? [beat.text] : [];
                  return (
                    <div key={j}>
                      <BeatBody beat={beat} lines={lines} id={beat.heading ? `${config.id}-title` : undefined} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
