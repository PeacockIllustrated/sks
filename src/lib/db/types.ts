/**
 * Row types for the `sks_` tables.
 *
 * Hand-written, because `supabase gen types` needs a live project and there
 * is not one yet. The SQL migrations in `supabase/migrations` are the source
 * of truth; this file is the view of them the application compiles against,
 * so keep the two in step.
 *
 * Once a project exists, `npm run db:types` generates
 * `src/lib/db/database.types.ts` from the live schema. Move to those and keep
 * this file only for the enums, labels and transition maps, which are domain
 * knowledge rather than schema.
 */

export const ROLES = ["OWNER", "STAFF", "CLIENT"] as const;
export type Role = (typeof ROLES)[number];

export const DIVISIONS = ["CONSTRUCTION", "JOINERY", "ROOFING"] as const;
export type Division = (typeof DIVISIONS)[number];

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "QUOTED",
  "WON",
  "LOST",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = [
  "WEBSITE",
  "PHONE",
  "EMAIL",
  "REFERRAL",
  "REPEAT",
  "OTHER",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const PROJECT_STAGES = [
  "ENQUIRY",
  "SURVEY",
  "QUOTED",
  "SCHEDULED",
  "IN_PROGRESS",
  "SNAGGING",
  "COMPLETE",
  "ON_HOLD",
  "CANCELLED",
] as const;
export type ProjectStage = (typeof PROJECT_STAGES)[number];

export const QUOTE_STATUSES = [
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
  "SUPERSEDED",
] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export type LeadRow = {
  id: string;
  reference: string;
  client_id: string | null;
  owner_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  postcode: string | null;
  division: Division | null;
  message: string;
  status: LeadStatus;
  source: LeadSource;
  lost_reason: string | null;
  contacted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientRow = {
  id: string;
  profile_id: string | null;
  company_name: string | null;
  contact_name: string;
  email: string;
  phone: string | null;
  address_line1: string | null;
  city: string | null;
  postcode: string | null;
  notes: string | null;
  created_at: string;
};

export type ProjectRow = {
  id: string;
  reference: string;
  client_id: string;
  lead_id: string | null;
  manager_id: string | null;
  title: string;
  division: Division;
  stage: ProjectStage;
  description: string | null;
  site_address: string | null;
  site_postcode: string | null;
  start_date: string | null;
  end_date: string | null;
  contract_value: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type QuoteRow = {
  id: string;
  reference: string;
  version: number;
  project_id: string | null;
  client_id: string;
  author_id: string | null;
  status: QuoteStatus;
  title: string;
  notes: string | null;
  terms: string | null;
  subtotal: string;
  vat_rate: string;
  vat_amount: string;
  total: string;
  valid_until: string | null;
  sent_at: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type QuoteLineItemRow = {
  id: string;
  quote_id: string;
  position: number;
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
  line_total: string;
};

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  job_title: string | null;
  is_active: boolean;
};

/** Numeric columns come back from Postgres as strings. Parse, do not cast. */
export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  QUOTED: "Quoted",
  WON: "Won",
  LOST: "Lost",
};

export const PROJECT_STAGE_LABELS: Record<ProjectStage, string> = {
  ENQUIRY: "Enquiry",
  SURVEY: "Survey",
  QUOTED: "Quoted",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  SNAGGING: "Snagging",
  COMPLETE: "Complete",
  ON_HOLD: "On hold",
  CANCELLED: "Cancelled",
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  EXPIRED: "Expired",
  SUPERSEDED: "Superseded",
};

export const DIVISION_LABELS: Record<Division, string> = {
  CONSTRUCTION: "Construction",
  JOINERY: "Joinery",
  ROOFING: "Roofing",
};

/**
 * Which lead statuses can follow which. Encoded once so the UI and the server
 * action agree, and so an invalid jump cannot be forced by posting a form.
 */
export const LEAD_STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW: ["CONTACTED", "QUALIFIED", "LOST"],
  CONTACTED: ["QUALIFIED", "QUOTED", "LOST"],
  QUALIFIED: ["QUOTED", "WON", "LOST"],
  QUOTED: ["WON", "LOST"],
  WON: [],
  LOST: ["CONTACTED"],
};
