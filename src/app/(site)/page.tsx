import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { HeroMorph } from "@/components/hero/hero-morph";
import { ProjectBuilder } from "@/components/builder/project-builder";
import { Marquee } from "@/components/marketing/marquee";
import { Process } from "@/components/marketing/process";
import { Programme } from "@/components/marketing/programme";
import { Reveals } from "@/components/motion/reveals";
import { Container, Section, SectionHeading } from "@/components/layout";
import { ButtonLink } from "@/components/ui/button";
import { divisions, proofPoints } from "@/lib/site";

export default function HomePage() {
  return (
    <>
      <HeroMorph />
      <Marquee />
      <Programme />

      {/* Divisions */}
      <Section id="divisions">
        <Container className="max-w-7xl">
          <SectionHeading
            eyebrow="What we do"
            title="Three divisions, one programme"
            lead="Each one stands on its own. Together they are the reason our dates hold."
          />

          <div className="mt-12 grid gap-px border border-navy-200 bg-navy-200 lg:grid-cols-3">
            {divisions.map((division, index) => (
              <div
                key={division.slug}
                className="reveal flex flex-col bg-white p-7"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-2xl">{division.name}</h3>
                  <span className="font-display text-4xl font-bold text-navy-100">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <p className="anno mt-2 text-gold-600">{division.strapline}</p>
                <p className="mt-5 text-sm leading-relaxed text-navy-600">
                  {division.intro}
                </p>
                <ul className="mt-6 space-y-2.5 border-t border-navy-200 pt-6">
                  {division.services.slice(0, 4).map((service) => (
                    <li
                      key={service}
                      className="flex items-start gap-2.5 text-sm text-navy-700"
                    >
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-gold-500"
                        aria-hidden="true"
                      />
                      {service}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-7">
                  <Link
                    href={`/${division.slug}`}
                    className="group inline-flex items-center gap-2 border-b-2 border-gold-400 pb-1 text-sm font-semibold text-navy-800 transition-colors hover:text-gold-600"
                  >
                    More on {division.name.toLowerCase()}
                    <ArrowRight
                      className="size-4 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <ProjectBuilder />

      {/* Proof points */}
      <Section tone="subtle">
        <Container className="max-w-7xl">
          <SectionHeading
            eyebrow="What that buys you"
            title="One firm is not a slogan, it is an operating model"
          />
          <div className="mt-12 grid gap-px border border-navy-200 bg-navy-200 md:grid-cols-3">
            {proofPoints.map((point, index) => (
              <div key={point.title} className="reveal bg-white p-7">
                <p className="anno text-navy-400">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-4 text-lg">{point.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-navy-600">
                  {point.body}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Process />

      {/* Call to action */}
      <Section tone="dark" className="border-b-0">
        <Container className="max-w-7xl">
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <SectionHeading
              tone="dark"
              title="Tell us about the job"
              lead="Send the details and we will come back with next steps, or tell you straight if it is not for us."
            />
            <ButtonLink href="/contact" size="lg" className="shrink-0">
              Request a quote
            </ButtonLink>
          </div>
        </Container>
      </Section>

      <Reveals />
    </>
  );
}
