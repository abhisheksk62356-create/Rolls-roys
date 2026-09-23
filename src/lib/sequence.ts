/**
 * Scroll-driven image sequence playback on a <canvas>.
 *
 * Frames are fetched coarse-to-fine (every 16th, then 8th, 4th, 2nd, all),
 * so scrubbing is usable almost immediately and sharpens as the rest
 * arrive. Frames are kept as compressed blobs; only a small window around
 * the playhead is decoded to bitmaps at any time, so memory stays bounded
 * no matter how long the sequence is.
 */

export type SequenceAsset = {
  /** Folder under /public, e.g. "/sequences/ghost-door". */
  dir: string;
  /** Number of frames: frame-0001 … frame-NNNN. */
  count: number;
  ext?: "webp" | "jpg" | "avif";
  /** Zero-padding of the frame number. */
  pad?: number;
};

export const frameUrl = (s: SequenceAsset, i: number) =>
  `${s.dir}/frame-${String(i + 1).padStart(s.pad ?? 4, "0")}.${s.ext ?? "webp"}`;

const DECODED_WINDOW = 24;
const CONCURRENCY = 4;

export function createSequencePlayer(canvas: HTMLCanvasElement, seq: SequenceAsset) {
  const ctx = canvas.getContext("2d", { alpha: false });
  const blobs: (Blob | undefined)[] = new Array(seq.count);
  const bitmaps = new Map<number, ImageBitmap>();
  const decoding = new Map<number, Promise<ImageBitmap | undefined>>();
  let target = 0;
  let drawn = -1;
  let raf = 0;
  let destroyed = false;
  const controller = new AbortController();

  // Coarse-to-fine load order.
  const order: number[] = [];
  const queued = new Set<number>();
  for (const step of [16, 8, 4, 2, 1]) {
    for (let i = 0; i < seq.count; i += step) {
      if (queued.has(i)) continue;
      queued.add(i);
      order.push(i);
    }
  }
  if (!queued.has(seq.count - 1)) order.splice(1, 0, seq.count - 1);

  let cursor = 0;
  const pump = async () => {
    while (!destroyed && cursor < order.length) {
      const i = order[cursor++];
      try {
        const res = await fetch(frameUrl(seq, i), { signal: controller.signal });
        if (res.ok) blobs[i] = await res.blob();
        if (Math.abs(i - target) < 2) schedule();
      } catch {
        return;
      }
    }
  };
  for (let n = 0; n < CONCURRENCY; n++) void pump();

  const nearestLoaded = (i: number) => {
    for (let d = 0; d < seq.count; d++) {
      if (blobs[i - d]) return i - d;
      if (blobs[i + d]) return i + d;
    }
    return -1;
  };

  const decode = (i: number) => {
    const existing = bitmaps.get(i);
    if (existing) return Promise.resolve(existing);
    let p = decoding.get(i);
    if (!p) {
      const blob = blobs[i];
      if (!blob) return Promise.resolve(undefined);
      p = createImageBitmap(blob)
        .then((bmp) => {
          decoding.delete(i);
          if (destroyed) return (bmp.close(), undefined);
          bitmaps.set(i, bmp);
          // Keep only a window of decoded frames around the playhead.
          if (bitmaps.size > DECODED_WINDOW) {
            const far = [...bitmaps.keys()].sort((a, b) => Math.abs(b - target) - Math.abs(a - target));
            for (const k of far.slice(0, bitmaps.size - DECODED_WINDOW)) {
              bitmaps.get(k)?.close();
              bitmaps.delete(k);
            }
          }
          return bmp;
        })
        .catch(() => {
          decoding.delete(i);
          return undefined;
        });
      decoding.set(i, p);
    }
    return p;
  };

  const paint = (bmp: ImageBitmap) => {
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    // object-fit: cover
    const scale = Math.max(w / bmp.width, h / bmp.height);
    const dw = bmp.width * scale;
    const dh = bmp.height * scale;
    ctx.drawImage(bmp, (w - dw) / 2, (h - dh) / 2, dw, dh);
  };

  const frame = () => {
    raf = 0;
    const i = nearestLoaded(target);
    if (i < 0 || i === drawn) return;
    const ready = bitmaps.get(i);
    if (ready) {
      paint(ready);
      drawn = i;
      return;
    }
    void decode(i).then((bmp) => {
      if (bmp && !destroyed && nearestLoaded(target) === i) {
        paint(bmp);
        drawn = i;
      }
    });
    // Warm the neighbours in the direction of travel.
    void decode(Math.min(seq.count - 1, i + 1));
    void decode(Math.max(0, i - 1));
  };

  const schedule = () => {
    if (!raf && !destroyed) raf = requestAnimationFrame(frame);
  };

  return {
    /** 0 to 1 along the sequence. */
    setProgress(p: number) {
      const next = Math.round(Math.min(1, Math.max(0, p)) * (seq.count - 1));
      if (next === target && drawn === next) return;
      target = next;
      schedule();
    },
    /** Force a repaint, e.g. after the canvas is resized. */
    redraw() {
      drawn = -1;
      schedule();
    },
    destroy() {
      destroyed = true;
      controller.abort();
      cancelAnimationFrame(raf);
      bitmaps.forEach((b) => b.close());
      bitmaps.clear();
    },
  };
}
