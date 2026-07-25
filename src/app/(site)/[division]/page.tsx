import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { Container, Section, SectionHeading } from "@/components/layout";
import { ButtonLink } from "@/components/ui/button";
import { divisions, getDivision, site } from "@/lib/site";

type Params = { division: string };

export function generateStaticParams(): Params[] {
  return divisions.map((division) => ({ division: division.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { division: slug } = await params;
  const division = getDivision(slug);
  if (!division) return {};

  return {
    title: division.name,
    description: division.intro,
    alternates: { canonical: `/${division.slug}` },
  };
}

export default async function DivisionPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { division: slug } = await params;
  const division = getDivision(slug);
  if (!division) notFound();

  const others = divisions.filter((item) => item.slug !== division.slug);

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${division.name} - ${site.name}`,
    description: division.intro,
    areaServed: site.serviceArea,
    provider: { "@type": "LocalBusiness", name: site.name },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />

      <section className="border-b border-navy-700 bg-navy-800 text-white">
        <Container>
          <div className="max-w-3xl py-16 sm:py-24">
            <p className="mb-4 text-xs font-semibold tracking-[0.2em] text-gold-300 uppercase">
              Division
            </p>
            <h1 className="text-4xl sm:text-5xl">{division.name}</h1>
            <p className="mt-4 text-xl text-gold-200">{division.strapline}</p>
            <p className="mt-6 text-lg text-navy-100">{division.intro}</p>
            <div className="mt-8">
              <ButtonLink href="/contact" size="lg">
                Request a quote
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      <Section>
        <Container>
          <SectionHeading eyebrow="Services" title={`What ${division.name.toLowerCase()} covers`} />
          <ul className="mt-10 grid gap-px border border-navy-200 bg-navy-200 sm:grid-cols-2">
            {division.services.map((service) => (
              <li
                key={service}
                className="flex items-start gap-3 bg-white p-5 text-navy-700"
              >
                <Check className="mt-0.5 size-5 shrink-0 text-gold-500" aria-hidden="true" />
                <span>{service}</span>
              </li>
            ))}
          </ul>
          <p className="mt-8 max-w-2xl text-navy-600">
            Not listed? Ask anyway. If it is not something we do well, we will
            tell you rather than take it on.
          </p>
        </Container>
      </Section>

      <Section tone="subtle">
        <Container>
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <SectionHeading
                eyebrow="Under one roof"
                title="Why this sits alongside the other divisions"
              />
              <p className="mt-5 text-navy-600">{division.worksWellWith}</p>
            </div>
            <div className="lg:col-span-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {others.map((other) => (
                  <a
                    key={other.slug}
                    href={`/${other.slug}`}
                    className="border border-navy-200 bg-white p-5 hover:border-navy-800"
                  >
                    <span className="font-display block text-lg font-bold">
                      {other.name}
                    </span>
                    <span className="mt-2 block text-sm text-navy-600">
                      {other.strapline}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="dark">
        <Container>
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <SectionHeading
              tone="dark"
              title={`Thinking about ${division.name.toLowerCase()} work?`}
              lead="Send us the details and we will come back with next steps."
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
