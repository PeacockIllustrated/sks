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

/**
 * Set `html.reduced` before first paint.
 *
 * The animated sections read this class synchronously to decide whether to run
 * a timeline at all. Doing it in an effect would be too late: someone who asked
 * for no motion would still catch the first frame of it.
 */
const REDUCED_MOTION_FLAG =
  "try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)" +
  "document.documentElement.classList.add('reduced')}catch(e){}";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en-GB"
      /* Next 16 no longer overrides scroll-behavior on navigation unless asked,
         and we set `scroll-behavior: smooth` globally for the in-page anchors. */
      data-scroll-behavior="smooth"
      className={`${plusJakarta.variable} ${inter.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: REDUCED_MOTION_FLAG }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
