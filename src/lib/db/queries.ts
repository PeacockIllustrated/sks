import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  ClientRow,
  LeadRow,
  LeadStatus,
  ProfileRow,
  ProjectRow,
  QuoteLineItemRow,
  QuoteRow,
} from "@/lib/db/types";

/**
 * All reads go through the request-scoped Supabase client, so RLS is doing the
 * access control rather than a `where` clause somebody might forget. A missing
 * filter here is a bug; a missing filter with RLS off would be a breach.
 */

export async function getLeads(options?: {
  status?: LeadStatus | "ALL";
  limit?: number;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("sks_leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 100);

  if (options?.status && options.status !== "ALL") {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load leads: ${error.message}`);
  return (data ?? []) as LeadRow[];
}

export async function getLead(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sks_leads")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load lead: ${error.message}`);
  return (data as LeadRow | null) ?? null;
}

export async function getLeadCounts() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sks_leads").select("status");
  if (error) throw new Error(`Failed to count leads: ${error.message}`);

  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as { status: string }[]) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }
  return counts;
}

export async function getProjects(limit = 100) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sks_projects")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to load projects: ${error.message}`);
  return (data ?? []) as ProjectRow[];
}

export async function getProject(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sks_projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load project: ${error.message}`);
  return (data as ProjectRow | null) ?? null;
}

export async function getClients(limit = 200) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sks_clients")
    .select("*")
    .order("contact_name")
    .limit(limit);

  if (error) throw new Error(`Failed to load clients: ${error.message}`);
  return (data ?? []) as ClientRow[];
}

export async function getClient(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sks_clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load client: ${error.message}`);
  return (data as ClientRow | null) ?? null;
}

export async function getQuotes(options?: { projectId?: string; limit?: number }) {
  const supabase = await createClient();
  let query = supabase
    .from("sks_quotes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 100);

  if (options?.projectId) query = query.eq("project_id", options.projectId);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load quotes: ${error.message}`);
  return (data ?? []) as QuoteRow[];
}

export async function getQuote(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sks_quotes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load quote: ${error.message}`);
  return (data as QuoteRow | null) ?? null;
}

export async function getQuoteLineItems(quoteId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sks_quote_line_items")
    .select("*")
    .eq("quote_id", quoteId)
    .order("position");

  if (error) throw new Error(`Failed to load line items: ${error.message}`);
  return (data ?? []) as QuoteLineItemRow[];
}

/** Every version of a quote reference, newest first. */
export async function getQuoteVersions(reference: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sks_quotes")
    .select("*")
    .eq("reference", reference)
    .order("version", { ascending: false });

  if (error) throw new Error(`Failed to load quote versions: ${error.message}`);
  return (data ?? []) as QuoteRow[];
}

export async function getStaff() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sks_profiles")
    .select("id, email, full_name, role, job_title, is_active")
    .in("role", ["OWNER", "STAFF"])
    .eq("is_active", true)
    .order("full_name");

  if (error) throw new Error(`Failed to load staff: ${error.message}`);
  return (data ?? []) as ProfileRow[];
}

/** Names keyed by id, for rendering owner and manager columns without joins. */
export async function getProfileNames(): Promise<Map<string, string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sks_profiles")
    .select("id, full_name, email");

  if (error) return new Map();

  return new Map(
    (data ?? []).map((row: { id: string; full_name: string | null; email: string }) => [
      row.id,
      row.full_name ?? row.email,
    ]),
  );
}

/**
 * Dashboard aggregation.
 *
 * Lives here rather than in the page because it reads the clock, and reading
 * the clock during render is impure: two renders of the same component could
 * disagree about what counts as stale.
 */
export async function getDashboardData(staleDays = 3) {
  const [counts, leads, projects, quotes] = await Promise.all([
    getLeadCounts(),
    getLeads({ limit: 200 }),
    getProjects(200),
    getQuotes({ limit: 200 }),
  ]);

  const openLeads = leads.filter(
    (lead) => lead.status !== "WON" && lead.status !== "LOST",
  );

  const cutoff = Date.now() - staleDays * 24 * 60 * 60 * 1000;
  const staleLeads = openLeads.filter(
    (lead) => new Date(lead.updated_at).getTime() < cutoff,
  );

  const liveProjects = projects.filter((project) =>
    ["SCHEDULED", "IN_PROGRESS", "SNAGGING"].includes(project.stage),
  );

  const outstandingQuotes = quotes.filter((quote) => quote.status === "SENT");

  return {
    counts,
    leads,
    openLeads,
    staleLeads,
    liveProjects,
    outstandingQuotes,
    staleDays,
  };
}
