"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { arrivalChapters as C } from "@/lib/content";
import { filmStore, useFilmStore } from "@/lib/film-store";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useReducedMotionPref } from "@/lib/hooks";
import { films } from "@/lib/media";
import { bufferedShare, createScrubber, whenMetadata } from "@/lib/scrub";
import { useHasMedia } from "../providers/Providers";
import { LineCta } from "../ui/LineCta";
import { FilmHud } from "./FilmHud";

/** Share of the scroll timeline over which the film plays. The rest holds the last frame, then exits. */
const FILM_END = 0.86;
/** Screens of scrolling per second of film. Tuned by hand: a normal flick moves a few frames, never the whole clip. */
const pace = () => (window.innerWidth >= 1024 ? 1.05 : window.innerWidth >= 768 ? 0.85 : 0.68);

/**
 * Film 01, the opening. The picture is pinned while the page scrolls
 * beneath it, and scroll position is the playhead: forward plays, back
 * rewinds, stopping holds the frame. Overlay chapters are keyed to the
 * same timeline so words and picture can never drift apart.
 */
export function FilmSequence() {
  const reduced = useReducedMotionPref();
  const has = useHasMedia();
  const film = films.arrival;
  const playable = has(film.src);
  const [failed, setFailed] = useState(false);
  const [duration, setDuration] = useState(0);
  const video = useRef<HTMLVideoElement>(null);

  // Load: learn the duration first, then buffer the whole clip so every frame seeks instantly.
  useEffect(() => {
    const v = video.current;
    if (!v || !playable || failed) {
      filmStore.set({ progress: 1, ready: true });
      return;
    }
    let alive = true;
    const onProgress = () => {
      const share = bufferedShare(v);
      if (share > 0.97 || v.readyState >= 4) filmStore.set({ progress: 1, ready: true });
      else filmStore.set({ progress: share });
    };
    v.addEventListener("progress", onProgress);
    v.addEventListener("canplaythrough", onProgress);

    whenMetadata(v)
      .then(() => {
        if (!alive) return;
        setDuration(v.duration);
        v.preload = "auto";
        // One muted play/pause lets mobile Safari paint frames when seeking.
        v.muted = true;
        v.play()
          .then(() => {
            v.pause();
            v.currentTime = 0;
          })
          .catch(() => {});
        onProgress();
      })
      .catch(() => {
        if (!alive) return;
        if (process.env.NODE_ENV !== "production") console.warn(`[media] ${films.arrival.src} failed to load; showing the poster.`);
        setFailed(true);
        filmStore.set({ progress: 1, ready: true });
      });

    // Rotating a phone swaps between the portrait and landscape cuts.
    const portrait = window.matchMedia("(max-aspect-ratio: 4/5)");
    const swap = () => {
      const t = v.currentTime;
      v.load();
      whenMetadata(v)
        .then(() => {
          v.currentTime = t;
          ScrollTrigger.refresh();
        })
        .catch(() => {});
    };
    portrait.addEventListener("change", swap);

    return () => {
      alive = false;
      v.removeEventListener("progress", onProgress);
      v.removeEventListener("canplaythrough", onProgress);
      portrait.removeEventListener("change", swap);
    };
  }, [playable, failed]);

  const media = (
    <>
      <picture>
        {film.mobilePoster && has(film.mobilePoster) && (
          <source media="(max-aspect-ratio: 4/5)" srcSet={film.mobilePoster} />
        )}
        <img src={film.poster} alt="" fetchPriority="high" className="absolute inset-0 size-full object-cover" />
      </picture>
      {playable && !failed && (
        <video
          ref={video}
          className="absolute inset-0 size-full object-cover"
          muted
          playsInline
          loop={reduced}
          preload="metadata"
          disablePictureInPicture
          tabIndex={-1}
          aria-hidden
        >
          {film.mobileSrc && has(film.mobileSrc) && (
            <source src={film.mobileSrc} type="video/mp4" media="(max-aspect-ratio: 4/5)" />
          )}
          <source src={film.src} type="video/mp4" />
        </video>
      )}
    </>
  );

  if (reduced) return <StillFilm media={media} video={video} />;
  return <ScrubbedFilm media={media} video={video} duration={duration} playable={playable && !failed} />;
}

function ScrubbedFilm({
  media,
  video,
  duration,
  playable,
}: {
  media: React.ReactNode;
  video: React.RefObject<HTMLVideoElement | null>;
  duration: number;
  playable: boolean;
}) {
  const section = useRef<HTMLElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const { revealed } = useFilmStore();

  // Build the scroll timeline once the clip's length is known.
  useGSAP(
    () => {
      const el = section.current;
      if (!el || !pin.current || (playable && !duration)) return;
      const seconds = duration || 5;
      const scrubber = playable && video.current ? createScrubber(video.current) : null;

      const setTravel = () => {
        const screens = gsap.utils.clamp(3.4, 7, (seconds * pace()) / FILM_END);
        el.style.setProperty("--film-travel", `${Math.round(screens * 100)}svh`);
      };
      setTravel();
      ScrollTrigger.addEventListener("refreshInit", setTravel);

      const q = gsap.utils.selector(el);
      const barsY = q("[data-hud-bar='y']");
      const barsX = q("[data-hud-bar='x']");
      const playhead = { t: 0 };

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: "bottom bottom",
          pin: pin.current,
          pinSpacing: false,
          anticipatePin: 1,
          scrub: 0.9,
          invalidateOnRefresh: true,
        },
        onUpdate() {
          const p = tl.progress();
          gsap.set(barsY, { scaleY: p });
          gsap.set(barsX, { scaleX: p });
        },
      });

      // The playhead: scroll position maps linearly onto film time.
      tl.to(
        playhead,
        {
          t: 1,
          duration: FILM_END,
          onUpdate() {
            scrubber?.seek(playhead.t * seconds);
          },
        },
        0,
      );

      // 01 The new standard: on screen at rest, leaves as the car sets off.
      tl.fromTo(q("[data-cue]"), { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.03, immediateRender: false }, 0.01);
      tl.fromTo(q("[data-ch='1']"), { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -40, duration: 0.07, immediateRender: false }, 0.1);

      // 02 Power, presence, precision: one word at a time.
      tl.fromTo(q("[data-ch='2'] [data-word]"), { autoAlpha: 0, y: 34 }, { autoAlpha: 1, y: 0, duration: 0.05, stagger: 0.045 }, 0.19);
      tl.to(q("[data-ch='2']"), { autoAlpha: 0, y: -30, duration: 0.05 }, 0.41);

      // 03 Crafted without compromise.
      tl.fromTo(q("[data-ch='3'] [data-line]"), { yPercent: 110 }, { yPercent: 0, duration: 0.06, stagger: 0.02 }, 0.47);
      tl.to(q("[data-ch='3']"), { autoAlpha: 0, y: -30, duration: 0.05 }, 0.64);

      // 04 The art of arrival, as the car arrives. Then the way on.
      tl.fromTo(q("[data-ch='4'] [data-line]"), { yPercent: 110 }, { yPercent: 0, duration: 0.07, stagger: 0.025 }, 0.71);
      tl.fromTo(q("[data-ch='cta']"), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.05 }, 0.8);

      // Hold the final frame, then let it settle back and dim (never to black):
      // the collection index slides over it from below.
      tl.to(q("[data-film-window]"), { scale: 0.965, duration: 0.07 }, 0.93);
      tl.to(q("[data-film-shade]"), { opacity: 0.45, duration: 0.07 }, 0.93);
      tl.to(q("[data-ch='cta'], [data-hud]"), { autoAlpha: 0, duration: 0.05 }, 0.945);
      tl.set({}, {}, 1);

      // Chapters are hidden by CSS until the timeline owns them.
      el.dataset.armed = "";
      ScrollTrigger.refresh();

      return () => {
        ScrollTrigger.removeEventListener("refreshInit", setTravel);
        scrubber?.destroy();
        delete el.dataset.armed;
      };
    },
    { dependencies: [duration, playable], scope: section, revertOnUpdate: true },
  );

  // After the loader lifts: the first words rise, the instruments fade up.
  useGSAP(
    () => {
      if (!revealed) return;
      gsap.from("[data-intro]", { yPercent: 110, duration: 1.8, ease: "expo.out", delay: 0.15 });
      gsap.from("[data-intro-fade]", { autoAlpha: 0, duration: 1.4, ease: "power2.out", delay: 0.9, stagger: 0.12 });
    },
    { dependencies: [revealed], scope: section },
  );

  return (
    <section ref={section} id="top" aria-labelledby="film-title" className="film relative h-[calc(100svh+var(--film-travel))] bg-obsidian">
      <div ref={pin} className="relative h-[100lvh] w-full overflow-hidden">
        <div data-film-window className="film-window overflow-hidden">
          {media}
          {/* Grade: lift the sky for the navigation, ground the type at the foot. */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-0 top-0 h-[30%] bg-gradient-to-b from-obsidian/65 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-obsidian/90 via-obsidian/40 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.5)_100%)]" />
          </div>
          <div data-film-shade aria-hidden className="absolute inset-0 bg-obsidian opacity-0" />
        </div>

        {/* 01 */}
        <div data-ch="1" className="absolute inset-x-0 bottom-[calc(max(6.5rem,17svh)+var(--film-gap))] px-page text-center">
          <p className="type-statement overflow-hidden pb-[0.08em] text-[clamp(2.3rem,6vw,6.25rem)]">
            <span data-intro className="block">
              {C.standard}
            </span>
          </p>
        </div>

        {/* 02 */}
        <div
          data-ch="2"
          className="absolute inset-x-0 bottom-[calc(max(6.5rem,19svh)+var(--film-gap))] flex flex-col items-center gap-4 px-page sm:flex-row sm:justify-between sm:gap-0"
        >
          {C.triad.map((word) => (
            <span
              key={word}
              data-word
              className="type-brand pl-[0.3em] text-[clamp(1.2rem,2.5vw,2.6rem)] font-light tracking-[0.3em]"
            >
              {word}
            </span>
          ))}
        </div>

        {/* 03 */}
        <div data-ch="3" className="absolute bottom-[calc(max(5.5rem,14svh)+var(--film-gap))] left-0 px-page">
          <p className="type-statement text-[clamp(2.4rem,5.8vw,6.25rem)]">
            {["Crafted without", "compromise."].map((line) => (
              <span key={line} className="block overflow-hidden pb-[0.08em]">
                <span data-line className="block">
                  {line}
                </span>
              </span>
            ))}
          </p>
        </div>

        {/* 04 */}
        <div className="absolute inset-x-0 bottom-[calc(max(5rem,11svh)+var(--film-gap))] grid gap-y-8 px-page lg:grid-cols-12 lg:items-end lg:gap-x-8">
          <h1
            id="film-title"
            data-ch="4"
            className="type-brand text-[clamp(2.3rem,7.6vw,8.75rem)] font-[250] leading-[0.93] tracking-[0.01em] lg:col-span-8"
          >
            {C.title.map((line) => (
              <span key={line} className="block overflow-hidden pb-[0.06em]">
                <span data-line className="block">
                  {line}
                </span>
              </span>
            ))}
          </h1>
          <div data-ch="cta" className="max-w-[22rem] lg:col-span-4 lg:justify-self-end lg:pb-[0.5vw]">
            <p className="type-lede text-ivory/80">{C.cta.lede}</p>
            <div className="mt-6">
              <LineCta href={C.cta.href} label={C.cta.label} arrow="always" />
            </div>
          </div>
        </div>

        <div
          data-cue
          className="absolute inset-x-0 bottom-[calc(1.5rem+var(--film-gap))] flex flex-col items-center gap-3 lg:bottom-[calc(2rem+var(--film-gap))]"
          aria-hidden
        >
          <span data-intro-fade className="type-micro text-[0.625rem] text-ivory/60">
            Scroll
          </span>
          <span data-intro-fade className="scroll-cue relative block h-10 w-px overflow-hidden bg-ivory/20" />
        </div>

        <FilmHud />
      </div>
    </section>
  );
}

/** Reduced motion: a still frame with every line of copy, and the film on request. */
function StillFilm({ media, video }: { media: React.ReactNode; video: React.RefObject<HTMLVideoElement | null> }) {
  const [playing, setPlaying] = useState(false);
  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  return (
    <section id="top" aria-labelledby="film-title" className="relative h-[100svh] min-h-[36rem] overflow-hidden bg-obsidian">
      <div className="film-window overflow-hidden">
        {media}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-obsidian/90 via-obsidian/35 to-obsidian/50" />
      </div>
      <div className="absolute inset-x-0 bottom-[max(4.5rem,10svh)] grid gap-y-6 px-page lg:grid-cols-12 lg:items-end lg:gap-x-8">
        <div className="lg:col-span-8">
          <p className="type-statement text-[clamp(1.6rem,3vw,2.75rem)] text-ivory/80">{C.standard}</p>
          <h1 id="film-title" className="type-brand mt-4 text-[clamp(2.3rem,7.6vw,8.75rem)] font-[250] leading-[0.93]">
            {C.title.join(" ")}
          </h1>
        </div>
        <div className="max-w-[22rem] lg:col-span-4 lg:justify-self-end">
          <p className="type-lede text-ivory/80">{C.cta.lede}</p>
          <div className="mt-6 flex flex-wrap items-center gap-8">
            <LineCta href={C.cta.href} label={C.cta.label} arrow="always" />
            <button type="button" onClick={toggle} className="type-micro flex min-h-11 items-center gap-2 text-ivory/70">
              {playing ? <Pause aria-hidden className="size-3" strokeWidth={1.25} /> : <Play aria-hidden className="size-3" strokeWidth={1.25} />}
              {playing ? "Pause film" : "Play film"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
