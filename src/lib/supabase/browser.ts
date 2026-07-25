import { createBrowserClient } from "@supabase/ssr";
import { type SupabaseClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

let client: SupabaseClient | undefined;

/** Browser Supabase client. Anon key only, RLS applies. */
export function createClient(): SupabaseClient {
  client ??= createBrowserClient(supabaseUrl(), supabaseAnonKey());
  return client;
}
