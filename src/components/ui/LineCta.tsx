import { ArrowRight } from "lucide-react";
import type { MouseEventHandler } from "react";
import { cx } from "@/lib/utils";

type Props = {
  href: string;
  label: string;
  /** "hover": the arrow slides in on hover. "always": visible, nudges on hover. */
  arrow?: "always" | "hover" | "none";
  /** Extend the click target over the nearest positioned ancestor. */
  stretched?: boolean;
  external?: boolean;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  className?: string;
};

/**
 * The house call to action: capitals over a hairline. A champagne rule
 * rests at a third of the width and draws out fully on hover or focus.
 */
export function LineCta({ href, label, arrow = "none", stretched, external, onClick, className }: Props) {
  return (
    <a
      href={href}
      onClick={onClick}
      data-cursor="link"
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className={cx(
        "group/cta type-micro inline-flex min-h-11 items-center gap-4 outline-none",
        stretched && "after:absolute after:inset-0 after:content-['']",
        className,
      )}
    >
      <span className="relative py-2 group-focus-visible/cta:outline group-focus-visible/cta:outline-1 group-focus-visible/cta:outline-offset-8 group-focus-visible/cta:outline-champagne">
        {label}
        <span aria-hidden className="absolute bottom-0 left-0 h-px w-full bg-current opacity-20" />
        <span
          aria-hidden
          className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-[0.3] bg-champagne transition-transform duration-[1100ms] ease-film group-hover/cta:scale-x-100 group-focus-visible/cta:scale-x-100"
        />
      </span>
      {arrow !== "none" && (
        <ArrowRight
          aria-hidden
          strokeWidth={1}
          className={cx(
            "size-4 shrink-0 transition-[translate,opacity] duration-[900ms] ease-film",
            arrow === "hover"
              ? "-translate-x-3 opacity-0 group-hover/cta:translate-x-0 group-hover/cta:opacity-100 group-focus-visible/cta:translate-x-0 group-focus-visible/cta:opacity-100"
              : "group-hover/cta:translate-x-1.5",
          )}
        />
      )}
    </a>
  );
}
