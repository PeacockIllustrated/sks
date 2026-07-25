import localFont from "next/font/local";

/**
 * Fonts are self-hosted rather than pulled from Google Fonts. Two reasons:
 * no third-party request at runtime, which is one less consent question, and
 * builds do not depend on fonts.googleapis.com being reachable.
 *
 * Files are the latin subsets taken from the @fontsource packages.
 */

export const plusJakarta = localFont({
  src: [
    { path: "../fonts/plus-jakarta-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/plus-jakarta-sans-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../fonts/plus-jakarta-sans-latin-800-normal.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-plus-jakarta",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const inter = localFont({
  src: [
    { path: "../fonts/inter-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/inter-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/inter-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/inter-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});
