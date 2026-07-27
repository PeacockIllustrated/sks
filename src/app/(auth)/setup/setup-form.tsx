"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createAdmin, type SetupState } from "./actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

const initialState: SetupState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Creating..." : "Create admin account"}
    </Button>
  );
}

export function SetupForm() {
  const [state, formAction] = useActionState(createAdmin, initialState);

  if (state.status === "done") {
    return (
      <div
        role="status"
        className="border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900"
      >
        <p className="font-semibold">Account created</p>
        <p className="mt-1">{state.message}</p>
        <p className="mt-3">
          <Link href="/sign-in" className="font-semibold underline">
            Go to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {state.message}
        </div>
      ) : null}

      <Field label="Setup token" htmlFor="token" required>
        <Input id="token" name="token" type="password" required />
      </Field>

      <Field label="Name" htmlFor="fullName" required>
        <Input id="fullName" name="fullName" type="text" required />
      </Field>

      <Field label="Email" htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="off"
          defaultValue={state.email}
          required
        />
      </Field>

      <Field label="Password" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
      </Field>

      <SubmitButton />
    </form>
  );
}
