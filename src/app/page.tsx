import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Container, Panel, Section, SectionHeading } from "@/components/layout";
import { ButtonLink } from "@/components/ui/button";
import { divisions, proofPoints, site } from "@/lib/site";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-navy-700 bg-navy-800 text-white">
        <Container>
          <div className="grid gap-12 py-20 sm:py-28 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <p className="mb-4 text-xs font-semibold tracking-[0.2em] text-gold-300 uppercase">
                {site.serviceArea}
              </p>
              <h1 className="text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
                Construction, joinery and roofing under one roof
              </h1>
              <p className="mt-6 max-w-xl text-lg text-navy-100">
                One firm, one point of contact, one quote. We handle the trades
                between us instead of handing you a chain of subcontractors to
                chase.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/contact" size="lg">
                  Request a quote
                </ButtonLink>
                <ButtonLink href="/projects" size="lg" variant="onDark">
                  See our work
                </ButtonLink>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="border border-navy-600">
                {divisions.map((division) => (
                  <Link
                    key={division.slug}
                    href={`/${division.slug}`}
                    className="group flex items-center justify-between gap-4 border-b border-navy-600 p-5 last:border-b-0 hover:bg-navy-700"
                  >
                    <span>
                      <span className="font-display block text-lg font-bold text-white">
                        {division.name}
                      </span>
                      <span className="mt-1 block text-sm text-navy-200">
                        {division.strapline}
                      </span>
                    </span>
                    <ArrowRight
                      className="size-5 shrink-0 text-gold-300"
                      aria-hidden="true"
                    />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Why one firm */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow="Why one firm"
            title="The gaps between trades are where jobs go wrong"
            lead="Most delays and disputes on multi-trade work happen in the handover between one contractor and the next. There is no handover here."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {proofPoints.map((point) => (
              <Panel key={point.title}>
                <h3 className="text-lg">{point.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-navy-600">
                  {point.body}
                </p>
              </Panel>
            ))}
          </div>
        </Container>
      </Section>

      {/* Divisions */}
      <Section tone="subtle">
        <Container>
          <SectionHeading
            eyebrow="What we do"
            title="Three divisions, one programme"
          />
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {divisions.map((division) => (
              <div
                key={division.slug}
                className="flex flex-col border border-navy-200 bg-white p-6"
              >
                <h3 className="text-xl">{division.name}</h3>
                <p className="mt-3 text-sm leading-relaxed text-navy-600">
                  {division.intro}
                </p>
                <ul className="mt-5 space-y-2">
                  {division.services.slice(0, 4).map((service) => (
                    <li
                      key={service}
                      className="flex items-start gap-2 text-sm text-navy-700"
                    >
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-gold-500"
                        aria-hidden="true"
                      />
                      {service}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 pt-2">
                  <Link
                    href={`/${division.slug}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-navy-800 underline underline-offset-4 hover:text-gold-600"
                  >
                    More on {division.name.toLowerCase()}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* How it works */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow="How it works"
            title="What to expect, start to finish"
          />
          <ol className="mt-12 grid gap-px border border-navy-200 bg-navy-200 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Talk it through",
                body: "Tell us what you need. We will say early if it is not work we should be doing.",
              },
              {
                title: "Site visit and survey",
                body: "We measure, check the constraints and agree the scope in writing.",
              },
              {
                title: "One written quote",
                body: "Every division priced together, with the programme and the assumptions stated.",
              },
              {
                title: "Build and hand over",
                body: "One point of contact throughout, and the certificates and paperwork at the end.",
              },
            ].map((step, index) => (
              <li key={step.title} className="bg-white p-6">
                <span className="font-display text-3xl font-bold text-gold-400">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 text-base">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-600">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* Call to action */}
      <Section tone="dark">
        <Container>
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
    </>
  );
}
