"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/layout";
import { cn } from "@/lib/utils";
import { HouseBlueprintSheet, type BlueprintView } from "./house-blueprint";
import {
  DIVISION_LABEL,
  HOUSE_TYPES,
  HOUSE_TYPE_ORDER,
  INSIDE_ORDER,
  OUTSIDE_ORDER,
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

/** A row of mutually exclusive options, sharing the width equally. Reads as
 *  one control rather than a cloud of chips, and every option is a full-height
 *  tap target on a phone. */
function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="mt-4 first:mt-0">
      <p className="mb-2 text-xs font-semibold text-navy-400">{label}</p>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid auto-cols-fr grid-flow-col gap-1 border border-navy-700 bg-navy-950 p-1"
      >
        {options.map((option) => {
          const active = option.key === value;
          return (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.key)}
              className={cn(
                "min-h-11 px-1 text-[13px] font-semibold whitespace-nowrap transition-colors sm:px-2 sm:text-sm",
                active
                  ? "bg-gold-400 text-navy-900"
                  : "text-navy-200 hover:bg-navy-800 hover:text-white",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
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
  /* Inside first: the interior is what the business leads with. Picking a
     piece of work turns the drawing to the side of the house it is on. */
  const [view, setView] = useState<BlueprintView>("inside");

  function toggle(key: ScopeKey) {
    if (!scope.has(key)) setView(SCOPE[key].inside ? "inside" : "outside");
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

  /* On a phone the summary card is a long scroll below the controls, so a bar
     along the bottom of the screen carries the count and the button while the
     builder is in view. It gets out of the way once the card itself shows. */
  const sectionRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [inSection, setInSection] = useState(false);
  const [cardShown, setCardShown] = useState(false);
  useEffect(() => {
    const section = sectionRef.current;
    const card = cardRef.current;
    if (!section || !card) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === section) setInSection(entry.isIntersecting);
        else setCardShown(entry.isIntersecting);
      });
    });
    io.observe(section);
    io.observe(card);
    return () => io.disconnect();
  }, []);
  const showBar = inSection && !cardShown;

  return (
    <section
      ref={sectionRef}
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
          <div className="sticky top-16 order-1 z-20 -mx-5 self-start border-b border-navy-700 bg-navy-900 px-5 pt-2 pb-3 sm:-mx-8 sm:border-b-0 sm:px-8 sm:pt-0 lg:top-24 lg:order-2 lg:col-span-7 lg:mx-0 lg:px-0 lg:pb-0">
            <div className="trim-marks relative aspect-[3/2] w-full border border-navy-700 bg-navy-950 sm:aspect-[5/4] lg:aspect-square">
              <div
                className="blueprint-grid absolute inset-0"
                aria-hidden="true"
              />
              <div className="absolute inset-0 overflow-hidden">
                <HouseBlueprintSheet house={house} scope={scope} view={view} />
              </div>

              <div
                role="group"
                aria-label="Choose a view"
                className="absolute top-2.5 left-2.5 z-10 inline-flex border border-navy-600 bg-navy-950 sm:top-4 sm:left-4"
              >
                {(
                  [
                    ["inside", "Inside"],
                    ["outside", "Outside"],
                  ] as const
                ).map(([key, name]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={view === key}
                    onClick={() => setView(key)}
                    className={cn(
                      "anno px-3 py-2 transition-colors",
                      view === key
                        ? "bg-gold-400 text-navy-900"
                        : "text-navy-200 hover:bg-navy-800",
                    )}
                  >
                    {name}
                  </button>
                ))}
              </div>

              {/* Top, not bottom: the title block owns the bottom of the sheet
                  now, and the drawing itself is thin wireframe up here. */}
              {scope.size === 0 ? (
                <p className="anno absolute inset-x-0 top-4 hidden text-center text-navy-400 sm:block">
                  Nothing selected yet
                </p>
              ) : null}

              {/* On a phone the sheet's title block is too small to read, so
                  it gives way to one line: which side of the house this is,
                  and how much of it is selected. */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 px-3 py-2.5 sm:hidden">
                <span className="anno text-navy-300">
                  {view === "inside" ? "Ground floor" : "Rear view"}
                </span>
                <span
                  className={cn(
                    "anno",
                    scope.size > 0 ? "text-gold-300" : "text-navy-400",
                  )}
                >
                  {scope.size === 0
                    ? "Pick what needs work"
                    : `${scope.size} ${scope.size === 1 ? "area" : "areas"} selected`}
                </span>
              </div>
            </div>
            <p className="anno mt-3 hidden text-center text-navy-400 sm:block">
              Viewed from the garden - indicative massing, not a construction
              drawing
            </p>
          </div>

          <div className="order-2 lg:order-1 lg:col-span-5">
            <p className="anno mb-4 text-gold-300">Project builder</p>
            <h2 className="text-[1.75rem] leading-tight text-white sm:text-4xl">
              Show us the house, then show us the job
            </h2>
            <p className="mt-4 text-navy-200 sm:mt-5">
              Set what your house is, then pick what needs doing, inside and
              out. The drawing opens up the ground floor for the interior work,
              shows the back of the house for the rest, and lights up every
              part the job touches.
            </p>

            <StepLabel index="01">Your house</StepLabel>
            <Segmented
              label="Type"
              options={HOUSE_TYPE_ORDER.map((k) => ({
                key: k,
                label: HOUSE_TYPES[k].label,
              }))}
              value={house.type}
              onChange={(k) => setHouse((h) => ({ ...h, type: k }))}
            />
            <Segmented
              label="Storeys"
              options={STOREY_ORDER.map((k) => ({
                key: k,
                label: STOREYS[k].label,
              }))}
              value={house.storeys}
              onChange={(k) => setHouse((h) => ({ ...h, storeys: k }))}
            />
            <Segmented
              label="Roof"
              options={ROOF_SHAPE_ORDER.map((k) => ({
                key: k,
                label: ROOF_SHAPES[k].label,
              }))}
              value={house.roof}
              onChange={(k) => setHouse((h) => ({ ...h, roof: k }))}
            />

            <StepLabel index="02">What needs work</StepLabel>
            {/* Two across on a phone, so each group fits under the drawing
                without a long scroll. One per row beside the drawing on a
                desktop, where there is the height for the detail. */}
            {(
              [
                ["Inside", INSIDE_ORDER],
                ["Outside", OUTSIDE_ORDER],
              ] as const
            ).map(([group, keys]) => (
              <div key={group} className="mt-5 first-of-type:mt-0">
                <p className="mb-2 text-xs font-semibold text-navy-400">
                  {group}
                </p>
                <ul className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                  {keys.map((k) => {
                const item = SCOPE[k];
                const active = scope.has(k);
                return (
                  <li
                    key={k}
                    className="[&:last-child:nth-child(odd)]:col-span-2 lg:[&:last-child:nth-child(odd)]:col-span-1"
                  >
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggle(k)}
                      className={cn(
                        "relative flex h-full w-full flex-col border p-3.5 text-left transition-colors sm:p-4",
                        active
                          ? "border-gold-400 bg-gold-400/10"
                          : "border-navy-700 bg-navy-950/60 hover:border-navy-500",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute top-3.5 right-3.5 flex size-5 items-center justify-center border transition-colors sm:top-4 sm:right-4",
                          active
                            ? "border-gold-400 bg-gold-400 text-navy-900"
                            : "border-navy-500",
                        )}
                      >
                        {active ? <Check className="size-3.5" /> : null}
                      </span>
                      <span
                        className={cn(
                          "block pr-7 font-display text-[15px] leading-snug font-bold transition-colors sm:text-base",
                          active ? "text-gold-300" : "text-white",
                        )}
                      >
                        {item.label}
                      </span>
                      <span className="mt-1.5 block text-xs leading-snug text-navy-300 sm:text-sm">
                        {item.detail}
                      </span>
                    </button>
                  </li>
                );
              })}
                </ul>
              </div>
            ))}

            <div
              ref={cardRef}
              className="mt-9 border border-navy-700 bg-navy-950 p-5"
            >
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

      <div
        inert={!showBar}
        aria-hidden={!showBar}
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t border-navy-700 bg-navy-950/95 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur transition-transform duration-300 lg:hidden",
          showBar ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex gap-1" aria-hidden="true">
              {SCOPE_ORDER.map((k) => (
                <span
                  key={k}
                  className={cn(
                    "h-1 w-5 transition-colors",
                    scope.has(k) ? "bg-gold-400" : "bg-navy-700",
                  )}
                />
              ))}
            </div>
            <p className="mt-1.5 truncate text-sm font-semibold text-white">
              {divisions.length > 0
                ? divisions.map((d) => DIVISION_LABEL[d]).join(", ")
                : "Nothing selected yet"}
            </p>
          </div>
          <ButtonLink href={enquiryHref} size="sm" className="shrink-0">
            Send enquiry
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
