"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  assignLead,
  convertLead,
  updateLeadStatus,
  type ActionState,
} from "../actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import {
  DIVISION_LABELS,
  DIVISIONS,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_TRANSITIONS,
  type Division,
  type LeadStatus,
} from "@/lib/db/types";

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

export function StatusControl({
  leadId,
  status,
}: {
  leadId: string;
  status: LeadStatus;
}) {
  const [state, action] = useActionState(updateLeadStatus, initial);
  const [next, setNext] = useState<string>("");

  const options = LEAD_STATUS_TRANSITIONS[status];

  if (options.length === 0) {
    return (
      <p className="text-sm text-navy-600">
        This lead is {LEAD_STATUS_LABELS[status].toLowerCase()}. No further status
        changes apply.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="leadId" value={leadId} />

      <Field label="Move to" htmlFor="status">
        <Select
          id="status"
          name="status"
          value={next}
          onChange={(event) => setNext(event.target.value)}
          required
        >
          <option value="">Choose a status</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {LEAD_STATUS_LABELS[option]}
            </option>
          ))}
        </Select>
      </Field>

      {next === "LOST" ? (
        <Field
          label="Why was it lost?"
          htmlFor="lostReason"
          hint="Worth recording. Patterns here are what tell you to change something."
        >
          <Input id="lostReason" name="lostReason" maxLength={500} />
        </Field>
      ) : null}

      <Submit label="Update status" pendingLabel="Updating..." />
      <Feedback state={state} />
    </form>
  );
}

export function OwnerControl({
  leadId,
  ownerId,
  staff,
}: {
  leadId: string;
  ownerId: string | null;
  staff: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(assignLead, initial);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="leadId" value={leadId} />
      <Field label="Owner" htmlFor="ownerId">
        <Select id="ownerId" name="ownerId" defaultValue={ownerId ?? ""}>
          <option value="">Unassigned</option>
          {staff.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </Select>
      </Field>
      <Submit label="Save owner" pendingLabel="Saving..." />
      <Feedback state={state} />
    </form>
  );
}

export function ConvertControl({
  leadId,
  defaultTitle,
  defaultDivision,
}: {
  leadId: string;
  defaultTitle: string;
  defaultDivision: Division | null;
}) {
  const [state, action] = useActionState(convertLead, initial);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div>
        <Button size="sm" onClick={() => setOpen(true)}>
          Convert to project
        </Button>
        <p className="mt-2 text-xs text-navy-500">
          Creates the client record if it does not exist, then opens the project.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="leadId" value={leadId} />

      <Field label="Project title" htmlFor="title" required>
        <Input id="title" name="title" defaultValue={defaultTitle} required />
      </Field>

      <Field label="Division" htmlFor="division" required>
        <Select
          id="division"
          name="division"
          defaultValue={defaultDivision ?? "CONSTRUCTION"}
          required
        >
          {DIVISIONS.map((division) => (
            <option key={division} value={division}>
              {DIVISION_LABELS[division]}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Company name"
        htmlFor="companyName"
        hint="Leave blank for a domestic customer."
      >
        <Input id="companyName" name="companyName" />
      </Field>

      <div className="flex gap-2">
        <Submit label="Create project" pendingLabel="Creating..." />
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
