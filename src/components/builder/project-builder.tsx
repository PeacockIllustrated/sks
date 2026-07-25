"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/layout";
import { cn } from "@/lib/utils";
import { HouseBlueprint } from "./house-blueprint";
import {
  DIVISION_LABEL,
  HOUSE_TYPES,
  HOUSE_TYPE_ORDER,
  ROOF_SHAPES,
  ROOF_SHAPE_ORDER,
  SCOPE,
  SCOPE_ORDER,
  STOREYS,
  STOREY_ORDER,
  divisionsFor,
  summarise,
  type House,
  type ScopeKey,
} from "./house-config";

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "border px-4 py-2.5 text-sm font-semibold transition-colors",
        active
          ? "border-gold-400 bg-gold-400 text-navy-900"
          : "border-navy-600 bg-transparent text-navy-100 hover:border-navy-400 hover:bg-navy-800",
      )}
    >
      {children}
    </button>
  );
}

function StepLabel({ index, children }: { index: string; children: string }) {
  return (
    <p className="anno mt-8 mb-3 flex items-center gap-3 text-navy-400 first:mt-0">
      <span className="text-gold-400">{index}</span>
      {children}
    </p>
  );
}

export function ProjectBuilder() {
  const [house, setHouse] = useState<House>({
    type: "semi",
    storeys: "two",
    roof: "gable",
  });
  const [scope, setScope] = useState<Set<ScopeKey>>(() => new Set<ScopeKey>());

  function toggle(key: ScopeKey) {
    setScope((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const divisions = useMemo(() => divisionsFor(scope), [scope]);
  const summary = useMemo(() => summarise(house, scope), [house, scope]);

  /* Carried into the enquiry, so the first reply can be about the job rather
     than about establishing what the job is. */
  const enquiryHref = `/contact?spec=${encodeURIComponent(summary)}`;

  return (
    <section
      id="builder"
      className="border-y border-navy-700 bg-navy-900 py-16 sm:py-24"
    >
      <Container className="max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-14">
          {/* The drawing leads on small screens, and sticks there.
              Putting it first is only half the job: the controls are taller
              than a phone, so without the sticky the drawing scrolls away and
              you tick a box without seeing what it did - which is the one
              thing this section exists to show. It sits under the site header,
              hence the top offsets. */}
          <div className="order-1 z-20 -mx-5 self-start bg-navy-900 px-5 pb-3 sm:-mx-8 sm:px-8 lg:order-2 lg:col-span-7 lg:mx-0 lg:px-0 lg:pb-0 sticky top-16 lg:top-24">
            <div className="trim-marks relative aspect-[5/4] w-full border border-navy-700 bg-navy-950 lg:aspect-square">
              <div
                className="blueprint-grid absolute inset-0"
                aria-hidden="true"
              />
              <div className="absolute inset-0">
                <HouseBlueprint house={house} scope={scope} />
              </div>

              {scope.size === 0 ? (
                <p className="anno absolute inset-x-0 bottom-4 text-center text-navy-400">
                  Nothing selected yet
                </p>
              ) : null}
            </div>
            <p className="anno mt-3 text-center text-navy-400">
              Indicative massing, not a construction drawing
            </p>
          </div>

          <div className="order-2 lg:order-1 lg:col-span-5">
            <p className="anno mb-4 text-gold-300">Project builder</p>
            <h2 className="text-3xl text-white sm:text-4xl">
              Show us the house, then show us the job
            </h2>
            <p className="mt-5 text-navy-200">
              Set what your house is, then pick what needs work. The drawing
              lights up the part of the building involved, which is usually more
              of it than people expect.
            </p>

            <StepLabel index="01">Your house</StepLabel>
            <div className="flex flex-wrap gap-2">
              {HOUSE_TYPE_ORDER.map((k) => (
                <Chip
                  key={k}
                  active={house.type === k}
                  onClick={() => setHouse((h) => ({ ...h, type: k }))}
                >
                  {HOUSE_TYPES[k].label}
                </Chip>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {STOREY_ORDER.map((k) => (
                <Chip
                  key={k}
                  active={house.storeys === k}
                  onClick={() => setHouse((h) => ({ ...h, storeys: k }))}
                >
                  {STOREYS[k].label}
                </Chip>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {ROOF_SHAPE_ORDER.map((k) => (
                <Chip
                  key={k}
                  active={house.roof === k}
                  onClick={() => setHouse((h) => ({ ...h, roof: k }))}
                >
                  {ROOF_SHAPES[k].label}
                </Chip>
              ))}
            </div>

            <StepLabel index="02">What needs work</StepLabel>
            <ul className="grid gap-px border border-navy-700 bg-navy-700">
              {SCOPE_ORDER.map((k) => {
                const item = SCOPE[k];
                const active = scope.has(k);
                return (
                  <li key={k}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggle(k)}
                      className={cn(
                        "flex w-full items-start gap-4 p-4 text-left transition-colors",
                        active
                          ? "bg-navy-950"
                          : "bg-navy-900 hover:bg-navy-950",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "mt-0.5 flex size-5 shrink-0 items-center justify-center border transition-colors",
                          active
                            ? "border-gold-400 bg-gold-400 text-navy-900"
                            : "border-navy-500",
                        )}
                      >
                        {active ? <Check className="size-3.5" /> : null}
                      </span>
                      <span>
                        <span
                          className={cn(
                            "block font-display text-base font-bold transition-colors",
                            active ? "text-gold-300" : "text-white",
                          )}
                        >
                          {item.label}
                        </span>
                        <span className="mt-1 block text-sm text-navy-300">
                          {item.detail}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-9 border border-navy-700 bg-navy-950 p-5">
              <div className="flex items-baseline justify-between gap-4">
                <p className="anno text-navy-400">Scope</p>
                <p className="anno text-gold-300">
                  {scope.size} of {SCOPE_ORDER.length} areas
                </p>
              </div>

              {/* How much of the house is involved, as a bar rather than a
                  number nobody reads. */}
              <div
                className="mt-3 flex gap-1"
                role="img"
                aria-label={`${scope.size} of ${SCOPE_ORDER.length} areas of the building selected`}
              >
                {SCOPE_ORDER.map((k) => (
                  <span
                    key={k}
                    className={cn(
                      "h-1.5 flex-1 transition-colors",
                      scope.has(k) ? "bg-gold-400" : "bg-navy-700",
                    )}
                  />
                ))}
              </div>

              <p
                className="mt-4 font-display text-base font-bold text-white"
                aria-live="polite"
              >
                {summary}
              </p>

              {divisions.length > 0 ? (
                <p className="mt-3 text-sm text-navy-300">
                  {divisions.length === 3 ? (
                    <>
                      That job crosses{" "}
                      <span className="text-gold-300">
                        all three of our divisions
                      </span>
                      . Elsewhere it would be three firms, three quotes and two
                      handovers to co-ordinate yourself.
                    </>
                  ) : (
                    <>
                      That job involves{" "}
                      <span className="text-gold-300">
                        {divisions.map((d) => DIVISION_LABEL[d]).join(" and ")}
                      </span>
                      , priced and programmed together.
                    </>
                  )}
                </p>
              ) : (
                <p className="mt-3 text-sm text-navy-300">
                  Pick at least one area above, or send the enquiry and we will
                  work it out at the survey.
                </p>
              )}

              <ButtonLink href={enquiryHref} className="mt-5">
                Send this with your enquiry
              </ButtonLink>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
