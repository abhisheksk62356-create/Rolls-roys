import type { CSSProperties } from "react";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/** Typed helper for CSS custom properties in inline styles. */
export function vars(v: Record<`--${string}`, string | number>): CSSProperties {
  return v as CSSProperties;
}
