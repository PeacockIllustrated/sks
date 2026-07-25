import * as React from "react";
import { cn } from "@/lib/utils";

export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-5 sm:px-8", className)}>
      {children}
    </div>
  );
}

export function Section({
  className,
  tone = "light",
  children,
  id,
}: {
  className?: string;
  tone?: "light" | "subtle" | "dark";
  children: React.ReactNode;
  id?: string;
}) {
  const tones = {
    light: "bg-white text-navy-800 border-navy-200",
    subtle: "bg-navy-50 text-navy-800 border-navy-200",
    dark: "bg-navy-900 text-navy-100 border-navy-700",
  } as const;

  return (
    <section
      id={id}
      className={cn("border-b py-16 sm:py-24", tones[tone], className)}
    >
      {children}
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  tone = "light",
  className,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      {eyebrow ? (
        <p
          className={cn(
            "anno mb-4",
            tone === "dark" ? "text-gold-300" : "text-gold-600",
          )}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={cn(
          "text-3xl sm:text-4xl",
          tone === "dark" ? "text-white" : "text-navy-800",
        )}
      >
        {title}
      </h2>
      {lead ? (
        <p
          className={cn(
            "mt-5 text-lg",
            tone === "dark" ? "text-navy-200" : "text-navy-600",
          )}
        >
          {lead}
        </p>
      ) : null}
    </div>
  );
}

/** Bordered surface. No shadow, per house rules. */
export function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("border border-navy-200 bg-white p-6", className)}>
      {children}
    </div>
  );
}

/**
 * Masthead for every page that is not the home page.
 *
 * Same dark ground and squared paper as the hero, so an inner page reads as the
 * next sheet in the same set rather than as a different site. The drawing
 * reference in the corner is the small thing that sells it.
 */
export function PageHero({
  eyebrow,
  title,
  lead,
  reference,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  reference?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-navy-700 bg-navy-950 text-white">
      <div className="blueprint-grid absolute inset-0" aria-hidden="true" />
      <div
        className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/85 to-navy-950/40"
        aria-hidden="true"
      />

      <Container className="relative max-w-7xl">
        <div className="max-w-3xl py-16 sm:py-24">
          {eyebrow ? <p className="anno mb-5 text-gold-300">{eyebrow}</p> : null}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl">{title}</h1>
          {lead ? (
            <p className="mt-6 text-lg text-navy-200 sm:text-xl">{lead}</p>
          ) : null}
          {children}
        </div>
      </Container>

      {reference ? (
        <p className="anno absolute right-5 bottom-5 hidden text-navy-500 sm:block">
          {reference}
        </p>
      ) : null}
    </section>
  );
}
