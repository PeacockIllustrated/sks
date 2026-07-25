import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container, Section } from "@/components/layout";
import { getSessionUser } from "@/lib/auth";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

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
          <div className="mt-8 border border-navy-200 p-6">
            <SignInForm />
          </div>
        </div>
      </Container>
    </Section>
  );
}
