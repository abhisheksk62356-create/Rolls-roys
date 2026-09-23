/**
 * Drives a paused <video> to a target time without flooding the decoder.
 * Only one seek is in flight at a time; when it lands, the latest target
 * is taken up. Fast scrolling therefore skips intermediate frames instead
 * of queueing them, and the picture always converges on the scroll position.
 */
export function createScrubber(video: HTMLVideoElement, fps = 24) {
  let target = 0;
  let inFlight = false;
  let startedAt = 0;
  const tolerance = 0.5 / fps;

  const step = () => {
    const now = performance.now();
    // A seek that never reports back (rare) must not stall scrubbing.
    if (inFlight && now - startedAt < 400) return;
    if (Math.abs(video.currentTime - target) < tolerance) {
      inFlight = false;
      return;
    }
    inFlight = true;
    startedAt = now;
    video.currentTime = target;
  };

  const onSeeked = () => {
    inFlight = false;
    step();
  };
  video.addEventListener("seeked", onSeeked);

  return {
    /** Seek to `seconds`, clamped just inside the clip. */
    seek(seconds: number) {
      const d = video.duration;
      if (!Number.isFinite(d) || d <= 0) return;
      target = Math.min(Math.max(seconds, 0), d - 0.001);
      step();
    },
    get target() {
      return target;
    },
    destroy() {
      video.removeEventListener("seeked", onSeeked);
    },
  };
}

/** Resolves once the element knows its duration and dimensions. */
export function whenMetadata(video: HTMLVideoElement) {
  return new Promise<void>((resolve, reject) => {
    if (video.readyState >= 1 && Number.isFinite(video.duration)) return resolve();
    const done = () => {
      cleanup();
      resolve();
    };
    const fail = () => {
      cleanup();
      reject(new Error("video failed to load"));
    };
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", done);
      video.removeEventListener("error", fail);
    };
    video.addEventListener("loadedmetadata", done);
    video.addEventListener("error", fail);
  });
}

/** Share of the clip currently buffered, 0 to 1. */
export function bufferedShare(video: HTMLVideoElement) {
  const d = video.duration;
  if (!Number.isFinite(d) || d <= 0) return 0;
  let end = 0;
  for (let i = 0; i < video.buffered.length; i++) {
    if (video.buffered.start(i) <= 0.1) end = Math.max(end, video.buffered.end(i));
  }
  return Math.min(1, end / d);
}

/** Formats media time as a film timecode, HH:MM:SS:FF. */
export function timecode(seconds: number, fps = 24) {
  const total = Math.max(0, Math.floor(seconds * fps));
  const ff = total % fps;
  const s = Math.floor(total / fps);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(ff)}`;
}
