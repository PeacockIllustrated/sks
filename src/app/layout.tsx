import type { Metadata } from "next";
import "./globals.css";
import { inter, plusJakarta } from "@/lib/fonts";
import { site } from "@/lib/site";

/**
 * Root layout. Deliberately thin: html, body and fonts only.
 *
 * Public chrome lives in the (site) group and the operations hub brings its
 * own, so the two never bleed into each other.
 */

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} - ${site.tagline}`,
    template: `%s - ${site.name}`,
  },
  description: site.description,
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: site.name,
    title: `${site.name} - ${site.tagline}`,
    description: site.description,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" className={`${plusJakarta.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
