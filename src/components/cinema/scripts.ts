import { models } from "@/lib/content";
import { films, library, sequences } from "@/lib/media";
import type { ChapterConfig } from "./types";

const { ghost, spectre, craft, finale } = library;
const spec = (id: string) => models.find((m) => m.id === id)?.specs ?? [];

/**
 * Film 02, Ghost. One continuous camera: out of the dark, round the car,
 * a detail of its lamp, in towards the coach door, through it into the
 * cabin, down to the details, and back out to the whole car. If
 * /sequences/ghost-door frames exist they play as the door opens (0.50 to 0.62).
 */
export const ghostChapter: ChapterConfig = {
  id: "ghost",
  number: "02",
  label: "Ghost",
  title: "Ghost",
  travel: { desktop: 6.4, tablet: 5.2, mobile: 4.4 },
  film: films.ghost,
  sequence: sequences.ghostDoor,
  sequenceSpan: [0.5, 0.62],
  shots: [
    // 01 Out of the dark.
    { image: ghost.dark, at: 0, until: 0.13, enter: "from-dark", span: 0.1, camera: { scale: [1.2, 1.02], origin: "64% 68%" } },
    // 02 Front three-quarter at dusk.
    { image: ghost.front, at: 0.12, until: 0.23, enter: "dissolve", span: 0.03, camera: { scale: [1.14, 1.02], x: [2, -2], origin: "72% 70%" } },
    // 03 Detail: the headlamp, its running light drawn in a single line; a band of light crosses it.
    { image: ghost.headlight, portrait: { ...ghost.headlight, position: "22% 55%" }, at: 0.22, until: 0.33, enter: "sweep", span: 0.05, camera: { scale: [1.3, 1.06], x: [3, -3], origin: "40% 50%" } },
    // 04 The camera closes on the rear coach door.
    { image: ghost.side, at: 0.32, until: 0.46, enter: "wipe-left", span: 0.05, camera: { scale: [1.02, 2.1], origin: "58% 60%" } },
    // 05 The door itself.
    { image: ghost.door, at: 0.45, until: 0.53, enter: "dissolve", span: 0.022, camera: { scale: [1.35, 1.06], origin: "50% 45%" } },
    // 06 The door opens: light spills from the cabin.
    { image: ghost.fascia, at: 0.52, until: 0.63, enter: "iris", span: 0.06, irisAt: "58% 46%", camera: { scale: [1.32, 1.04], origin: "55% 45%" } },
    // 07 The cabin.
    { image: ghost.console, at: 0.62, until: 0.72, enter: "wipe-up", span: 0.045, camera: { scale: [1.02, 1.28], origin: "50% 58%" } },
    // 08 Closer: the clock (upright screens crop to the clock itself, which sits right of centre).
    { image: ghost.clock, portrait: { ...ghost.clock, position: "76% 40%" }, at: 0.71, until: 0.8, enter: "wipe-left", span: 0.035, camera: { scale: [1.22, 1.02], origin: "44% 46%" } },
    // 09 The controls.
    { image: ghost.controller, at: 0.79, until: 0.87, enter: "iris", span: 0.04, irisAt: "50% 55%", camera: { scale: [1.02, 1.3], origin: "50% 52%" } },
    // 10 And back out to the whole car.
    { image: ghost.final, portrait: ghost.finalPortrait, at: 0.86, until: 1, enter: "dissolve", span: 0.045, camera: { scale: [1.34, 1], origin: "46% 62%" } },
  ],
  beats: [
    { at: 0.02, until: 0.11, kind: "title", text: ["Ghost"], place: "center", heading: true },
    { at: 0.06, until: 0.12, kind: "caption", text: "Effortless by design.", place: "bottom-center" },
    { at: 0.14, until: 0.215, kind: "statement", text: ["Modern, and entirely", "at ease in the city."], place: "bottom-left" },
    { at: 0.25, until: 0.315, kind: "caption", text: "Light, drawn in a single line.", place: "bottom-left" },
    { at: 0.36, until: 0.43, kind: "caption", text: "Coach doors, hinged at the rear, closed from the seat at the touch of a button.", place: "bottom-right" },
    { at: 0.465, until: 0.505, kind: "caption", text: "The door opens.", place: "bottom-left" },
    { at: 0.54, until: 0.61, kind: "statement", text: ["Inside, the name", "is written in light."], place: "bottom-left" },
    { at: 0.64, until: 0.695, kind: "caption", text: "Black lacquer, laid and polished by hand.", place: "bottom-right" },
    { at: 0.73, until: 0.775, kind: "caption", text: "The clock, signed Ghost.", place: "bottom-left" },
    { at: 0.81, until: 0.855, kind: "caption", text: "Every control cool to the touch, every click considered.", place: "bottom-right" },
    { at: 0.9, kind: "title", text: ["Ghost"], place: "bottom-left" },
    { at: 0.92, kind: "specs", specs: [...spec("ghost"), { label: "Ghost Extended", value: "+170 mm, all in the rear" }], place: "side" },
  ],
};

/**
 * Film 03, Spectre. Two photographs, three camera moves: close on its face
 * as it crosses the bridge, drawing back; the fender badge, opening to the
 * whole wheel; then wide, the car in its city, as the light sweeps across.
 */
export const spectreChapter: ChapterConfig = {
  id: "spectre",
  number: "03",
  label: "Spectre",
  title: "Spectre",
  travel: { desktop: 3.8, tablet: 3.3, mobile: 2.8 },
  film: films.spectre,
  shots: [
    { image: spectre.hero, at: 0, until: 0.36, enter: "from-dark", span: 0.1, camera: { scale: [2.3, 1.3], x: [-1.5, 1.5], origin: "61% 67%" } },
    { image: spectre.wheel, at: 0.35, until: 0.66, enter: "wipe-left", span: 0.05, camera: { scale: [1.9, 1.02], origin: "36% 46%" } },
    { image: spectre.hero, at: 0.65, until: 1, enter: "sweep", span: 0.06, camera: { scale: [1.14, 1], x: [2.5, -1.5], origin: "60% 66%" } },
  ],
  beats: [
    { at: 0.04, until: 0.2, kind: "title", text: ["Spectre"], place: "top-left", heading: true },
    { at: 0.09, until: 0.2, kind: "caption", text: "Electric. Extraordinary.", place: "bottom-left" },
    { at: 0.23, until: 0.33, kind: "statement", text: ["Silent from the", "very first metre."], place: "bottom-left" },
    { at: 0.39, until: 0.49, kind: "caption", text: "The badge on the flank, and the wheel beneath it: every surface one unbroken line.", place: "bottom-left" },
    // Over the dark door panel, clear of the bright spokes.
    { at: 0.52, until: 0.64, kind: "specs", specs: spec("spectre"), place: "bottom-left" },
    { at: 0.72, kind: "statement", text: ["Power, without", "a sound."], place: "top-left" },
    { at: 0.8, kind: "cta", cta: { label: "Arrange a viewing", href: "#contact" }, place: "bottom-left" },
  ],
};

/** Film 04, Craftsmanship. Macro push-ins, one material at a time. */
export const craftChapter: ChapterConfig = {
  id: "craft",
  number: "04",
  label: "Craftsmanship",
  title: "Craftsmanship",
  travel: { desktop: 5.2, tablet: 4.4, mobile: 3.8 },
  film: films.craftsmanship,
  shots: [
    { image: craft.spirit, at: 0, until: 0.16, enter: "from-dark", span: 0.1, camera: { scale: [1.22, 1.02], origin: "50% 45%" } },
    { image: craft.leather, at: 0.15, until: 0.3, enter: "wipe-up", span: 0.04, camera: { scale: [1.02, 1.22], origin: "50% 50%" } },
    { image: craft.stitching, at: 0.29, until: 0.43, enter: "wipe-left", span: 0.045, camera: { scale: [1.18, 1.04], y: [4, -4], origin: "50% 50%" } },
    { image: craft.wood, at: 0.42, until: 0.56, enter: "iris", span: 0.05, irisAt: "56% 50%", camera: { scale: [1.26, 1.03], origin: "56% 50%" } },
    { image: craft.wheel, at: 0.55, until: 0.68, enter: "wipe-right", span: 0.04, camera: { scale: [1.14, 1.0], origin: "55% 60%" } },
    { image: craft.grille, at: 0.67, until: 0.8, enter: "split", span: 0.045, camera: { scale: [1.2, 1.02], origin: "50% 50%" } },
    { image: craft.badge, at: 0.79, until: 0.9, enter: "dissolve", span: 0.025, camera: { scale: [1.02, 1.2], origin: "50% 45%" } },
    { image: craft.spiritGold, at: 0.89, until: 1, enter: "dissolve", span: 0.04, contain: true, camera: { scale: [1.18, 1], origin: "50% 45%" } },
  ],
  beats: [
    { at: 0.03, until: 0.13, kind: "statement", text: ["Every detail", "has a purpose."], place: "center-left", heading: true },
    { at: 0.18, until: 0.28, kind: "caption", text: "Hide chosen from hundreds, and quilted by eye rather than template.", place: "bottom-left" },
    { at: 0.32, until: 0.41, kind: "caption", text: "One line of stitching, placed by one hand.", place: "bottom-right" },
    { at: 0.45, until: 0.54, kind: "caption", text: "A clock set into polished wood, the grain matched from a single tree.", place: "bottom-left" },
    { at: 0.58, until: 0.66, kind: "caption", text: "Metal, machined and polished until it turns without a flaw.", place: "bottom-right" },
    { at: 0.7, until: 0.78, kind: "caption", text: "A grille finished by hand, vane by vane.", place: "bottom-left" },
    { at: 0.81, until: 0.88, kind: "caption", text: "The badge, which has never needed to raise its voice.", place: "bottom-right" },
    { at: 0.91, kind: "statement", text: ["Crafted", "by hand."], place: "center-left" },
  ],
};

/**
 * Film 05, the finale. The lights come up on the car as the camera pulls
 * back; the film's words return, and the way on.
 */
export const finaleChapter: ChapterConfig = {
  id: "finale",
  number: "05",
  label: "Arrival",
  title: "Arrive differently",
  travel: { desktop: 3.8, tablet: 3.3, mobile: 2.9 },
  film: films.finale,
  exitDim: false,
  shots: [{ image: finale.hero, at: 0, until: 0.86, enter: "from-dark", span: 0.34, camera: { scale: [1.38, 1], origin: "50% 58%" } }],
  beats: [
    { at: 0.14, until: 0.35, kind: "statement", text: ["The art of arrival."], place: "top-left" },
    { at: 0.38, until: 0.58, kind: "statement", text: ["Crafted without compromise."], place: "top-left" },
    { at: 0.6, until: 0.76, kind: "names", text: ["Phantom", "Ghost", "Cullinan", "Spectre"], place: "bottom-center" },
    { at: 0.78, kind: "title", text: ["Arrive", "differently."], place: "top-left", heading: true },
    { at: 0.86, kind: "cta", cta: { label: "Discover the collection", href: "#models" }, place: "bottom-left" },
  ],
};
