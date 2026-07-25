"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PROJECT_STAGES } from "@/lib/db/types";

export type ActionState = { status: "idle" | "error" | "success"; message?: string };

const updateInput = z.object({
  projectId: z.string().uuid(),
  stage: z.enum(PROJECT_STAGES),
  startDate: z.string().trim().optional().or(z.literal("")),
  endDate: z.string().trim().optional().or(z.literal("")),
  contractValue: z.string().trim().optional().or(z.literal("")),
  siteAddress: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function updateProject(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff();

  const parsed = updateInput.safeParse({
    projectId: formData.get("projectId")?.toString(),
    stage: formData.get("stage")?.toString(),
    startDate: formData.get("startDate")?.toString() ?? "",
    endDate: formData.get("endDate")?.toString() ?? "",
    contractValue: formData.get("contractValue")?.toString() ?? "",
    siteAddress: formData.get("siteAddress")?.toString() ?? "",
  });

  if (!parsed.success) {
    return { status: "error", message: "Check the details and try again." };
  }

  const { startDate, endDate, contractValue } = parsed.data;

  if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
    return { status: "error", message: "The end date cannot be before the start." };
  }

  let value: number | null = null;
  if (contractValue) {
    const parsedValue = Number.parseFloat(contractValue.replace(/[^0-9.-]/g, ""));
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      return { status: "error", message: "Enter the contract value as a number." };
    }
    value = parsedValue;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("sks_projects")
    .update({
      stage: parsed.data.stage,
      start_date: startDate ? new Date(startDate).toISOString() : null,
      end_date: endDate ? new Date(endDate).toISOString() : null,
      contract_value: value,
      site_address: parsed.data.siteAddress || null,
    })
    .eq("id", parsed.data.projectId);

  if (error) return { status: "error", message: "Could not save the project." };

  revalidatePath(`/admin/projects/${parsed.data.projectId}`);
  revalidatePath("/admin/projects");
  revalidatePath("/admin");

  return { status: "success", message: "Project saved." };
}

const createQuoteInput = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(3, "Give the quote a title").max(200),
});

export async function createQuoteForProject(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireStaff();

  const parsed = createQuoteInput.safeParse({
    projectId: formData.get("projectId")?.toString(),
    title: formData.get("title")?.toString() ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the details.",
    };
  }

  const supabase = await createClient();

  const { data: project } = await supabase
    .from("sks_projects")
    .select("id, client_id")
    .eq("id", parsed.data.projectId)
    .maybeSingle();

  if (!project) return { status: "error", message: "Could not find that project." };

  const { data: reference, error: refError } = await supabase.rpc(
    "sks_next_quote_reference",
  );

  if (refError || !reference) {
    return { status: "error", message: "Could not allocate a quote reference." };
  }

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);

  const { data: quote, error } = await supabase
    .from("sks_quotes")
    .insert({
      reference,
      version: 1,
      project_id: project.id,
      client_id: project.client_id,
      author_id: user.id,
      title: parsed.data.title,
      status: "DRAFT",
      valid_until: validUntil.toISOString(),
    })
    .select("id")
    .single();

  if (error || !quote) {
    return { status: "error", message: "Could not create the quote." };
  }

  revalidatePath(`/admin/projects/${project.id}`);
  revalidatePath("/admin/quotes");

  redirect(`/admin/quotes/${quote.id}`);
}
