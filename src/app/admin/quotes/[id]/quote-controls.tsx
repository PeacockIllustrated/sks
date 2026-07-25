"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import {
  addLineItem,
  createNewVersion,
  recordQuoteResponse,
  removeLineItem,
  sendQuote,
  updateQuoteDetails,
  type ActionState,
} from "../actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

const initial: ActionState = { status: "idle" };

function Submit({
  label,
  pendingLabel,
  variant = "primary",
  className,
}: {
  label: string;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "outline";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={variant} disabled={pending} className={className}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

function Feedback({ state }: { state: ActionState }) {
  if (state.status === "idle" || !state.message) return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={
        state.status === "error"
          ? "text-sm font-medium text-red-700"
          : "text-sm font-medium text-green-800"
      }
    >
      {state.message}
    </p>
  );
}

export function AddLineForm({ quoteId }: { quoteId: string }) {
  const [state, action] = useActionState(addLineItem, initial);

  // No key needed: React resets an uncontrolled form after a successful
  // action, which is exactly what you want between line items.
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="quoteId" value={quoteId} />

      <Field label="Description" htmlFor="description" required>
        <Input id="description" name="description" required maxLength={500} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Quantity" htmlFor="quantity" required>
          <Input
            id="quantity"
            name="quantity"
            inputMode="decimal"
            defaultValue="1"
            required
          />
        </Field>
        <Field label="Unit" htmlFor="unit">
          <Select id="unit" name="unit" defaultValue="item">
            {["item", "m", "m2", "m3", "day", "hour", "sum"].map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Unit price" htmlFor="unitPrice" required>
          <Input id="unitPrice" name="unitPrice" inputMode="decimal" required />
        </Field>
      </div>

      <Submit label="Add line" pendingLabel="Adding..." />
      <Feedback state={state} />
    </form>
  );
}

export function RemoveLineButton({
  quoteId,
  lineId,
  description,
}: {
  quoteId: string;
  lineId: string;
  description: string;
}) {
  const [, action] = useActionState(removeLineItem, initial);

  return (
    <form action={action}>
      <input type="hidden" name="quoteId" value={quoteId} />
      <input type="hidden" name="lineId" value={lineId} />
      <button
        type="submit"
        className="text-navy-400 hover:text-red-700"
        aria-label={`Remove line: ${description}`}
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </form>
  );
}

export function QuoteDetailsForm({
  quoteId,
  title,
  vatRate,
  validUntil,
  notes,
  terms,
}: {
  quoteId: string;
  title: string;
  vatRate: string;
  validUntil: string | null;
  notes: string | null;
  terms: string | null;
}) {
  const [state, action] = useActionState(updateQuoteDetails, initial);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="quoteId" value={quoteId} />

      <Field label="Title" htmlFor="title" required>
        <Input id="title" name="title" defaultValue={title} required />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="VAT rate"
          htmlFor="vatRate"
          hint="Use 0 for domestic reverse charge work."
        >
          <Input
            id="vatRate"
            name="vatRate"
            inputMode="decimal"
            defaultValue={vatRate}
          />
        </Field>
        <Field label="Valid until" htmlFor="validUntil">
          <Input
            id="validUntil"
            name="validUntil"
            type="date"
            defaultValue={validUntil ? validUntil.slice(0, 10) : ""}
          />
        </Field>
      </div>

      <Field
        label="Notes"
        htmlFor="notes"
        hint="Assumptions and exclusions. The things that stop an argument later."
      >
        <Textarea id="notes" name="notes" defaultValue={notes ?? ""} />
      </Field>

      <Field label="Terms" htmlFor="terms">
        <Textarea id="terms" name="terms" defaultValue={terms ?? ""} />
      </Field>

      <Submit label="Save quote" pendingLabel="Saving..." />
      <Feedback state={state} />
    </form>
  );
}

export function SendQuoteForm({ quoteId }: { quoteId: string }) {
  const [state, action] = useActionState(sendQuote, initial);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="quoteId" value={quoteId} />
      <Submit label="Mark as sent" pendingLabel="Sending..." />
      <p className="text-xs text-navy-500">
        Locks the quote. After this, changes need a new version.
      </p>
      <Feedback state={state} />
    </form>
  );
}

export function RespondForm({ quoteId }: { quoteId: string }) {
  const [state, action] = useActionState(recordQuoteResponse, initial);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="quoteId" value={quoteId} />
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          name="outcome"
          value="ACCEPTED"
          className="border border-green-700 bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
        >
          Customer accepted
        </button>
        <button
          type="submit"
          name="outcome"
          value="DECLINED"
          className="border border-navy-300 bg-white px-4 py-2 text-sm font-semibold text-navy-800 hover:border-navy-800"
        >
          Customer declined
        </button>
      </div>
      <p className="text-xs text-navy-500">
        Accepting also moves the project to scheduled and sets its value.
      </p>
      <Feedback state={state} />
    </form>
  );
}

export function NewVersionForm({ quoteId }: { quoteId: string }) {
  const [state, action] = useActionState(createNewVersion, initial);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="quoteId" value={quoteId} />
      <Submit
        label="Create new version"
        pendingLabel="Creating..."
        variant="outline"
      />
      <p className="text-xs text-navy-500">
        Copies the lines into a fresh draft and supersedes this one. Both stay on
        file.
      </p>
      <Feedback state={state} />
    </form>
  );
}
