/**
 * Quiet instrument for a film chapter: a rule that fills as the chapter
 * plays, written directly by the owning timeline (data-hud-bar), never
 * through React state. Desktop carries it on the right edge; phones and
 * tablets along the top, under the navigation.
 */
export function FilmHud() {
  return (
    <div data-hud aria-hidden className="pointer-events-none absolute inset-0 z-10">
      {/* Desktop: a vertical rule on the right edge. */}
      <div className="absolute inset-y-0 right-0 hidden flex-col items-end justify-between py-[calc(5rem+3vh)] pr-[clamp(1.25rem,4.5vw,5.5rem)] lg:flex">
        <span />
        <span data-intro-fade className="relative block h-[18vh] w-px overflow-hidden bg-ivory/15">
          <span data-hud-bar="y" className="absolute inset-0 origin-top bg-champagne" style={{ transform: "scaleY(0)" }} />
        </span>
        <span />
      </div>

      {/* Phones and tablets: a hairline along the top of the screen. */}
      <div data-intro-fade className="absolute inset-x-0 top-[4.75rem] flex items-center px-page lg:hidden">
        <span className="relative block h-px flex-1 overflow-hidden bg-ivory/15">
          <span data-hud-bar="x" className="absolute inset-0 origin-left bg-champagne" style={{ transform: "scaleX(0)" }} />
        </span>
      </div>
    </div>
  );
}
