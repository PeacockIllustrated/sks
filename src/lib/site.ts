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
  tagline: "Bespoke joinery, interiors and extensions under one roof",
  description:
    "SKS Construction is a North East firm specialising in bespoke joinery, fitted interiors and extensions, with construction and roofing handled in house. One point of contact, one quote.",
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
    slug: "joinery",
    name: "Joinery",
    key: "JOINERY",
    strapline: "Made to fit, not made to fit the catalogue",
    intro:
      "Interiors are where a house is lived in, and where the detail shows. Bespoke joinery made and fitted by the same firm doing the building work: kitchens, staircases, fitted furniture, doors and second fix throughout.",
    services: [
      "Bespoke kitchens and utility fit-out",
      "Fitted furniture, wardrobes and alcove storage",
      "Staircases and balustrades",
      "Internal doors, panelling and feature joinery",
      "Skirting, architrave and second fix",
      "Timber windows and external doors",
      "Repairs and heritage matching",
    ],
    worksWellWith:
      "When joinery is drawn alongside the build rather than after it, openings, fixings and service runs are right the first time. It is also why an extension arrives with its kitchen and storage already designed in.",
  },
  {
    slug: "construction",
    name: "Construction",
    key: "CONSTRUCTION",
    strapline: "Extensions and refurbishment, groundwork to handover",
    intro:
      "Single and two storey extensions, structural alterations and full refurbishment. We handle the programme, the trades and the paperwork, and hand the space over ready for its joinery, so you are not the one chasing a chain of subcontractors.",
    services: [
      "Single and two storey extensions",
      "Kitchen, family room and garden room extensions",
      "Structural alterations and open-plan openings",
      "Full property refurbishment",
      "Conversions, including lofts and garages",
      "Groundwork and foundations",
      "Project management and building control liaison",
    ],
    worksWellWith:
      "Most extensions end up needing joinery and roofing anyway. Having all three in house is why our programmes hold, and why the finished room looks designed rather than assembled.",
  },
  {
    slug: "roofing",
    name: "Roofing",
    key: "ROOFING",
    strapline: "Watertight, and signed off properly",
    intro:
      "Pitched and flat roofing, repairs and full replacement. Leadwork, guttering and fascias included rather than treated as somebody else's problem, with flat roofs and rooflights for extensions built to the same programme.",
    services: [
      "Flat roofing for extensions, including single ply and GRP",
      "Pitched roof replacement and repair",
      "Rooflights and lanterns, fitted and weathered",
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
    body: "An extension and the interior that goes in it are priced and scheduled as a whole. No gaps between trades for the cost or the timeline to hide in.",
  },
  {
    title: "Directly employed teams",
    body: "The trades on your job are ours. That is what lets us hold a date and stand behind the finish.",
  },
];

export const navigation = [
  { href: "/", label: "Home" },
  { href: "/joinery", label: "Joinery" },
  { href: "/construction", label: "Construction" },
  { href: "/roofing", label: "Roofing" },
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];
