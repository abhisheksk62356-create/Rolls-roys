import { library, type ImageAsset } from "./media";

export const navigation = [
  { label: "Models", href: "#models" },
  { label: "Craft", href: "#craft" },
  { label: "Experience", href: "#ghost" },
  { label: "Heritage", href: "#heritage" },
] as const;

export const menu = [
  { label: "Models", href: "#models" },
  { label: "Phantom", href: "#phantom" },
  { label: "Ghost", href: "#ghost" },
  { label: "Cullinan", href: "#cullinan" },
  { label: "Spectre", href: "#spectre" },
  { label: "Black Badge", href: "#black-badge" },
  { label: "Craft", href: "#craft" },
  { label: "Heritage", href: "#heritage" },
  { label: "Gallery", href: "#gallery" },
] as const;

export type Spec = { label: string; value: string };

export type Model = {
  id: string;
  name: string;
  kind: string;
  line: string;
  href: string;
  image: ImageAsset;
  specs: Spec[];
  /** Further versions of this model, shown with it rather than as models of their own. */
  variants?: { name: string; note: string }[];
};

/** The collection, in the order the page tells it. */
export const models: Model[] = [
  {
    id: "phantom",
    name: "Phantom",
    kind: "Flagship saloon",
    line: "Presence, redefined.",
    href: "#phantom",
    image: library.phantom.hero,
    specs: [
      { label: "Engine", value: "6.75-litre V12" },
      { label: "Power", value: "563 PS" },
      { label: "0–100 km/h", value: "5.4 s" },
    ],
    variants: [{ name: "Phantom Extended", note: "220 mm more, all of it in the rear" }],
  },
  {
    id: "ghost",
    name: "Ghost",
    kind: "Saloon",
    line: "Effortless by design.",
    href: "#ghost",
    image: library.ghost.dark,
    specs: [
      { label: "Engine", value: "6.75-litre V12" },
      { label: "Power", value: "571 PS" },
      { label: "0–100 km/h", value: "4.8 s" },
    ],
    variants: [{ name: "Ghost Extended", note: "170 mm more for those in the rear" }],
  },
  {
    id: "cullinan",
    name: "Cullinan",
    kind: "SUV",
    line: "Effortless, everywhere.",
    href: "#cullinan",
    image: library.cullinan.hero,
    specs: [
      { label: "Engine", value: "6.75-litre V12" },
      { label: "Power", value: "571 PS" },
      { label: "Drive", value: "All-wheel" },
    ],
  },
  {
    id: "spectre",
    name: "Spectre",
    kind: "Electric coupé",
    line: "Electric. Extraordinary.",
    href: "#spectre",
    image: library.spectre.hero,
    specs: [
      { label: "Drive", value: "Twin electric motors" },
      { label: "Power", value: "584 PS" },
      { label: "Range", value: "530 km" },
    ],
  },
  {
    id: "black-badge",
    name: "Black Badge",
    kind: "The darker expression",
    line: "Built beyond ordinary.",
    href: "#black-badge",
    image: library.blackBadge.hero,
    specs: [
      { label: "Models", value: "Ghost, Cullinan, Spectre" },
      { label: "Finish", value: "Darkened chrome" },
      { label: "Power", value: "Up to 659 PS" },
    ],
    variants: [
      { name: "Black Badge Ghost", note: "600 PS, darkened chrome" },
      { name: "Black Badge Cullinan", note: "600 PS, all-wheel drive" },
      { name: "Black Badge Spectre", note: "659 PS, twin electric motors" },
    ],
  },
  {
    id: "wraith",
    name: "Wraith",
    kind: "Grand tourer coupé",
    line: "Power, in a quieter voice.",
    href: "#heritage-wraith",
    image: library.heritage.wraith,
    specs: [
      { label: "Engine", value: "6.6-litre V12" },
      { label: "Power", value: "632 PS" },
      { label: "0–100 km/h", value: "4.6 s" },
    ],
  },
  {
    id: "dawn",
    name: "Dawn",
    kind: "Convertible",
    line: "The sky, invited in.",
    href: "#heritage-dawn",
    image: library.heritage.dawn,
    specs: [
      { label: "Engine", value: "6.6-litre V12" },
      { label: "Power", value: "571 PS" },
      { label: "Roof", value: "Opens in 22 s" },
    ],
  },
];

/** Film 01 overlay copy. Timing lives in FilmSequence, keyed to the same scroll timeline as the picture. */
export const arrivalChapters = {
  standard: "The new standard.",
  triad: ["Power", "Presence", "Precision"],
  craft: "Crafted without compromise.",
  title: ["The art of", "arrival."],
  cta: { lede: "Seven motor cars. One standard.", label: "Discover the collection", href: "#models" },
};

/** Replace with the atelier's real address before launch. */
export const contactEmail = "atelier@royce.example";

