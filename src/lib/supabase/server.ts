import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Request-scoped Supabase client. Runs as the signed-in user, so RLS applies.
 * This is the client almost everything should use.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component. Middleware refreshes the session,
            // so this is safe to ignore.
          }
        },
      },
    },
  );
}

export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
