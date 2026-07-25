"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { status: "idle" | "error" | "success"; message?: string };

/**
 * A quote is only editable while it is a draft. Once it has gone to the
 * customer, changing it under them is how disputes start; the way to change a
 * sent quote is a new version, which supersedes the old one and keeps both.
 */
async function requireDraft(quoteId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sks_quotes")
    .select("id, status, reference, version, client_id, project_id, title, vat_rate, terms, notes")
    .eq("id", quoteId)
    .maybeSingle();

  if (error || !data) return { quote: null, supabase, reason: "Quote not found." };
  if (data.status !== "DRAFT") {
    return {
      quote: null,
      supabase,
      reason: "This quote has been sent. Create a new version to change it.",
    };
  }
  return { quote: data, supabase, reason: null };
}

const lineInput = z.object({
  quoteId: z.string().uuid(),
  description: z.string().trim().min(2, "Describe the item").max(500),
  quantity: z.coerce.number().positive("Quantity must be more than zero").max(100000),
  unit: z.string().trim().min(1).max(20),
  unitPrice: z.coerce
    .number()
    .min(0, "Price cannot be negative")
    .max(10000000),
});

export async function addLineItem(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff();

  const parsed = lineInput.safeParse({
    quoteId: formData.get("quoteId")?.toString(),
    description: formData.get("description")?.toString() ?? "",
    quantity: formData.get("quantity")?.toString() ?? "",
    unit: formData.get("unit")?.toString() ?? "item",
    unitPrice: formData.get("unitPrice")?.toString() ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the line details.",
    };
  }

  const { quote, supabase, reason } = await requireDraft(parsed.data.quoteId);
  if (!quote) return { status: "error", message: reason ?? "Cannot edit." };

  const { data: last } = await supabase
    .from("sks_quote_line_items")
    .select("position")
    .eq("quote_id", parsed.data.quoteId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  // line_total is recomputed by a database trigger; sending it is a formality.
  const { error } = await supabase.from("sks_quote_line_items").insert({
    quote_id: parsed.data.quoteId,
    position: (last?.position ?? -1) + 1,
    description: parsed.data.description,
    quantity: parsed.data.quantity,
    unit: parsed.data.unit,
    unit_price: parsed.data.unitPrice,
    line_total: 0,
  });

  if (error) return { status: "error", message: "Could not add that line." };

  revalidatePath(`/admin/quotes/${parsed.data.quoteId}`);
  return { status: "success", message: "Line added." };
}

export async function removeLineItem(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff();

  const quoteId = formData.get("quoteId")?.toString() ?? "";
  const lineId = formData.get("lineId")?.toString() ?? "";

  if (!z.string().uuid().safeParse(quoteId).success) {
    return { status: "error", message: "Invalid quote." };
  }
  if (!z.string().uuid().safeParse(lineId).success) {
    return { status: "error", message: "Invalid line." };
  }

  const { quote, supabase, reason } = await requireDraft(quoteId);
  if (!quote) return { status: "error", message: reason ?? "Cannot edit." };

  const { error } = await supabase
    .from("sks_quote_line_items")
    .delete()
    .eq("id", lineId)
    .eq("quote_id", quoteId);

  if (error) return { status: "error", message: "Could not remove that line." };

  revalidatePath(`/admin/quotes/${quoteId}`);
  return { status: "success", message: "Line removed." };
}

const detailsInput = z.object({
  quoteId: z.string().uuid(),
  title: z.string().trim().min(3).max(200),
  vatRate: z.coerce.number().min(0).max(100),
  validUntil: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
  terms: z.string().trim().max(4000).optional().or(z.literal("")),
});

export async function updateQuoteDetails(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff();

  const parsed = detailsInput.safeParse({
    quoteId: formData.get("quoteId")?.toString(),
    title: formData.get("title")?.toString() ?? "",
    vatRate: formData.get("vatRate")?.toString() ?? "20",
    validUntil: formData.get("validUntil")?.toString() ?? "",
    notes: formData.get("notes")?.toString() ?? "",
    terms: formData.get("terms")?.toString() ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the details.",
    };
  }

  const { quote, supabase, reason } = await requireDraft(parsed.data.quoteId);
  if (!quote) return { status: "error", message: reason ?? "Cannot edit." };

  const { error } = await supabase
    .from("sks_quotes")
    .update({
      title: parsed.data.title,
      vat_rate: parsed.data.vatRate,
      valid_until: parsed.data.validUntil
        ? new Date(parsed.data.validUntil).toISOString()
        : null,
      notes: parsed.data.notes || null,
      terms: parsed.data.terms || null,
    })
    .eq("id", parsed.data.quoteId);

  if (error) return { status: "error", message: "Could not save the quote." };

  // The VAT rate feeds the totals, so ask the database to recompute them.
  await supabase.rpc("sks_recalculate_quote", {
    target_quote_id: parsed.data.quoteId,
  });

  revalidatePath(`/admin/quotes/${parsed.data.quoteId}`);
  return { status: "success", message: "Quote saved." };
}

export async function sendQuote(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff();

  const quoteId = formData.get("quoteId")?.toString() ?? "";
  if (!z.string().uuid().safeParse(quoteId).success) {
    return { status: "error", message: "Invalid quote." };
  }

  const { quote, supabase, reason } = await requireDraft(quoteId);
  if (!quote) return { status: "error", message: reason ?? "Cannot send." };

  const { count } = await supabase
    .from("sks_quote_line_items")
    .select("id", { count: "exact", head: true })
    .eq("quote_id", quoteId);

  if (!count) {
    return {
      status: "error",
      message: "Add at least one line before sending this quote.",
    };
  }

  const { error } = await supabase
    .from("sks_quotes")
    .update({ status: "SENT", sent_at: new Date().toISOString() })
    .eq("id", quoteId)
    .eq("status", "DRAFT");

  if (error) return { status: "error", message: "Could not send the quote." };

  revalidatePath(`/admin/quotes/${quoteId}`);
  revalidatePath("/admin/quotes");
  revalidatePath("/admin");

  return { status: "success", message: "Quote marked as sent." };
}

const respondInput = z.object({
  quoteId: z.string().uuid(),
  outcome: z.enum(["ACCEPTED", "DECLINED"]),
});

export async function recordQuoteResponse(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff();

  const parsed = respondInput.safeParse({
    quoteId: formData.get("quoteId")?.toString(),
    outcome: formData.get("outcome")?.toString(),
  });

  if (!parsed.success) return { status: "error", message: "Invalid response." };

  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("sks_quotes")
    .select("id, status, project_id, total")
    .eq("id", parsed.data.quoteId)
    .maybeSingle();

  if (!quote) return { status: "error", message: "Quote not found." };
  if (quote.status !== "SENT") {
    return {
      status: "error",
      message: "Only a sent quote can be accepted or declined.",
    };
  }

  const { error } = await supabase
    .from("sks_quotes")
    .update({
      status: parsed.data.outcome,
      responded_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.quoteId)
    .eq("status", "SENT");

  if (error) return { status: "error", message: "Could not record that." };

  // Accepting a quote moves the project on and sets its value. Doing this by
  // hand is exactly the step that gets forgotten.
  if (parsed.data.outcome === "ACCEPTED" && quote.project_id) {
    await supabase
      .from("sks_projects")
      .update({ stage: "SCHEDULED", contract_value: quote.total })
      .eq("id", quote.project_id);

    revalidatePath(`/admin/projects/${quote.project_id}`);
  }

  revalidatePath(`/admin/quotes/${parsed.data.quoteId}`);
  revalidatePath("/admin/quotes");
  revalidatePath("/admin");

  return {
    status: "success",
    message:
      parsed.data.outcome === "ACCEPTED"
        ? "Quote accepted, project moved to scheduled."
        : "Quote declined.",
  };
}

/**
 * Creates the next version of a quote, copying the lines, and marks the old
 * one superseded. Both stay on file, which is the point: you can show a
 * customer what changed between v1 and v2.
 */
export async function createNewVersion(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireStaff();

  const quoteId = formData.get("quoteId")?.toString() ?? "";
  if (!z.string().uuid().safeParse(quoteId).success) {
    return { status: "error", message: "Invalid quote." };
  }

  const supabase = await createClient();

  const { data: source } = await supabase
    .from("sks_quotes")
    .select("*")
    .eq("id", quoteId)
    .maybeSingle();

  if (!source) return { status: "error", message: "Quote not found." };
  if (source.status === "DRAFT") {
    return {
      status: "error",
      message: "This quote is still a draft. Edit it directly.",
    };
  }

  const { data: versions } = await supabase
    .from("sks_quotes")
    .select("version")
    .eq("reference", source.reference)
    .order("version", { ascending: false })
    .limit(1);

  const nextVersion = (versions?.[0]?.version ?? source.version) + 1;

  const { data: created, error } = await supabase
    .from("sks_quotes")
    .insert({
      reference: source.reference,
      version: nextVersion,
      project_id: source.project_id,
      client_id: source.client_id,
      author_id: user.id,
      status: "DRAFT",
      title: source.title,
      notes: source.notes,
      terms: source.terms,
      vat_rate: source.vat_rate,
      valid_until: source.valid_until,
    })
    .select("id")
    .single();

  if (error || !created) {
    return { status: "error", message: "Could not create the new version." };
  }

  const { data: lines } = await supabase
    .from("sks_quote_line_items")
    .select("position, description, quantity, unit, unit_price")
    .eq("quote_id", quoteId)
    .order("position");

  if (lines && lines.length > 0) {
    await supabase.from("sks_quote_line_items").insert(
      lines.map((line) => ({
        quote_id: created.id,
        position: line.position,
        description: line.description,
        quantity: line.quantity,
        unit: line.unit,
        unit_price: line.unit_price,
        line_total: 0,
      })),
    );
  }

  await supabase
    .from("sks_quotes")
    .update({ status: "SUPERSEDED" })
    .eq("id", quoteId);

  revalidatePath("/admin/quotes");
  redirect(`/admin/quotes/${created.id}`);
}
