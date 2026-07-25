"use server";

import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateLeadReference,
  leadSchema,
  type LeadFormState,
  type LeadInput,
} from "@/lib/leads";
import { site } from "@/lib/site";

export async function submitEnquiry(
  previous: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const attempt = (previous.attempt ?? 0) + 1;

  const raw = {
    name: formData.get("name")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
    phone: formData.get("phone")?.toString() ?? "",
    postcode: formData.get("postcode")?.toString() ?? "",
    division: formData.get("division")?.toString() ?? "UNSURE",
    message: formData.get("message")?.toString() ?? "",
    company: formData.get("company")?.toString() ?? "",
  };

  const parsed = leadSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: LeadFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof LeadInput | undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      fieldErrors,
      values: raw,
      attempt,
    };
  }

  // Honeypot tripped. Look like success so the bot does not retry.
  if (parsed.data.company) {
    return { status: "success" };
  }

  const lead = parsed.data;
  const reference = generateLeadReference();

  try {
    const supabase = createAdminClient();

    const { error } = await supabase.from("sks_leads").insert({
      reference,
      name: lead.name,
      email: lead.email,
      phone: lead.phone || null,
      postcode: lead.postcode ? lead.postcode.toUpperCase() : null,
      division: lead.division === "UNSURE" ? null : lead.division,
      message: lead.message,
      status: "NEW",
      source: "WEBSITE",
    });

    if (error) throw new Error(error.message);
  } catch (error) {
    console.error("[lead] failed to save enquiry", error);
    return {
      status: "error",
      message:
        "Something went wrong saving your enquiry. Please try again, or call us directly.",
      values: raw,
      attempt,
    };
  }

  // Notification is best effort. A lead that is saved but unnotified is
  // recoverable; telling the customer it failed when it did not is worse.
  try {
    await notify(lead, reference);
  } catch (error) {
    console.error("[lead] saved but notification failed", reference, error);
  }

  return {
    status: "success",
    message: `Thanks. Your reference is ${reference}.`,
  };
}

async function notify(lead: LeadInput, reference: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_NOTIFICATION_TO;
  const from = process.env.LEAD_NOTIFICATION_FROM;

  if (!apiKey || !to || !from) {
    console.warn("[lead] notification skipped, email env not configured");
    return;
  }

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to,
    replyTo: lead.email,
    subject: `New enquiry ${reference} - ${lead.division.toLowerCase()}`,
    text: [
      `New website enquiry for ${site.name}`,
      ``,
      `Reference: ${reference}`,
      `Name: ${lead.name}`,
      `Email: ${lead.email}`,
      `Phone: ${lead.phone || "not given"}`,
      `Postcode: ${lead.postcode || "not given"}`,
      `Division: ${lead.division}`,
      ``,
      `Message:`,
      lead.message,
    ].join("\n"),
  });
}
