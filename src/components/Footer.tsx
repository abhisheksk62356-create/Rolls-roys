import { contactEmail, models } from "@/lib/content";
import { LineCta } from "./ui/LineCta";

/**
 * Closing credits. The finale's last frame fades into it: the marque and the
 * one invitation that matters, then the collection rolled like film credits
 * (what each car is, and its name, which returns to its chapter), then a
 * last quiet line.
 */
export function Footer() {
  return (
    <footer
      id="contact"
      aria-labelledby="footer-title"
      className="px-page relative z-10 -mt-[26svh] bg-[linear-gradient(to_bottom,transparent_0,var(--color-charcoal)_26svh)] pb-10 pt-[calc(26svh+clamp(3rem,8vh,5.5rem))] text-ivory"
    >
      <div data-fade className="mx-auto flex max-w-[60rem] flex-col items-center text-center">
        {/* Tracking adds space after the last letter too; the matching indent keeps the word centred. */}
        <h2
          id="footer-title"
          className="type-brand pl-[0.46em] text-[clamp(1.5rem,3.6vw,2.75rem)] font-[200] tracking-[0.46em]"
        >
          Royce
        </h2>
        <p className="type-lede mt-8 max-w-[30ch] text-ivory/70">
          Private viewings are arranged by appointment at the atelier.
        </p>
        <div className="mt-9">
          <LineCta href={`mailto:${contactEmail}`} label="Contact the atelier" />
        </div>
      </div>

      <nav aria-label="The collection" className="mx-auto mt-[clamp(3.5rem,9vh,6rem)] max-w-[46rem]">
        <dl data-fade className="grid grid-cols-2 gap-x-8 gap-y-6 sm:gap-x-16">
          {models.map((m) => (
            <div key={m.id} className="contents">
              {/* A short rule in the gutter joins each role to its name, as in a credit roll. */}
              <dt className="type-caption relative self-baseline text-right text-pewter after:absolute after:-right-6 after:top-1/2 after:h-px after:w-4 after:bg-ivory/15 sm:after:-right-11 sm:after:w-6">
                {m.kind}
              </dt>
              <dd className="self-baseline">
                <a
                  href={m.href}
                  className="group relative inline-block py-0.5 text-[1.0625rem] font-light tracking-[0.02em] text-ivory/85 transition-colors duration-500 hover:text-ivory"
                >
                  {m.name}
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-ivory/50 transition-transform duration-700 ease-film group-hover:scale-x-100"
                  />
                </a>
                {m.variants && (
                  <span className="type-caption mt-1 block text-pewter">
                    {m.variants.map((v) => v.name).join(", ")}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </nav>

      <div className="type-caption mt-[clamp(3.5rem,9vh,6rem)] flex flex-col gap-3 border-t border-ivory/10 pt-8 text-pewter sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 Royce</p>
        <a href="#top" className="py-2 transition-colors duration-500 hover:text-ivory">
          Back to the beginning
        </a>
      </div>
    </footer>
  );
}
