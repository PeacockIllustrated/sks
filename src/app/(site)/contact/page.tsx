import type { Metadata } from "next";
import { Container, PageHero, Section } from "@/components/layout";
import { EnquiryForm } from "./enquiry-form";
import { site, PLACEHOLDER } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Tell us about your job. Construction, joinery and roofing enquiries across the North East.",
};

/** The project builder links here carrying its specification. */
function specPrefill(spec: string | string[] | undefined): string | undefined {
  if (typeof spec !== "string") return undefined;
  const trimmed = spec.trim();
  if (!trimmed) return undefined;
  /* Bounded, because it arrives in a URL anyone can edit and it lands in a
     textarea the customer can still change before sending. */
  return `From the project builder: ${trimmed.slice(0, 200)}\n\n`;
}

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const hasPhone = !site.phone.includes(PLACEHOLDER);
  const hasEmail = !site.email.includes(PLACEHOLDER);
  const { spec } = await searchParams;

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Tell us about the job"
        lead="Send the details and we will come back with next steps. If it is not work we should be doing, we will say so rather than waste your time."
        reference="SKS / ENQUIRY / SHEET 01"
      />

      <Section className="border-b-0">
        <Container className="max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <EnquiryForm initialMessage={specPrefill(spec)} />
            </div>

            <aside className="lg:col-span-5">
              <div className="border border-navy-200 p-6">
                <h2 className="text-xl">Other ways to reach us</h2>
                <dl className="mt-5 space-y-4 text-sm">
                  <div>
                    <dt className="font-semibold text-navy-800">Phone</dt>
                    <dd className="mt-1 text-navy-600">
                      {hasPhone ? (
                        <a href={`tel:${site.phone.replace(/\s/g, "")}`}>
                          {site.phone}
                        </a>
                      ) : (
                        <span className="italic">To be confirmed</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-navy-800">Email</dt>
                    <dd className="mt-1 text-navy-600">
                      {hasEmail ? (
                        <a href={`mailto:${site.email}`}>{site.email}</a>
                      ) : (
                        <span className="italic">To be confirmed</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-navy-800">Area covered</dt>
                    <dd className="mt-1 text-navy-600">{site.serviceArea}</dd>
                  </div>
                </dl>
              </div>

              <div className="mt-6 border border-navy-200 bg-navy-50 p-6">
                <h2 className="text-lg">What happens next</h2>
                <ol className="mt-4 space-y-3 text-sm text-navy-600">
                  <li>We read the enquiry and check it is work we can do well.</li>
                  <li>We arrange a site visit if the job needs one.</li>
                  <li>
                    You get one written quote covering every division involved.
                  </li>
                </ol>
              </div>
            </aside>
          </div>
        </Container>
      </Section>
    </>
  );
}
