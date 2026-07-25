"use client";

import anime from "animejs";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/layout";
import { cn } from "@/lib/utils";
import {
  FINISHES,
  FORMS,
  FORM_ORDER,
  GLAZING,
  GLAZING_ORDER,
  ROOFS,
  ROOF_ORDER,
  type Selection,
} from "./config";

/* WebGL only. There is no reason to ship three.js to the server renderer, and
   `ssr: false` is only allowed from a client component, which is why the
   controls and the canvas are split across two files. */
const ProjectCanvas = dynamic(() => import("./project-canvas"), { ssr: false });

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

function OptionLabel({ index, children }: { index: string; children: string }) {
  return (
    <p className="anno mt-8 mb-3 flex items-center gap-3 text-navy-400 first:mt-0">
      <span className="text-gold-400">{index}</span>
      {children}
    </p>
  );
}

export function ProjectBuilder() {
  const [sel, setSel] = useState<Selection>({
    form: "single",
    roof: "pitched",
    glazing: "bifold",
    finish: FINISHES[0].hex,
    finishName: FINISHES[0].name,
  });

  /* The nudge that confirms a pick registered. Cheap, and it stops the canvas
     feeling unresponsive when a change is subtle. */
  const pulse = useCallback(() => {
    if (document.documentElement.classList.contains("reduced")) return;
    anime({
      targets: "#builder-stage",
      scale: [0.988, 1],
      duration: 320,
      easing: "easeOutCubic",
    });
  }, []);

  const form = FORMS[sel.form];
  const summary = `${form.label} - ${ROOFS[sel.roof].label} - ${GLAZING[sel.glazing].label} - ${sel.finishName}`;

  /* Carried into the enquiry so the first reply can be about the job rather
     than about establishing what the job is. */
  const enquiryHref = useMemo(
    () => `/contact?spec=${encodeURIComponent(summary)}`,
    [summary],
  );

  return (
    <section id="builder" className="border-y border-navy-700 bg-navy-900 py-16 sm:py-24">
      <Container className="max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <p className="anno mb-4 text-gold-300">Project builder</p>
            <h2 className="text-3xl text-white sm:text-4xl">
              Sketch the job before you speak to anyone
            </h2>
            <p className="mt-5 text-navy-200">
              Every option here crosses all three divisions. The shell is
              construction, the roof is roofing, the glazing is joinery, and on
              our jobs that is one programme and one quote rather than three
              firms blaming each other.
            </p>

            <OptionLabel index="01">Form</OptionLabel>
            <div className="flex flex-wrap gap-2">
              {FORM_ORDER.map((k) => (
                <Chip
                  key={k}
                  active={sel.form === k}
                  onClick={() => {
                    setSel((s) => ({ ...s, form: k }));
                    pulse();
                  }}
                >
                  {FORMS[k].label}
                </Chip>
              ))}
            </div>

            <OptionLabel index="02">Roof</OptionLabel>
            <div className="flex flex-wrap gap-2">
              {ROOF_ORDER.map((k) => (
                <Chip
                  key={k}
                  active={sel.roof === k}
                  onClick={() => {
                    setSel((s) => ({ ...s, roof: k }));
                    pulse();
                  }}
                >
                  {ROOFS[k].label}
                </Chip>
              ))}
            </div>

            <OptionLabel index="03">Walls</OptionLabel>
            <div className="flex flex-wrap gap-2">
              {FINISHES.map((f) => (
                <button
                  key={f.name}
                  type="button"
                  title={f.name}
                  aria-label={f.name}
                  aria-pressed={sel.finishName === f.name}
                  onClick={() =>
                    setSel((s) => ({
                      ...s,
                      finish: f.hex,
                      finishName: f.name,
                    }))
                  }
                  className={cn(
                    "size-11 border-2 transition-colors",
                    sel.finishName === f.name
                      ? "border-gold-400"
                      : "border-navy-600 hover:border-navy-400",
                  )}
                  style={{ backgroundColor: f.hex }}
                />
              ))}
            </div>

            <OptionLabel index="04">Glazing</OptionLabel>
            <div className="flex flex-wrap gap-2">
              {GLAZING_ORDER.map((k) => (
                <Chip
                  key={k}
                  active={sel.glazing === k}
                  onClick={() => {
                    setSel((s) => ({ ...s, glazing: k }));
                    pulse();
                  }}
                >
                  {GLAZING[k].label}
                </Chip>
              ))}
            </div>

            <div className="mt-9 border border-navy-700 bg-navy-950 p-5">
              <p className="anno text-navy-400">Specification</p>
              <p
                className="mt-2 font-display text-base font-bold text-white"
                aria-live="polite"
              >
                {summary}
              </p>
              <p className="mt-2 text-sm text-navy-300">{form.note}</p>
              <ButtonLink href={enquiryHref} className="mt-5">
                Send this with your enquiry
              </ButtonLink>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div
              id="builder-stage"
              className="trim-marks relative aspect-square w-full border border-navy-700 bg-navy-950 sm:aspect-[4/3] lg:aspect-square"
            >
              <div
                className="blueprint-grid absolute inset-0"
                aria-hidden="true"
              />
              <div className="absolute inset-0">
                <ProjectCanvas sel={sel} />
              </div>
            </div>
            <p className="anno mt-3 text-center text-navy-400">
              Drag to orbit - indicative massing, not a construction drawing
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
