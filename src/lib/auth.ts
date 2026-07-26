import "server-only";

import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const ROLES = ["OWNER", "STAFF", "CLIENT"] as const;
export type Role = (typeof ROLES)[number];

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
  fullName: string | null;
};

function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Returns the signed-in user with their role, or null. Never throws.
 *
 *  "Never throws" was not true when Supabase was unconfigured: `createClient`
 *  reaches for a required variable and throws, so every route that asked who
 *  the user was returned a bare 500 - including the sign-in page itself, which
 *  meant the form could not even be rendered, let alone submitted. The
 *  marketing site already had a guard for exactly this; it just was not
 *  applied here. */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!hasSupabaseConfig()) return null;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("sks_profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single();

  // Default to the least privileged role if the profile row is missing or
  // malformed. Failing closed matters more than a helpful error here.
  const role: Role = isRole(profile?.role) ? profile.role : "CLIENT";

  return {
    id: user.id,
    email: profile?.email ?? user.email ?? "",
    role,
    fullName: profile?.full_name ?? null,
  };
}

/** Phase 2 route guard. Redirects rather than throwing. */
export async function requireRole(allowed: readonly Role[]): Promise<SessionUser> {
  const user = await getSessionUser();

  if (!user) redirect("/sign-in");
  if (!allowed.includes(user.role)) redirect("/");

  return user;
}

export const requireStaff = () => requireRole(["OWNER", "STAFF"]);
export const requireOwner = () => requireRole(["OWNER"]);
