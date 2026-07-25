import type { Metadata } from "next";
import { Container, Panel, Section, SectionHeading } from "@/components/layout";
import { ButtonLink } from "@/components/ui/button";
import { divisions, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "SKS Construction is a multi-trade contractor in the North East, covering construction, joinery and roofing with directly employed teams.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-navy-700 bg-navy-800 text-white">
        <Container>
          <div className="max-w-3xl py-16 sm:py-20">
            <h1 className="text-4xl sm:text-5xl">One firm, three divisions</h1>
            <p className="mt-5 text-lg text-navy-100">
              Most building work needs more than one trade. Most building firms
              only do one. That gap is where budgets slip and timelines stop
              meaning anything.
            </p>
          </div>
        </Container>
      </section>

      <Section>
        <Container>
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <SectionHeading title="Why we set it up this way" />
              <div className="mt-6 space-y-5 text-navy-600">
                <p>
                  When a job needs construction, joinery and roofing, the usual
                  arrangement is three firms, three quotes and three sets of
                  assumptions that do not quite line up. Each one prices its own
                  part, none of them owns the join, and the customer ends up
                  co-ordinating trades they have never met.
                </p>
                <p>
                  We run all three as divisions of one company, with directly
                  employed teams. One survey, one quote, one programme, one
                  person accountable from first visit to handover. When the
                  roofer needs scaffold moved, that is an internal conversation
                  rather than a fortnight of emails.
                </p>
                <p>
                  It also means we are honest earlier. Because we see the whole
                  job rather than our slice of it, we can tell you at the survey
                  stage if the sequence you have in mind will not work, or if a
                  cheaper approach gets you the same result.
                </p>
              </div>
            </div>

            <aside className="lg:col-span-5">
              <Panel>
                <h2 className="text-lg">At a glance</h2>
                <dl className="mt-5 space-y-4 text-sm">
                  <div>
                    <dt className="font-semibold text-navy-800">Divisions</dt>
                    <dd className="mt-1 text-navy-600">
                      {divisions.map((division) => division.name).join(", ")}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-navy-800">Area covered</dt>
                    <dd className="mt-1 text-navy-600">{site.serviceArea}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-navy-800">Established</dt>
                    <dd className="mt-1 text-navy-600 italic">
                      To be confirmed
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-navy-800">
                      Accreditations
                    </dt>
                    <dd className="mt-1 text-navy-600 italic">
                      To be confirmed
                    </dd>
                  </div>
                </dl>
              </Panel>
            </aside>
          </div>
        </Container>
      </Section>

      <Section tone="subtle">
        <Container>
          <SectionHeading
            eyebrow="How we work"
            title="Things we will not do"
            lead="Worth saying plainly, because the opposite is common."
          />
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Quote without seeing it",
                body: "Anything beyond the simplest repair gets a site visit first. A number given over the phone is a number that changes later.",
              },
              {
                title: "Price the gaps out",
                body: "Access, making good and disposal are in the quote. Leaving them out makes a quote look cheaper and a final bill look worse.",
              },
              {
                title: "Take work we should not",
                body: "If a specialist would do it better, we will say so. It costs us a job and saves you a bad one.",
              },
            ].map((item) => (
              <Panel key={item.title}>
                <h3 className="text-lg">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-navy-600">
                  {item.body}
                </p>
              </Panel>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="dark">
        <Container>
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <SectionHeading
              tone="dark"
              title="Got a job in mind?"
              lead="Tell us what you need and we will come back with next steps."
            />
            <ButtonLink href="/contact" size="lg" className="shrink-0">
              Request a quote
            </ButtonLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
