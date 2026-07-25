import "server-only";

import { createClient } from "@supabase/supabase-js";
import { requiredEnv } from "@/lib/supabase/server";

/**
 * Service-role client. Bypasses RLS entirely.
 *
 * Rules, and they are not negotiable:
 * - server only, never imported into a client component
 * - used only where an unauthenticated action must write, which right now
 *   means the public enquiry form and nothing else
 * - never used to read data on behalf of a signed-in user, because that
 *   throws away every RLS guarantee in the schema
 *
 * The `server-only` import above turns a mistake into a build error rather
 * than a leaked key.
 */
export function createAdminClient() {
  return createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
