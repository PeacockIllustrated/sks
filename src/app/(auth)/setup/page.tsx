import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, Section } from "@/components/layout";
import { hasAdminSetup } from "@/lib/env";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = {
  title: "Set up an admin account",
  robots: { index: false, follow: false },
};

/** Never prerendered: whether this route exists at all is an environment
 *  question, and it has to be asked per request rather than at build time. */
export const dynamic = "force-dynamic";

/**
 * Bootstrap route for the first admin account.
 *
 * `notFound()` rather than a "disabled" message, and that is deliberate: a
 * page that says "setup is turned off" advertises that a route which creates
 * owners exists and invites someone to come back and look for the token. With
 * the variable unset there is nothing here at all.
 */
export default async function SetupPage() {
  if (!hasAdminSetup()) notFound();

  return (
    <Section>
      <Container>
        <div className="mx-auto max-w-md py-8">
          <p className="anno mb-4 text-gold-600">Bootstrap</p>
          <h1 className="text-3xl">Set up an admin account</h1>
          <p className="mt-3 text-navy-600">
            Creates an account with full access to everything. It needs the
            setup token from the deployment&rsquo;s environment.
          </p>

          <div className="mt-6 border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">Delete the token when you are done</p>
            <p className="mt-1">
              Removing <code>ADMIN_SETUP_TOKEN</code> from the deployment takes
              this page away entirely. That is the intended way to close it -
              no code change needed.
            </p>
          </div>

          <div className="mt-8 border border-navy-200 p-6">
            <SetupForm />
          </div>
        </div>
      </Container>
    </Section>
  );
}
