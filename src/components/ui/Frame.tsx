"use client";

import Image from "next/image";
import { useState } from "react";
import { DEFAULT_FALLBACK, type ImageAsset } from "@/lib/media";
import { cx } from "@/lib/utils";
import { useResolvedSrc } from "../providers/Providers";

type Props = {
  image: ImageAsset;
  /** Rendered width hints for responsive sources, e.g. "(min-width: 1024px) 50vw, 100vw". */
  sizes: string;
  /** Above-the-fold imagery: fetched immediately instead of lazily. */
  priority?: boolean;
  /** Fetch now although off screen (for example the next frame of a pinned sequence). */
  loading?: "lazy" | "eager";
  quality?: 75 | 85;
  fit?: "cover" | "contain";
  className?: string;
};

/**
 * Fills its positioned, sized parent with a photograph. If the file is not
 * in /public yet, or fails to load in the browser, a still from the arrival
 * film is shown instead (and the problem is logged in development): the
 * layout never collapses and no empty box is ever exposed.
 */
export function Frame({ image, sizes, priority, loading, quality = 85, fit = "cover", className }: Props) {
  const resolve = useResolvedSrc();
  const [failed, setFailed] = useState(false);
  const src = failed ? DEFAULT_FALLBACK : resolve(image);
  const onError = () => {
    if (failed) return;
    if (process.env.NODE_ENV !== "production") console.warn(`[media] ${image.src} failed to load; showing the fallback still.`);
    setFailed(true);
  };

  if (!src) {
    return <div role="img" aria-label={image.alt} className={cx("absolute inset-0 bg-charcoal", className)} />;
  }

  return (
    <Image
      src={src}
      alt={image.alt}
      fill
      sizes={sizes}
      quality={quality}
      preload={priority}
      loading={priority ? undefined : loading}
      // While the photograph loads, its own blurred preview holds the frame instead of black.
      placeholder={image.blur && !failed ? (image.blur as `data:image/${string}`) : "empty"}
      onError={onError}
      className={cx(fit === "cover" ? "object-cover" : "object-contain", className)}
      style={image.position && !failed ? { objectPosition: image.position } : undefined}
    />
  );
}
