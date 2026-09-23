/** Easing curves shared by Motion and CSS (see --ease-* in globals.css). */
export const ease = {
  /** Long, decelerating arrival. The default for reveals. */
  film: [0.19, 1, 0.22, 1] as const,
  /** Symmetric and weighty. For masks, wipes and overlays. */
  silk: [0.76, 0, 0.24, 1] as const,
};

/** Standard viewport trigger: fire once, slightly after the element enters. */
export const inView = { once: true, margin: "0px 0px -12% 0px" } as const;
