import type { Metadata } from "next";
import {
  Container,
  PageHero,
  Panel,
  Section,
  SectionHeading,
} from "@/components/layout";
import { Reveals } from "@/components/motion/reveals";
import { ButtonLink } from "@/components/ui/button";
import { InteriorFeatures } from "@/components/marketing/interior-features";
import { interiorFeatures } from "@/lib/site";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Recent joinery, interior and extension work by SKS Construction across the North East.",
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
              Each project is shown here once it has been photographed and
              signed off by the client. In the meantime, ask us about work like
              yours and we will talk you through relevant jobs.
            </p>
            <div className="mt-6">
              <ButtonLink href="/contact">Ask about similar work</ButtonLink>
            </div>
          </Panel>

          <div className="mt-14">
            <SectionHeading
              eyebrow="Inside the house"
              title="The kind of work we can show you"
            />
            <InteriorFeatures items={interiorFeatures} />
          </div>
        </Container>
      </Section>

      <Reveals />
    </>
  );
}
