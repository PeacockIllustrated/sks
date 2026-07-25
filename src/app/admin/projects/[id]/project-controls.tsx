"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createQuoteForProject,
  updateProject,
  type ActionState,
} from "../actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { PROJECT_STAGES, PROJECT_STAGE_LABELS, type ProjectStage } from "@/lib/db/types";

const initial: ActionState = { status: "idle" };

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
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

/** Dates come back as ISO timestamps; the date input wants yyyy-mm-dd. */
function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

export function ProjectForm({
  projectId,
  stage,
  startDate,
  endDate,
  contractValue,
  siteAddress,
}: {
  projectId: string;
  stage: ProjectStage;
  startDate: string | null;
  endDate: string | null;
  contractValue: string | null;
  siteAddress: string | null;
}) {
  const [state, action] = useActionState(updateProject, initial);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />

      <Field label="Stage" htmlFor="stage" required>
        <Select id="stage" name="stage" defaultValue={stage} required>
          {PROJECT_STAGES.map((value) => (
            <option key={value} value={value}>
              {PROJECT_STAGE_LABELS[value]}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Start date" htmlFor="startDate">
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={toDateInput(startDate)}
          />
        </Field>
        <Field label="End date" htmlFor="endDate">
          <Input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={toDateInput(endDate)}
          />
        </Field>
      </div>

      <Field
        label="Contract value"
        htmlFor="contractValue"
        hint="Excluding VAT. Leave blank until a quote is accepted."
      >
        <Input
          id="contractValue"
          name="contractValue"
          inputMode="decimal"
          defaultValue={contractValue ?? ""}
        />
      </Field>

      <Field label="Site address" htmlFor="siteAddress">
        <Input id="siteAddress" name="siteAddress" defaultValue={siteAddress ?? ""} />
      </Field>

      <Submit label="Save project" pendingLabel="Saving..." />
      <Feedback state={state} />
    </form>
  );
}

export function NewQuoteControl({
  projectId,
  defaultTitle,
}: {
  projectId: string;
  defaultTitle: string;
}) {
  const [state, action] = useActionState(createQuoteForProject, initial);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        New quote
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      <Field label="Quote title" htmlFor="title" required>
        <Input id="title" name="title" defaultValue={defaultTitle} required />
      </Field>
      <div className="flex gap-2">
        <Submit label="Create draft" pendingLabel="Creating..." />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
