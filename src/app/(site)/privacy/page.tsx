import type { Metadata } from "next";
import Link from "next/link";
import { Container, PageHero, Section } from "@/components/layout";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: `How ${site.name} uses the details you send through this website.`,
  alternates: { canonical: "/privacy" },
};

/**
 * What the site actually does with personal data, and no more.
 *
 * Written from the code: the enquiry form is the only place the public gives
 * us anything, it is stored in Supabase and emailed to SKS through Resend, and
 * the site sets no analytics or advertising cookies. If any of that changes -
 * analytics switched on, a new form - this page has to change with it.
 */
export default function PrivacyPage() {
  return (
    <>
      <PageHero
        eyebrow="Privacy"
        title="Privacy notice"
        lead="What happens to the details you send us, in plain terms."
        reference="SKS / PRIVACY / SHEET 01"
      />

      <Section className="border-b-0">
        <Container className="max-w-3xl">
          <div className="space-y-10 text-navy-700 [&_h2]:text-xl [&_h2]:text-navy-900 [&_p]:mt-3 [&_li]:mt-1.5">
            <div>
              <h2>Who we are</h2>
              <p>
                {site.name} is a building firm working across{" "}
                {site.serviceArea}. We are responsible for the details you
                send us through this website. To ask about them, use the{" "}
                <Link href="/contact" className="underline">
                  enquiry form
                </Link>{" "}
                and say it is about your data.
              </p>
            </div>

            <div>
              <h2>What we collect</h2>
              <p>
                Only what you type into the enquiry form: your name, email
                address, and if you choose to give them, your phone number and
                postcode, plus the type of work and your message. If you used
                the project builder, the summary it produced is added to your
                message.
              </p>
              <p>
                The site does not use advertising or analytics cookies. If you
                sign in to a customer or staff account, a cookie keeps you
                signed in; it is used for nothing else.
              </p>
            </div>

            <div>
              <h2>What we use it for</h2>
              <p>
                To reply to your enquiry, arrange a visit if one is needed,
                quote for the work and, if you go ahead, run the job. We will
                not send you marketing, and we do not sell or share your details
                with anyone for theirs. Our lawful basis is taking steps at your
                request before entering into a contract.
              </p>
            </div>

            <div>
              <h2>Where it is kept</h2>
              <p>
                Enquiries are stored securely in our database, provided by
                Supabase, and a copy is emailed to us through Resend. The
                website is hosted by Vercel. These companies process the data
                on our behalf and only as we instruct.
              </p>
            </div>

            <div>
              <h2>How long we keep it</h2>
              <p>
                For as long as we need it to deal with your enquiry and any work
                that follows, and for as long afterwards as we are required to
                keep records for tax, warranty and legal reasons. Enquiries that
                do not lead to work are deleted once they are no longer needed.
              </p>
            </div>

            <div>
              <h2>Your rights</h2>
              <p>
                You can ask for a copy of the details we hold about you, ask us
                to correct them, or ask us to delete them. You can also object
                to how we use them. Get in touch through the{" "}
                <Link href="/contact" className="underline">
                  enquiry form
                </Link>{" "}
                and we will respond within one month.
              </p>
              <p>
                If you are unhappy with how we have handled your data, you can
                complain to the Information Commissioner&apos;s Office at{" "}
                <a
                  href="https://ico.org.uk"
                  className="underline"
                  rel="noopener noreferrer"
                >
                  ico.org.uk
                </a>
                .
              </p>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
