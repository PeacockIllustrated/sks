"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { adminSetupToken, hasAdminSetup } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/* ===========================================================================
   Admin bootstrap.

   Creates an account with full privileges, which is the most dangerous thing
   in this codebase. Three properties keep that honest:

   1. The route does not exist unless ADMIN_SETUP_TOKEN is set. Removing the
      feature is deleting one environment variable - no edit, no review, no
      deploy, and no chance of "we will take the button out later" quietly
      never happening. A button on a public page that mints owners is a total
      authentication bypass, and the only version of that worth shipping is one
      that switches off without a code change.
   2. The token is required on submit and compared in constant time.
   3. Every attempt is logged, successful or not.

   Accounts are created through GoTrue's admin API rather than by inserting
   into auth.users. Hand-written inserts leave the token columns NULL, and
   GoTrue scans those into plain Go strings - so the row looks perfect, the
   password verifies, and every login 500s on "converting NULL to string is
   unsupported". That exact bug cost a day on this project.
   =========================================================================== */

export type SetupState = {
  status: "idle" | "error" | "done";
  message?: string;
  email?: string;
};

const schema = z.object({
  token: z.string().min(1, "Enter the setup token"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z
    .string()
    .min(12, "Use at least 12 characters for an account with full access"),
  fullName: z.string().trim().min(1, "Enter a name"),
});

/** Constant-time compare over digests, so length never leaks either. */
function tokenMatches(supplied: string, expected: string): boolean {
  const a = createHash("sha256").update(supplied).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function createAdmin(
  _previous: SetupState,
  formData: FormData,
): Promise<SetupState> {
  const expected = adminSetupToken();
  if (!expected || !hasAdminSetup()) {
    return { status: "error", message: "Setup is not enabled here." };
  }

  const parsed = schema.safeParse({
    token: formData.get("token")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
    fullName: formData.get("fullName")?.toString() ?? "",
  });

  const email = formData.get("email")?.toString() ?? "";

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the details",
      email,
    };
  }

  if (!tokenMatches(parsed.data.token, expected)) {
    console.error(
      `[setup] rejected an admin-creation attempt for ${parsed.data.email}: wrong token`,
    );
    return { status: "error", message: "That token is not right.", email };
  }

  const supabase = createAdminClient();

  /* email_confirm, because there is no inbox to click through on a bootstrap
     account and an unconfirmed one cannot sign in. */
  const { data, error } = await supabase.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName },
  });

  if (error || !data.user) {
    console.error(
      `[setup] could not create ${parsed.data.email}: ${error?.name} status=${error?.status ?? "none"} ${error?.message}`,
    );
    return {
      status: "error",
      message: error?.message ?? "Could not create that account.",
      email,
    };
  }

  /* The trigger on auth.users already made a profile row, at the schema's
     default role of CLIENT. Promoting is a separate write on purpose: the
     default stays least-privilege, and granting OWNER is an explicit act
     rather than something a sign-up can arrange for itself. */
  const { error: promoteError } = await supabase
    .from("sks_profiles")
    .update({
      role: "OWNER",
      full_name: parsed.data.fullName,
      email: parsed.data.email,
    })
    .eq("id", data.user.id);

  if (promoteError) {
    console.error(
      `[setup] created ${parsed.data.email} but could not promote it to OWNER: ${promoteError.message}`,
    );
    return {
      status: "error",
      message:
        "The account was created but could not be given admin access. Check the server logs.",
      email,
    };
  }

  console.warn(
    `[setup] created OWNER account ${parsed.data.email} (${data.user.id}). Remove ADMIN_SETUP_TOKEN now that it is done.`,
  );

  return {
    status: "done",
    message: `${parsed.data.email} can now sign in with full access. Delete ADMIN_SETUP_TOKEN from the deployment to close this page.`,
  };
}
