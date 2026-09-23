/**
 * Adds a tiny blurred preview (`blur`, a WebP data URL about 16px across) to
 * every entry in src/lib/asset-manifest.json. Frame shows it while the full
 * photograph loads, so a slow first load never shows an empty black frame.
 * Run it after replacing or adding a photograph:
 *
 *   node scripts/blur-placeholders.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const MANIFEST = path.join(ROOT, "src", "lib", "asset-manifest.json");

const manifest = JSON.parse(await fs.readFile(MANIFEST, "utf8"));
for (const [src, entry] of Object.entries(manifest)) {
  const file = await fs.readFile(path.join(ROOT, "public", src));
  const tiny = await sharp(file).resize({ width: 16, height: 16, fit: "inside" }).webp({ quality: 50 }).toBuffer();
  entry.blur = `data:image/webp;base64,${tiny.toString("base64")}`;
}
await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");

const sizes = Object.values(manifest).map((e) => e.blur.length);
console.log(`${sizes.length} previews, ${Math.min(...sizes)} to ${Math.max(...sizes)} bytes each, ${Math.round(sizes.reduce((a, b) => a + b, 0) / 1024)} KB in total`);
