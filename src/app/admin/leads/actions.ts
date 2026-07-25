"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  LEAD_STATUSES,
  LEAD_STATUS_TRANSITIONS,
  type LeadStatus,
} from "@/lib/db/types";

export type ActionState = { status: "idle" | "error" | "success"; message?: string };

/** Records who did what. Best effort: never fail the operation over the log. */
async function logActivity(
  entityType: string,
  entityId: string,
  action: string,
  detail?: Record<string, unknown>,
) {
  try {
    const supabase = await createClient();
    await supabase.from("sks_activity_log").insert({
      entity_type: entityType,
      entity_id: entityId,
      action,
      detail: detail ?? null,
    });
  } catch (error) {
    console.error("[activity] log failed", entityType, entityId, action, error);
  }
}

const statusInput = z.object({
  leadId: z.string().uuid(),
  status: z.enum(LEAD_STATUSES),
  lostReason: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function updateLeadStatus(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireStaff();

  const parsed = statusInput.safeParse({
    leadId: formData.get("leadId")?.toString(),
    status: formData.get("status")?.toString(),
    lostReason: formData.get("lostReason")?.toString() ?? "",
  });

  if (!parsed.success) {
    return { status: "error", message: "That status change is not valid." };
  }

  const supabase = await createClient();

  const { data: current, error: readError } = await supabase
    .from("sks_leads")
    .select("status")
    .eq("id", parsed.data.leadId)
    .maybeSingle();

  if (readError || !current) {
    return { status: "error", message: "Could not find that lead." };
  }

  // The allowed transitions live in one place, and the server checks them.
  // Without this, anyone able to post a form could jump a lead straight to Won.
  const from = current.status as LeadStatus;
  const allowed = LEAD_STATUS_TRANSITIONS[from];

  if (!allowed.includes(parsed.data.status)) {
    return {
      status: "error",
      message: `A lead cannot move from ${from.toLowerCase()} to ${parsed.data.status.toLowerCase()}.`,
    };
  }

  const patch: Record<string, unknown> = { status: parsed.data.status };

  if (parsed.data.status === "CONTACTED") {
    patch.contacted_at = new Date().toISOString();
  }
  if (parsed.data.status === "LOST") {
    patch.lost_reason = parsed.data.lostReason || null;
  }

  const { error } = await supabase
    .from("sks_leads")
    .update(patch)
    .eq("id", parsed.data.leadId);

  if (error) {
    return { status: "error", message: "Could not update that lead." };
  }

  await logActivity("lead", parsed.data.leadId, `status:${parsed.data.status}`, {
    from,
    by: user.id,
  });

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${parsed.data.leadId}`);
  revalidatePath("/admin");

  return { status: "success", message: "Lead updated." };
}

const assignInput = z.object({
  leadId: z.string().uuid(),
  ownerId: z.string().uuid().or(z.literal("")),
});

export async function assignLead(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff();

  const parsed = assignInput.safeParse({
    leadId: formData.get("leadId")?.toString(),
    ownerId: formData.get("ownerId")?.toString() ?? "",
  });

  if (!parsed.success) {
    return { status: "error", message: "That assignment is not valid." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("sks_leads")
    .update({ owner_id: parsed.data.ownerId || null })
    .eq("id", parsed.data.leadId);

  if (error) return { status: "error", message: "Could not assign that lead." };

  await logActivity("lead", parsed.data.leadId, "assigned", {
    ownerId: parsed.data.ownerId || null,
  });

  revalidatePath(`/admin/leads/${parsed.data.leadId}`);
  revalidatePath("/admin/leads");

  return { status: "success", message: "Owner updated." };
}

const convertInput = z.object({
  leadId: z.string().uuid(),
  title: z.string().trim().min(3, "Give the project a title").max(200),
  division: z.enum(["CONSTRUCTION", "JOINERY", "ROOFING"]),
  companyName: z.string().trim().max(200).optional().or(z.literal("")),
});

/**
 * Turns a lead into a client and a project.
 *
 * Reuses an existing client with the same email rather than creating a
 * duplicate, because the second job from the same customer is the common case
 * and two client rows for one person is how a portal shows somebody half their
 * history.
 */
export async function convertLead(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireStaff();

  const parsed = convertInput.safeParse({
    leadId: formData.get("leadId")?.toString(),
    title: formData.get("title")?.toString() ?? "",
    division: formData.get("division")?.toString(),
    companyName: formData.get("companyName")?.toString() ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the details.",
    };
  }

  const supabase = await createClient();

  const { data: lead, error: leadError } = await supabase
    .from("sks_leads")
    .select("*")
    .eq("id", parsed.data.leadId)
    .maybeSingle();

  if (leadError || !lead) {
    return { status: "error", message: "Could not find that lead." };
  }

  if (lead.client_id) {
    return { status: "error", message: "This lead has already been converted." };
  }

  const { data: existing } = await supabase
    .from("sks_clients")
    .select("id")
    .ilike("email", lead.email)
    .maybeSingle();

  let clientId = existing?.id as string | undefined;

  if (!clientId) {
    const { data: created, error: clientError } = await supabase
      .from("sks_clients")
      .insert({
        contact_name: lead.name,
        email: lead.email,
        phone: lead.phone,
        postcode: lead.postcode,
        company_name: parsed.data.companyName || null,
      })
      .select("id")
      .single();

    if (clientError || !created) {
      return { status: "error", message: "Could not create the client record." };
    }
    clientId = created.id;
  }

  const { data: reference, error: refError } = await supabase.rpc(
    "sks_next_project_reference",
  );

  if (refError || !reference) {
    return { status: "error", message: "Could not allocate a project reference." };
  }

  const { data: project, error: projectError } = await supabase
    .from("sks_projects")
    .insert({
      reference,
      client_id: clientId,
      lead_id: lead.id,
      manager_id: user.id,
      title: parsed.data.title,
      division: parsed.data.division,
      stage: "ENQUIRY",
      description: lead.message,
      site_postcode: lead.postcode,
    })
    .select("id")
    .single();

  if (projectError || !project) {
    return { status: "error", message: "Could not create the project." };
  }

  await supabase
    .from("sks_leads")
    .update({ client_id: clientId, status: "QUALIFIED" })
    .eq("id", lead.id);

  await logActivity("lead", lead.id, "converted", {
    projectId: project.id,
    clientId,
  });

  revalidatePath("/admin/leads");
  revalidatePath("/admin/projects");
  revalidatePath("/admin");

  redirect(`/admin/projects/${project.id}`);
}
