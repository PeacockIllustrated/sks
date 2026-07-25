import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseConfig, supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * Refreshes the Supabase session cookie on every request so Server Components
 * see a live session. Route protection itself lives in `src/lib/auth.ts`,
 * because the proxy should not be the only gate.
 *
 * Named `proxy`, not `middleware`. Next 16 deprecated the middleware file
 * convention and renamed it, and the proxy runtime is always nodejs.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Phase 1 deploys before Supabase is wired. Do not break the marketing site.
  if (!hasSupabaseConfig()) return response;

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)",
  ],
};
