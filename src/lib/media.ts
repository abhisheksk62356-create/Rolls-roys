import manifest from "./asset-manifest.json";
import type { SequenceAsset } from "./sequence";

/**
 * The visual library. Every photograph, film and image sequence on the
 * site is declared here, once.
 *
 * Photographs live in /public/assets/rolls-royce/<group>/<name>.webp.
 * To use approved originals (for example PressClub downloads), export them
 * as WebP at the listed role size and drop them in under the same name.
 * `npm run validate:assets` checks every file for size and sharpness.
 *
 *   hero     full-screen imagery    3840px long edge (3200 minimum)
 *   feature  large editorial frames 2560px long edge (2000 minimum)
 *   detail   inset details          2000px long edge (1400 minimum)
 */

export type Role = "hero" | "feature" | "detail";

export type ImageAsset = {
  src: string;
  alt: string;
  role: Role;
  width: number;
  height: number;
  /** CSS object-position: where the subject sits, so crops keep it. */
  position?: string;
  /** A tiny blurred preview (data URL), shown while the photograph loads. */
  blur?: string;
};

export type FilmAsset = {
  /** 16:9 master, encoded with a keyframe on every frame (see README). */
  src: string;
  /** Optional 4:5 cut for phones held upright. */
  mobileSrc?: string;
  poster: string;
  mobilePoster?: string;
};

type Measured = { width: number; height: number; blur?: string };
const measured = manifest as Record<string, Measured>;

/** Shown only if a photograph is missing on disk. Cut from the arrival film. */
export const DEFAULT_FALLBACK = "/images/film-final.jpg";

function asset(slot: string, role: Role, alt: string, position?: string): ImageAsset {
  const src = `/assets/rolls-royce/${slot}.webp`;
  const size = measured[src] ?? { width: 3840, height: 2560 };
  return { src, alt, role, width: size.width, height: size.height, position, blur: measured[src]?.blur };
}

export const library = {
  phantom: {
    hero: asset("phantom/hero", "hero", "Black Phantom, headlamps lit, in a cobbled courtyard", "72% 58%"),
    front: asset("phantom/front", "feature", "Phantom head-on at the end of a palm-lined drive", "50% 70%"),
    night: asset("phantom/night", "feature", "Black Phantom parked at night", "50% 72%"),
    grille: asset("phantom/grille", "hero", "Polished grille vanes, badge and mascot on a black bonnet", "50% 55%"),
    interior: asset("phantom/interior", "hero", "Wood-rimmed steering wheel and burr walnut dashboard", "42% 50%"),
    mascot: asset("phantom/mascot", "feature", "Mascot above the grille in low light", "50% 30%"),
  },
  ghost: {
    dark: asset("ghost/dark", "hero", "Ghost on a darkened stage under shafts of light", "64% 68%"),
    front: asset("ghost/front", "hero", "Black Ghost at dusk beneath a rising moon", "72% 70%"),
    side: asset("ghost/side", "hero", "Ghost in profile under stage light", "60% 66%"),
    door: asset("ghost/door", "feature", "Rolls-Royce badge set into the dark body side", "50% 45%"),
    fascia: asset("ghost/fascia", "feature", "The Ghost fascia, its name lit among points of light", "55% 45%"),
    console: asset("ghost/console", "feature", "Black lacquered centre console", "50% 50%"),
    clock: asset("ghost/clock", "hero", "The dashboard clock, signed Ghost", "44% 46%"),
    controller: asset("ghost/controller", "feature", "Rotary controller engraved with the mascot", "50% 55%"),
    headlight: asset("ghost/headlight", "hero", "Ghost headlamp, its daytime running light drawn in one line", "40% 50%"),
    final: asset("ghost/final", "hero", "Ghost on a starlit stage", "46% 62%"),
    finalPortrait: asset("ghost/final-portrait", "feature", "Ghost head-on beneath radiating stage light", "50% 62%"),
  },
  cullinan: {
    hero: asset("cullinan/hero", "hero", "Blue Cullinan against the Dubai skyline", "44% 62%"),
    profile: asset("cullinan/profile", "hero", "Blue Cullinan in profile beneath palms", "52% 70%"),
    rear: asset("cullinan/rear", "hero", "Cullinan from the rear three-quarter, city beyond", "60% 66%"),
    doors: asset("cullinan/doors", "feature", "Cullinan with its coach doors open", "50% 60%"),
    studio: asset("cullinan/studio", "feature", "Black Cullinan in a white studio, doors open", "40% 60%"),
  },
  spectre: {
    hero: asset("spectre/hero", "hero", "Spectre crossing a suspension bridge", "54% 64%"),
    wheel: asset("spectre/wheel", "hero", "Spectre wheel and body side in monochrome", "62% 60%"),
  },
  blackBadge: {
    hero: asset("black-badge/hero", "hero", "Black Badge Ghost head-on beneath spotlights", "50% 60%"),
    lamp: asset("black-badge/lamp", "hero", "Black Badge Cullinan headlamp set into matte black paint", "56% 58%"),
    mascot: asset("black-badge/mascot", "hero", "Dark chrome mascot on a carbon base", "50% 45%"),
    mascotDark: asset("black-badge/mascot-dark", "feature", "Black Badge mascot in darkened chrome", "50% 40%"),
    bokeh: asset("black-badge/bokeh", "feature", "Dark mascot against points of light", "50% 50%"),
  },
  craft: {
    grille: asset("craft/grille", "feature", "A classic radiator grille, hand-finished", "50% 50%"),
    spirit: asset("craft/spirit-of-ecstasy", "hero", "Gilded mascot on a black bonnet", "50% 45%"),
    spiritGold: asset("craft/spirit-gold", "feature", "Gilded mascot against dark teal", "50% 45%"),
    wood: asset("craft/wood", "feature", "A Rolls-Royce clock set into polished wood", "56% 50%"),
    leather: asset("craft/leather", "feature", "Quilted tan hide with double stitching", "50% 50%"),
    stitching: asset("craft/stitching", "feature", "A single line of stitching along dark hide", "50% 50%"),
    wheel: asset("craft/wheel", "feature", "Polished wheel against a black body", "55% 60%"),
    badge: asset("craft/badge", "feature", "Rear badge and chrome handle", "50% 45%"),
  },
  heritage: {
    silverCloud: asset("heritage/silver-cloud", "hero", "A classic Silver Cloud in monochrome", "55% 60%"),
    radiator: asset("heritage/radiator", "hero", "Vintage radiator, headlamps and mascot", "50% 50%"),
    chrome: asset("heritage/chrome", "hero", "Monochrome chrome radiator of a pre-war car", "55% 55%"),
    prewar: asset("heritage/prewar", "feature", "Pre-war coachwork, lamp and mascot", "40% 50%"),
    hall: asset("heritage/hall", "hero", "Vintage Rolls-Royce in a dark hall", "50% 55%"),
    cabin: asset("heritage/cabin", "feature", "Tan leather rear seats of a classic saloon", "45% 55%"),
    wraith: asset("heritage/wraith", "hero", "White Wraith fastback on a city street", "50% 60%"),
    dawn: asset("heritage/dawn", "hero", "Black Dawn convertible in profile at night", "55% 62%"),
    dawnMotion: asset("heritage/dawn-motion", "feature", "Dawn at speed, roof raised", "46% 60%"),
  },
  gallery: [
    asset("gallery/01", "hero", "A black saloon beneath converging stage light", "40% 60%"),
    asset("gallery/02", "hero", "Bonnet and mascot silhouetted at dusk", "50% 55%"),
    asset("gallery/03", "feature", "A classic grille and mascot in low light", "50% 50%"),
    asset("gallery/04", "hero", "A green classic, lamps and grille, warmly lit", "50% 55%"),
    asset("gallery/05", "feature", "Mascot and badge in monochrome", "50% 40%"),
    asset("gallery/06", "hero", "Mascot in chrome against soft light", "50% 45%"),
    asset("gallery/07", "feature", "Rolls-Royce badge on a dark body", "50% 50%"),
    asset("gallery/08", "feature", "Mascot on a black bonnet", "50% 40%"),
  ],
  finale: {
    hero: asset("finale/hero", "hero", "Black Badge Cullinan head-on beneath falling light", "50% 60%"),
  },
};

/**
 * Films. Each chapter scrubs its video when the file exists; otherwise it
 * plays its photographic shot list under the same scroll timeline.
 * Drop an all-intra MP4 at the path to switch a chapter to video.
 */
export const films = {
  arrival: {
    src: "/videos/rolls-royce.mp4",
    mobileSrc: "/videos/rolls-royce-mobile.mp4",
    poster: "/images/car-poster.jpg",
    mobilePoster: "/images/car-poster-mobile.jpg",
  },
  ghost: { src: "/videos/ghost.mp4", poster: library.ghost.dark.src },
  craftsmanship: { src: "/videos/craftsmanship.mp4", poster: library.craft.spirit.src },
  spectre: { src: "/videos/spectre.mp4", poster: library.spectre.hero.src },
  finale: { src: "/videos/finale.mp4", poster: library.finale.hero.src },
} satisfies Record<string, FilmAsset>;

/**
 * Image sequences (frame-0001.webp …). Used when the first and last frames
 * exist; a chapter falls back to its shot list otherwise.
 */
export const sequences = {
  ghostDoor: { dir: "/sequences/ghost-door", count: 60, ext: "webp" },
} satisfies Record<string, SequenceAsset>;

/** Every path above, used to check which files exist on disk. */
export function allMediaPaths(): string[] {
  const out = new Set<string>([DEFAULT_FALLBACK]);
  const visit = (v: unknown) => {
    if (!v || typeof v !== "object") return;
    if (Array.isArray(v)) return v.forEach(visit);
    for (const [key, value] of Object.entries(v)) {
      if (typeof value === "string" && value.startsWith("/") && /^(src|poster|mobileSrc|mobilePoster)$/.test(key)) out.add(value);
      else visit(value);
    }
  };
  visit(library);
  visit(films);
  for (const s of Object.values(sequences)) {
    const pad = (n: number) => String(n).padStart(4, "0");
    out.add(`${s.dir}/frame-${pad(1)}.${s.ext}`);
    out.add(`${s.dir}/frame-${pad(s.count)}.${s.ext}`);
  }
  return [...out];
}
