"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hasSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type SignInState = {
  status: "idle" | "error";
  message?: string;
  email?: string;
  /**
   * Which Supabase project this deployment is actually talking to, and what
   * the service said. Shown on failure only.
   *
   * Neither is a secret - the project ref is the public URL and the error code
   * is GoTrue's own vocabulary - and between them they separate the faults that
   * a "wrong password" message cannot. A deployment pointed at the wrong one of
   * five Supabase projects reports a perfectly good account as bad credentials,
   * and there is no way to tell from the outside without being told the ref.
   */
  diagnostic?: string;
};

/** The project ref out of the configured URL, for the diagnostic line. */
function projectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return /https?:\/\/([^.]+)\./.exec(url)?.[1] ?? url ?? "unknown";
}

const NOT_CONFIGURED =
  "Sign-in is not available on this deployment: it has no database connection configured. This is a deployment setting, not your password.";

const UNREACHABLE =
  "We could not reach the sign-in service. This is not your password - please try again shortly.";

const credentials = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export async function signIn(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = credentials.safeParse({
    email: formData.get("email")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
  });

  const email = formData.get("email")?.toString() ?? "";

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check your details",
      email,
    };
  }

  if (!hasSupabaseConfig()) {
    console.error(
      "[sign-in] Supabase is not configured on this deployment. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then redeploy - Vercel only injects environment variables at deploy time, so changing them leaves a running deployment untouched.",
    );
    return { status: "error", message: NOT_CONFIGURED, email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    /* Tell the two failures apart.
     *
     * Previously any error produced the same "those details did not work",
     * which is right for a bad password and actively misleading for anything
     * else: a deployment that could not reach Supabase at all reported itself
     * as a wrong password, and cost real time to diagnose because the one
     * thing that was definitely correct was the password.
     *
     * The distinction is safe. Saying "we could not reach the service" reveals
     * nothing about whether an address is registered, which is the only thing
     * the vague message was protecting. */
    const unreachable =
      error.status === undefined ||
      error.status === 0 ||
      error.status >= 500 ||
      error.name === "AuthRetryableFetchError";

    /* Configuration faults that arrive wearing a 4xx.
     *
     * The first cut of this only diverted 5xx and network errors, which was
     * not enough: a wrong anon key (401), a disabled email provider (400
     * email_provider_disabled) and - the nasty one - a deployment pointed at
     * the wrong Supabase project all come back as ordinary 4xx and so were
     * reported as a wrong password. Being pointed at the wrong project is
     * indistinguishable from bad credentials by status alone, since the
     * account really does not exist over there. That one is caught by naming
     * the project ref below rather than by classifying the error. */
    const misconfigured =
      error.status === 401 ||
      error.status === 403 ||
      error.code === "email_provider_disabled" ||
      error.code === "signup_disabled";

    console.error(
      `[sign-in] failed for ${parsed.data.email} against project ${projectRef()}: ${error.name} status=${error.status ?? "none"} code=${error.code ?? "none"} ${error.message}`,
    );

    return {
      status: "error",
      // Still deliberately vague about *which* half was wrong.
      message: unreachable
        ? UNREACHABLE
        : misconfigured
          ? "This deployment is not configured correctly for sign-in. This is not your password."
          : "Those details did not work. Please try again.",
      diagnostic: `project ${projectRef()} · ${error.code ?? error.name} · ${error.status ?? "no status"}`,
      email,
    };
  }

  revalidatePath("/", "layout");
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/sign-in");
}
