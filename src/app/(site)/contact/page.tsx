import type { Metadata } from "next";
import { Container, Section } from "@/components/layout";
import { EnquiryForm } from "./enquiry-form";
import { site, PLACEHOLDER } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Tell us about your job. Construction, joinery and roofing enquiries across the North East.",
};

export default function ContactPage() {
  const hasPhone = !site.phone.includes(PLACEHOLDER);
  const hasEmail = !site.email.includes(PLACEHOLDER);

  return (
    <>
      <section className="border-b border-navy-700 bg-navy-800 text-white">
        <Container>
          <div className="max-w-2xl py-16 sm:py-20">
            <h1 className="text-4xl sm:text-5xl">Tell us about the job</h1>
            <p className="mt-5 text-lg text-navy-100">
              Send the details and we will come back with next steps. If it is
              not work we should be doing, we will say so rather than waste your
              time.
            </p>
          </div>
        </Container>
      </section>

      <Section>
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <EnquiryForm />
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
