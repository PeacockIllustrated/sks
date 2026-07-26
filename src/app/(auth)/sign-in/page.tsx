import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container, Section } from "@/components/layout";
import { getSessionUser } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/env";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

/**
 * Never prerendered.
 *
 * This page asks two questions that are only answerable per request: is there
 * a session, and is this deployment configured. While `getSessionUser` threw
 * on an unconfigured deployment, Next had no choice but to treat the route as
 * dynamic, so that was true by accident. Making it fail softly removed the
 * throw and Next promptly began prerendering the page - baking the answer to
 * both questions into static HTML at build time, which is exactly wrong for a
 * sign-in page.
 */
export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const user = await getSessionUser();
  if (user) redirect(user.role === "CLIENT" ? "/" : "/admin");

  return (
    <Section>
      <Container>
        <div className="mx-auto max-w-md py-8">
          <h1 className="text-3xl">Sign in</h1>
          <p className="mt-3 text-navy-600">
            For SKS staff and clients. Website enquiries do not need an account.
          </p>
          {/* Say it before anyone types a password. A deployment with no
              database connection cannot sign anybody in, and letting someone
              retry their credentials against it wastes their time on the one
              thing that is not wrong. */}
          {!hasSupabaseConfig() ? (
            <div
              role="alert"
              className="mt-8 border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              <p className="font-semibold">Sign-in is unavailable here</p>
              <p className="mt-1">
                This deployment has no database connection configured, so no
                password will work. Set{" "}
                <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then redeploy -
                environment variables only reach a deployment when it is built.
              </p>
            </div>
          ) : null}

          <div className="mt-8 border border-navy-200 p-6">
            <SignInForm />
          </div>
        </div>
      </Container>
    </Section>
  );
}
