import type { Spec } from "@/lib/content";
import type { FilmAsset, ImageAsset } from "@/lib/media";
import type { SequenceAsset } from "@/lib/sequence";

/**
 * A cinematic chapter is a pinned stretch of scroll on which a shot list,
 * a video or an image sequence plays, with editorial beats keyed to the
 * same timeline. Positions (`at`, `until`) are fractions of the chapter's
 * scroll, 0 to 1.
 */

/** How a shot arrives over the one before it. */
export type Transition =
  | "cut" // instant
  | "dissolve" // crossfade
  | "wipe-left" // revealed from the right edge towards the left
  | "wipe-right"
  | "wipe-up"
  | "iris" // opens from a point, like light through a doorway
  | "split" // opens from the centre outwards, like doors parting
  | "from-dark" // the lights come up
  | "sweep"; // a band of light crosses the frame and leaves the new shot behind

export type Camera = {
  /** Scale at the start and end of the shot. Default [1.1, 1]. */
  scale?: [number, number];
  /** Horizontal travel in percent of the frame. */
  x?: [number, number];
  /** Vertical travel in percent of the frame. */
  y?: [number, number];
  /** Where the camera pushes towards, as CSS transform-origin. */
  origin?: string;
};

export type Shot = {
  image: ImageAsset;
  /** Alternative framing for phones held upright. */
  portrait?: ImageAsset;
  /** When the shot starts arriving. */
  at: number;
  /** When its camera move ends. */
  until: number;
  enter?: Transition;
  /** Length of the transition, in timeline units. Default 0.04. */
  span?: number;
  camera?: Camera;
  /** Point the iris opens from, e.g. "55% 45%". */
  irisAt?: string;
  /** Portrait photographs on wide screens: show the whole frame, edges feathered into black. */
  contain?: boolean;
};

export type BeatPlace =
  | "bottom-left"
  | "bottom-right"
  /** Beside a bottom-left block on wide screens; at the top on phones. */
  | "side"
  | "bottom-center"
  | "center"
  | "center-left"
  | "top-left"
  | "top-right";

export type Beat = {
  at: number;
  /** When it leaves; omit to stay to the end of the chapter. */
  until?: number;
  kind: "title" | "statement" | "caption" | "specs" | "cta" | "names";
  text?: string | string[];
  specs?: Spec[];
  cta?: { label: string; href: string };
  place: BeatPlace;
  /** Render this beat as the chapter's h2. */
  heading?: boolean;
};

export type ChapterConfig = {
  id: string;
  /** "02" in "Film 02". */
  number: string;
  /** Short title shown in the instrument panel. */
  label: string;
  /** Accessible title, used when no beat is the heading. */
  title: string;
  /** Screens of scroll the chapter plays over, per device class. */
  travel: { desktop: number; tablet: number; mobile: number };
  /** Scrubbed instead of the shot list when the file exists. */
  film?: FilmAsset;
  /** Played inside the shot list, over `sequenceSpan`, when its frames exist. */
  sequence?: SequenceAsset;
  sequenceSpan?: [number, number];
  shots: Shot[];
  beats: Beat[];
  /** Dim the frame over the last stretch so the next chapter can take over. Default true. */
  exitDim?: boolean;
};
