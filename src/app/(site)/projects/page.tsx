import type { Metadata } from "next";
import Link from "next/link";
import {
  Container,
  PageHero,
  Panel,
  Section,
  SectionHeading,
} from "@/components/layout";
import { Reveals } from "@/components/motion/reveals";
import { ButtonLink } from "@/components/ui/button";
import { divisions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Recent construction, joinery and roofing work by SKS Construction across the North East.",
  alternates: { canonical: "/projects" },
};

/**
 * Case studies are read from `sks_projects` where `is_published` is true, once
 * Phase 2 admin exists to publish them. Until there is real photography and
 * client sign-off, this page states that plainly rather than showing invented
 * or stock work.
 */
export default function ProjectsPage() {
  return (
    <>
      <PageHero
        eyebrow="Projects"
        title="Projects"
        lead="A record of what we have built, division by division."
        reference="SKS / PROJECTS / SHEET 01"
      />

      <Section className="border-b-0">
        <Container className="max-w-7xl">
          <Panel className="max-w-2xl">
            <h2 className="text-xl">Case studies coming shortly</h2>
            <p className="mt-3 text-navy-600">
              This page is built and waiting on photography and client sign-off.
              Once projects are published from the admin area they will appear
              here automatically, filtered by division.
            </p>
            <p className="mt-3 text-sm text-navy-500">
              Note for the build: this page reads published rows from
              <code className="mx-1 bg-navy-50 px-1 py-0.5 text-xs">sks_projects</code>
              once Phase 2 lands. No placeholder or stock imagery is used in the
              meantime, deliberately.
            </p>
            <div className="mt-6">
              <ButtonLink href="/contact">Ask about similar work</ButtonLink>
            </div>
          </Panel>

          <div className="mt-14">
            <SectionHeading
              eyebrow="Browse by division"
              title="What we can show you"
            />
            <div className="reveal mt-8 grid gap-6 md:grid-cols-3">
              {divisions.map((division) => (
                <Panel key={division.slug}>
                  <h3 className="text-lg">{division.name}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-navy-600">
                    {division.strapline}.
                  </p>
                  <Link
                    href={`/${division.slug}`}
                    className="mt-4 inline-block border-b-2 border-gold-400 pb-0.5 text-sm font-semibold transition-colors hover:text-gold-600"
                  >
                    See the service
                  </Link>
                </Panel>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      <Reveals />
    </>
  );
}
