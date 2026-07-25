import { Container, Section } from "@/components/layout";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Section>
      <Container>
        <div className="max-w-xl py-10">
          <p className="text-xs font-semibold tracking-[0.2em] text-gold-600 uppercase">
            404
          </p>
          <h1 className="mt-3 text-4xl">We cannot find that page</h1>
          <p className="mt-4 text-navy-600">
            It may have moved, or the link may be wrong. The divisions and
            contact details are all a click away.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/">Back to home</ButtonLink>
            <ButtonLink href="/contact" variant="outline">
              Contact us
            </ButtonLink>
          </div>
        </div>
      </Container>
    </Section>
  );
}
