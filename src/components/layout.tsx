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
    light: "bg-white text-navy-800",
    subtle: "bg-navy-50 text-navy-800",
    dark: "bg-navy-800 text-navy-100",
  } as const;

  return (
    <section id={id} className={cn("py-16 sm:py-24", tones[tone], className)}>
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
            "mb-3 text-xs font-semibold tracking-[0.2em] uppercase",
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
            "mt-4 text-lg",
            tone === "dark" ? "text-navy-100" : "text-navy-600",
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
