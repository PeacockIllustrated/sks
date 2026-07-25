import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { site } from "@/lib/site";

/**
 * Chrome for the public site only.
 *
 * The admin area deliberately does not inherit this. Sitting the operations
 * hub inside the marketing header, complete with a "Request a quote" button,
 * is the sort of thing that looks like nobody used the software.
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "@id": `${site.url}#business`,
            name: site.name,
            description: site.description,
            url: site.url,
            areaServed: site.serviceArea,
            address: {
              "@type": "PostalAddress",
              addressRegion: site.address.region,
              addressCountry: site.address.country,
            },
          }),
        }}
      />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-navy-800 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
