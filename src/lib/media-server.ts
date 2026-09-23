import fs from "node:fs";
import path from "node:path";
import { allMediaPaths } from "./media";

/**
 * Checks /public for each configured media file. Runs on the server
 * (at build time for the static page, per request in dev), so the browser
 * never requests a file that is not there.
 */
export function getMediaAvailability(): Record<string, boolean> {
  const publicDir = path.join(process.cwd(), "public");
  return Object.fromEntries(
    allMediaPaths().map((src) => [src, fs.existsSync(path.join(publicDir, src))]),
  );
}
