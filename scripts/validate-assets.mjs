/**
 * Asset validation: every image the site references must exist, be large
 * enough for its role, and be reasonably sharp. Exits non-zero on failure.
 *
 *   npm run validate:assets
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const MIN_LONG_EDGE = { hero: 3200, feature: 2000, detail: 1400 };
const MIN_SHARPNESS = 30;

const src = fs.readFileSync(path.join(ROOT, "src", "lib", "media.ts"), "utf8");
const refs = [...src.matchAll(/(?:img|asset)\(\s*"([^"]+)",\s*"(hero|feature|detail)"/g)].map((m) => ({ slot: m[1], role: m[2] }));
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

const failures = [];
const rows = [];

for (const { slot, role } of refs) {
  const rel = `/assets/rolls-royce/${slot}.webp`;
  const file = path.join(ROOT, "public", rel);
  if (!fs.existsSync(file)) {
    failures.push(`${rel}: missing`);
    continue;
  }
  // Read through Node's fs: some sandboxed filesystems hide paths from native loaders.
  const buf = fs.readFileSync(file);
  const meta = await sharp(buf).metadata();
  const long = Math.max(meta.width, meta.height);
  const kb = Math.round(fs.statSync(file).size / 1024);
  const sharpness = await peakSharpness(buf);
  const ok = long >= MIN_LONG_EDGE[role] && sharpness >= MIN_SHARPNESS && meta.format === "webp";
  if (long < MIN_LONG_EDGE[role]) failures.push(`${rel}: ${long}px is below the ${MIN_LONG_EDGE[role]}px ${role} minimum`);
  if (sharpness < MIN_SHARPNESS) failures.push(`${rel}: sharpness ${sharpness} is below ${MIN_SHARPNESS}`);
  rows.push({ slot, role, size: `${meta.width}x${meta.height}`, kb, sharpness, ok: ok ? "yes" : "NO" });
}

console.table(rows);
if (failures.length) {
  console.error(`\n${failures.length} problem(s):\n` + failures.join("\n"));
  process.exit(1);
}
console.log(`\nAll ${rows.length} images pass.`);
