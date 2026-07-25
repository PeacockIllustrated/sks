"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2 } from "lucide-react";
import { submitEnquiry } from "./actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { divisions } from "@/lib/site";
import type { LeadFormState } from "@/lib/leads";

const initialState: LeadFormState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Sending..." : "Send enquiry"}
    </Button>
  );
}

export function EnquiryForm({ initialMessage }: { initialMessage?: string }) {
  const [state, formAction] = useActionState(submitEnquiry, initialState);
  const values = state.values ?? {};

  /* On a failed submit the customer's own text wins: re-seeding the builder
     specification over what they typed would throw their edit away. */
  const messageDefault = values.message ?? initialMessage;

  if (state.status === "success") {
    return (
      <div
        className="border border-navy-200 bg-navy-50 p-8"
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 className="size-8 text-gold-500" aria-hidden="true" />
        <h2 className="mt-4 text-2xl">Enquiry received</h2>
        <p className="mt-3 text-navy-600">
          Thanks for getting in touch. We read every enquiry and will come back
          to you with next steps.
        </p>
        {state.message ? (
          <p className="mt-2 text-sm font-medium text-navy-800">
            {state.message}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form
      key={state.attempt ?? 0}
      action={formAction}
      className="space-y-5"
      noValidate
    >
      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" htmlFor="name" required error={state.fieldErrors?.name}>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            defaultValue={values.name}
            required
            aria-invalid={state.fieldErrors?.name ? true : undefined}
            aria-describedby={state.fieldErrors?.name ? "name-error" : undefined}
          />
        </Field>

        <Field label="Email" htmlFor="email" required error={state.fieldErrors?.email}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={values.email}
            required
            aria-invalid={state.fieldErrors?.email ? true : undefined}
            aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
          />
        </Field>

        <Field label="Phone" htmlFor="phone" error={state.fieldErrors?.phone}>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            defaultValue={values.phone}
          />
        </Field>

        <Field
          label="Site postcode"
          htmlFor="postcode"
          hint="Helps us tell you straight away if you are in our area."
          error={state.fieldErrors?.postcode}
        >
          <Input
            id="postcode"
            name="postcode"
            autoComplete="postal-code"
            defaultValue={values.postcode}
            aria-invalid={state.fieldErrors?.postcode ? true : undefined}
            aria-describedby={
              state.fieldErrors?.postcode
                ? "postcode-hint postcode-error"
                : "postcode-hint"
            }
          />
        </Field>
      </div>

      <Field label="What do you need?" htmlFor="division" required>
        <Select
          id="division"
          name="division"
          defaultValue={values.division ?? "UNSURE"}
          required
        >
          <option value="UNSURE">Not sure yet</option>
          {divisions.map((division) => (
            <option key={division.key} value={division.key}>
              {division.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="About the job"
        htmlFor="message"
        required
        hint="Rough scope, timescale and anything already decided. Detail helps us come back with something useful."
        error={state.fieldErrors?.message}
      >
        <Textarea
          id="message"
          name="message"
          required
          defaultValue={messageDefault}
          aria-invalid={state.fieldErrors?.message ? true : undefined}
          aria-describedby={
            state.fieldErrors?.message
              ? "message-hint message-error"
              : "message-hint"
          }
        />
      </Field>

      {/* Honeypot. Hidden from people, tempting to bots. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <SubmitButton />

      <p className="text-xs text-navy-500">
        We use your details to respond to this enquiry only. Privacy notice to
        be added before launch.
      </p>
    </form>
  );
}
