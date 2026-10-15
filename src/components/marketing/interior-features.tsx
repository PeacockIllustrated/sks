import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FeatureVignette } from "@/components/marketing/division-vignette";
import { getDivision, type InteriorFeature } from "@/lib/site";

/**
 * The interior work, as a grid of drawn details.
 *
 * Each card carries the same drawing language as the hero's cutaway, so the
 * pieces it points at - the kitchen, the stair, the fitted unit - turn up again
 * on every page that talks about them, looking the same.
 */
export function InteriorFeatures({
  items,
  links = true,
}: {
  items: InteriorFeature[];
  links?: boolean;
}) {
  return (
    <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      {items.map((item) => {
        const division = getDivision(item.division);
        return (
          <li
            key={item.drawing}
            className="reveal flex flex-col border border-navy-200 bg-white"
          >
            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-navy-950">
              <div
                className="blueprint-grid absolute inset-0"
                aria-hidden="true"
              />
              <FeatureVignette
                id={item.drawing}
                className="relative h-[82%] w-[82%]"
              />
            </div>
            <div className="flex flex-1 flex-col p-4 sm:p-6">
              <h3 className="text-base sm:text-lg">{item.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-navy-600 sm:mt-2 sm:text-sm">
                {item.body}
              </p>
              {links && division ? (
                <Link
                  href={`/${division.slug}`}
                  className="group mt-auto inline-flex items-center gap-1.5 pt-4 text-xs font-semibold text-navy-800 transition-colors hover:text-gold-600 sm:text-sm"
                >
                  {division.name}
                  <ArrowRight
                    className="size-3.5 transition-transform group-hover:translate-x-1 sm:size-4"
                    aria-hidden="true"
                  />
                </Link>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
