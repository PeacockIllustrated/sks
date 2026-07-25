/**
 * Single source of truth for site copy and details.
 *
 * Anything marked PLACEHOLDER is blocked on the client. It is deliberately
 * obvious rather than plausible, so no invented detail can reach production
 * unnoticed. Grep for PLACEHOLDER before launch.
 */

export const PLACEHOLDER = "PLACEHOLDER" as const;

export const site = {
  name: "SKS Construction",
  legalName: `SKS Construction ${PLACEHOLDER} Ltd`,
  tagline: "Construction, joinery and roofing under one roof",
  description:
    "SKS Construction is a multi-trade contractor in the North East. Construction, joinery and roofing handled by one firm, with one point of contact and one quote.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  serviceArea: "the North East of England",
  foundedYear: PLACEHOLDER,
  phone: PLACEHOLDER,
  email: PLACEHOLDER,
  address: {
    line1: PLACEHOLDER,
    city: PLACEHOLDER,
    postcode: PLACEHOLDER,
    region: "Tyne and Wear",
    country: "GB",
  },
  companyNumber: PLACEHOLDER,
  vatNumber: PLACEHOLDER,
  memberships: [] as string[],
} as const;

export type DivisionSlug = "construction" | "joinery" | "roofing";

export type DivisionContent = {
  slug: DivisionSlug;
  name: string;
  /** Enum value in the database. */
  key: "CONSTRUCTION" | "JOINERY" | "ROOFING";
  strapline: string;
  intro: string;
  services: string[];
  worksWellWith: string;
};

export const divisions: DivisionContent[] = [
  {
    slug: "construction",
    name: "Construction",
    key: "CONSTRUCTION",
    strapline: "Groundwork to handover, managed by one team",
    intro:
      "New build, extensions, structural alterations and full refurbishment. We handle the programme, the trades and the paperwork, so you are not the one chasing a chain of subcontractors.",
    services: [
      "Extensions and structural alterations",
      "Full property refurbishment",
      "Groundwork and foundations",
      "Conversions, including lofts and garages",
      "Commercial fit-out",
      "Project management and building control liaison",
    ],
    worksWellWith:
      "Most construction jobs end up needing joinery and roofing anyway. Having all three in house is why our programmes hold.",
  },
  {
    slug: "joinery",
    name: "Joinery",
    key: "JOINERY",
    strapline: "Made to fit, not made to fit the catalogue",
    intro:
      "Bespoke joinery made and fitted by the same firm doing the building work. Staircases, doors, windows, fitted furniture and second fix throughout.",
    services: [
      "Bespoke fitted furniture and storage",
      "Staircases and balustrades",
      "Timber doors and windows",
      "Kitchens and utility fit-out",
      "Skirting, architrave and second fix",
      "Repairs and heritage matching",
    ],
    worksWellWith:
      "When joinery is drawn alongside the build rather than after it, openings and fixings are right the first time.",
  },
  {
    slug: "roofing",
    name: "Roofing",
    key: "ROOFING",
    strapline: "Watertight, and signed off properly",
    intro:
      "Pitched and flat roofing, repairs and full replacement. Leadwork, guttering and fascias included rather than treated as somebody else's problem.",
    services: [
      "Pitched roof replacement and repair",
      "Flat roofing, including single ply and GRP",
      "Leadwork and flashings",
      "Fascias, soffits and rainwater goods",
      "Chimney repair and repointing",
      "Roof surveys and condition reports",
    ],
    worksWellWith:
      "Roofing is where multi-trade jobs usually stall waiting on access. Ours does not, because it is the same programme.",
  },
];

export function getDivision(slug: string): DivisionContent | undefined {
  return divisions.find((division) => division.slug === slug);
}

export const proofPoints = [
  {
    title: "One point of contact",
    body: "One person owns your job from first visit to handover. You are never passed between firms or asked to co-ordinate trades yourself.",
  },
  {
    title: "One quote, one programme",
    body: "Multi-trade work is priced and scheduled as a whole. No gaps between trades for the cost or the timeline to hide in.",
  },
  {
    title: "Directly employed teams",
    body: "The trades on your job are ours. That is what lets us hold a date and stand behind the finish.",
  },
];

export const navigation = [
  { href: "/", label: "Home" },
  { href: "/construction", label: "Construction" },
  { href: "/joinery", label: "Joinery" },
  { href: "/roofing", label: "Roofing" },
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];
