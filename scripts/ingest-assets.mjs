/**
 * Asset ingest: downloads the selected development photographs at the size
 * their role needs, converts them to WebP, measures them, and writes
 * src/lib/asset-manifest.json plus IMAGE-CREDITS.md.
 *
 *   node scripts/ingest-assets.mjs [selection.json] [--force]
 *
 * selection.json (default scripts/asset-selection.json):
 *   [{ slot: "phantom/front", id, raw, role, credit, retouched? }]
 * role: hero / feature / detail (all fetched at up to 3840px wide; see FIT)
 * retouched: the file on disk was edited after download (for example a
 *   registration plate blanked); it is kept and only re-measured, unless
 *   --force is given, which downloads the original again.
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public", "assets", "rolls-royce");
/**
 * Fetch box per role (fit=max never enlarges). Portraits may run to the full
 * 3840 width, since full-screen crops draw them at the screen's width.
 */
const FIT = { hero: [3840, 5760], feature: [3840, 5760], detail: [3840, 5760] };

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
/** --slots a/b,c/d : download only these; every other file is kept and re-measured. */
const only = (args.find((a) => a.startsWith("--slots=")) ?? "").slice(8).split(",").filter(Boolean);
const selectionFile = args.find((a) => !a.startsWith("--")) ?? path.join(import.meta.dirname, "asset-selection.json");
const selection = JSON.parse(await fs.readFile(selectionFile, "utf8"));

async function peakSharpness(input) {
  // Sharpest 480x300 window on a 1920px copy: measures the subject in focus,
  // not the dark negative space around it.
  const base = await sharp(input).greyscale().resize({ width: 1920, withoutEnlargement: true }).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = base.info;
  let best = 0;
  for (let y = 0; y + 300 <= height; y += 150) {
    for (let x = 0; x + 480 <= width; x += 240) {
      const { data } = await sharp(base.data, { raw: { width, height, channels: 1 } })
        .extract({ left: x, top: y, width: 480, height: 300 })
        .convolve({ width: 3, height: 3, kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0] })
        .raw()
        .toBuffer({ resolveWithObject: true });
      let s = 0, q = 0;
      for (const v of data) { s += v; q += v * v; }
      const n = data.length;
      best = Math.max(best, q / n - (s / n) ** 2);
    }
  }
  return Math.round(best);
}

async function measure(item, webp) {
  const meta = await sharp(webp).metadata();
  // The tiny blurred preview Frame shows while the photograph loads (see scripts/blur-placeholders.mjs).
  const tiny = await sharp(webp).resize({ width: 16, height: 16, fit: "inside" }).webp({ quality: 50 }).toBuffer();
  return {
    blur: `data:image/webp;base64,${tiny.toString("base64")}`,
    slot: item.slot,
    src: `/assets/rolls-royce/${item.slot}.webp`,
    role: item.role,
    width: meta.width,
    height: meta.height,
    kb: Math.round(webp.length / 1024),
    sharpness: await peakSharpness(webp),
    credit: item.credit,
    source: `https://unsplash.com/photos/${item.id}`,
  };
}

async function one(item) {
  const file = path.join(OUT, `${item.slot}.webp`);
  if ((item.retouched && !FORCE) || (only.length && !only.includes(item.slot))) {
    const kept = await fs.readFile(file).catch(() => null);
    if (kept) return measure(item, kept);
  }
  const [w, h] = FIT[item.role];
  const url = `https://images.unsplash.com/photo-${item.raw}?w=${w}&h=${h}&fit=max&q=92&fm=jpg`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`${item.slot}: HTTP ${res.status}`);
  const jpg = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(path.dirname(file), { recursive: true });
  const webp = await sharp(jpg).webp({ quality: 84, effort: 5, smartSubsample: true }).toBuffer();
  await fs.writeFile(file, webp);
  return measure(item, webp);
}

const results = [];
const queue = [...selection];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const item = queue.shift();
      try {
        results.push(await one(item));
        process.stdout.write(".");
      } catch (e) {
        console.error("\nFAILED", item.slot, e.message);
      }
    }
  }),
);
results.sort((a, b) => a.slot.localeCompare(b.slot));

const manifest = Object.fromEntries(results.map((r) => [r.src, { width: r.width, height: r.height, role: r.role, kb: r.kb, sharpness: r.sharpness, blur: r.blur }]));
await fs.writeFile(path.join(ROOT, "src", "lib", "asset-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

const credits = [
  "# Image credits",
  "",
  "Development stand-ins from Unsplash, used under the Unsplash License (https://unsplash.com/license).",
  "They show Rolls-Royce vehicles and trademarks. Replace them with owned or officially licensed photography",
  "(for example Rolls-Royce Motor Cars PressClub originals, subject to its terms) before any public launch.",
  "",
  "| File | Photographer | Source |",
  "| --- | --- | --- |",
  ...results.map((r) => `| ${r.src} | ${r.credit} | ${r.source} |`),
  "",
];
await fs.writeFile(path.join(ROOT, "IMAGE-CREDITS.md"), credits.join("\n"));

console.log(`\n${results.length}/${selection.length} assets written`);
console.table(results.map(({ slot, role, width, height, kb, sharpness }) => ({ slot, role, width, height, kb, sharpness })));
