import Link from "next/link";
import { Container } from "@/components/layout";
import { divisions, navigation, site, PLACEHOLDER } from "@/lib/site";

function Detail({ label, value }: { label: string; value: string }) {
  const missing = value.includes(PLACEHOLDER);
  return (
    <p className="text-sm text-navy-300">
      <span className="text-navy-400">{label}: </span>
      {missing ? (
        <span className="text-navy-300 italic">to be confirmed</span>
      ) : (
        value
      )}
    </p>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-navy-700 bg-navy-900 text-navy-100">
      <Container>
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-xl font-bold text-white">SKS Construction</p>
            <p className="mt-3 max-w-xs text-sm text-navy-300">{site.tagline}.</p>
            <p className="mt-4 text-sm text-navy-300">
              Serving {site.serviceArea}.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold tracking-[0.2em] text-gold-300 uppercase">
              Divisions
            </h2>
            <ul className="mt-4 space-y-2">
              {divisions.map((division) => (
                <li key={division.slug}>
                  <Link
                    href={`/${division.slug}`}
                    className="text-sm text-navy-200 hover:text-white"
                  >
                    {division.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold tracking-[0.2em] text-gold-300 uppercase">
              Company
            </h2>
            <ul className="mt-4 space-y-2">
              {navigation
                .filter((item) => ["/about", "/projects", "/contact"].includes(item.href))
                .map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-navy-200 hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold tracking-[0.2em] text-gold-300 uppercase">
              Contact
            </h2>
            <div className="mt-4 space-y-2">
              <Detail label="Phone" value={site.phone} />
              <Detail label="Email" value={site.email} />
              <Detail label="Address" value={site.address.line1} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-navy-800 py-6 text-xs text-navy-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {year} {site.name}. All rights reserved.
          </p>
          <p>
            Company number and VAT registration to be confirmed before launch.
          </p>
        </div>
      </Container>
    </footer>
  );
}
