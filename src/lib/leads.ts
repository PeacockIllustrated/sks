import { z } from "zod";

/** UK postcode, loose enough to accept real-world spacing and case. */
const postcodePattern =
  /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

export const leadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name")
    .max(100, "That name is too long"),
  email: z
    .string()
    .trim()
    .min(1, "Please enter your email address")
    .email("That does not look like an email address")
    .max(200),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .or(z.literal("")),
  postcode: z
    .string()
    .trim()
    .max(10)
    .refine((value) => value === "" || postcodePattern.test(value), {
      message: "Please enter a valid UK postcode",
    })
    .optional()
    .or(z.literal("")),
  division: z.enum(["CONSTRUCTION", "JOINERY", "ROOFING", "UNSURE"]),
  message: z
    .string()
    .trim()
    .min(10, "Please tell us a little more about the job")
    .max(4000, "Please keep this under 4000 characters"),
  /** Honeypot. Bots fill it, people never see it. */
  company: z.string().max(0).optional().or(z.literal("")),
});

export type LeadInput = z.infer<typeof leadSchema>;

export type LeadFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<keyof LeadInput, string>>;
  /**
   * What the person typed, echoed back so a validation error does not wipe
   * the form. Never populated on success.
   */
  values?: Partial<Record<keyof LeadInput, string>>;
  /**
   * Incremented on every failed attempt. The form is keyed on it so React
   * remounts the fields and re-applies `defaultValue`, which is what actually
   * restores what the person typed. React resets uncontrolled fields after a
   * form action, so without the remount the echoed values never land.
   */
  attempt?: number;
};

/** Human-readable reference, e.g. SKS-L-6X2K9A. */
export function generateLeadReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let index = 0; index < 6; index += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `SKS-L-${suffix}`;
}
