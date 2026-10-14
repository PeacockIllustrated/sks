import Link from "next/link";
import { Container } from "@/components/layout";
import { divisions, navigation, site, PLACEHOLDER } from "@/lib/site";

/**
 * The footer is drawn as a title block.
 *
 * A drawing sheet ends with a ruled panel carrying the practice, the sheet and
 * the revision. Doing the same here means the technical register holds all the
 * way down the page instead of stopping at the last section.
 */

/** A detail SKS has not supplied yet is left out, never shown as a gap. */
const known = (value: string) => !value.includes(PLACEHOLDER);

function Detail({ label, value }: { label: string; value: string }) {
  if (!known(value)) return null;
  return (
    <div>
      <dt className="anno text-navy-500">{label}</dt>
      <dd className="mt-1 text-sm text-navy-200">{value}</dd>
    </div>
  );
}

function Cell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-navy-950 p-6">
      <h2 className="anno text-gold-300">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-navy-700 bg-navy-950 text-navy-100">
      <Container className="max-w-7xl pt-14">
        <div className="grid gap-px border border-navy-800 bg-navy-800 sm:grid-cols-2 lg:grid-cols-4">
          <Cell title="Practice">
            <p className="font-display text-lg font-bold text-white">
              {site.name}
            </p>
            <p className="mt-3 text-sm text-navy-300">{site.tagline}.</p>
            <p className="mt-3 text-sm text-navy-300">
              Serving {site.serviceArea}.
            </p>
          </Cell>

          <Cell title="Divisions">
            <ul className="space-y-2">
              {divisions.map((division) => (
                <li key={division.slug}>
                  <Link
                    href={`/${division.slug}`}
                    className="text-sm text-navy-200 transition-colors hover:text-gold-300"
                  >
                    {division.name}
                  </Link>
                </li>
              ))}
            </ul>
          </Cell>

          <Cell title="Company">
            <ul className="space-y-2">
              {navigation
                .filter((item) =>
                  ["/about", "/projects", "/contact"].includes(item.href),
                )
                .map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-navy-200 transition-colors hover:text-gold-300"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
            </ul>
          </Cell>

          <Cell title="Contact">
            <dl className="space-y-4">
              <Detail label="Phone" value={site.phone} />
              <Detail label="Email" value={site.email} />
              <Detail label="Address" value={site.address.line1} />
            </dl>
            <Link
              href="/contact"
              className="mt-4 inline-block text-sm text-navy-200 underline-offset-4 transition-colors hover:text-gold-300 hover:underline"
            >
              Send an enquiry
            </Link>
          </Cell>
        </div>

        <div className="anno flex flex-col gap-2 py-6 text-navy-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {year} {site.name} - All rights reserved
          </p>
          <p className="flex flex-wrap gap-x-6 gap-y-2">
            {known(site.companyNumber) ? (
              <span>Company no. {site.companyNumber}</span>
            ) : null}
            {known(site.vatNumber) ? <span>VAT {site.vatNumber}</span> : null}
            <Link href="/privacy" className="transition-colors hover:text-gold-300">
              Privacy notice
            </Link>
          </p>
        </div>
      </Container>
    </footer>
  );
}
