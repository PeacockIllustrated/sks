/**
 * Environment access.
 *
 * Every variable is read by a static `process.env.NAME` expression. Dynamic
 * lookups like `process.env[name]` do not survive bundling: the bundler
 * replaces `process.env` with an object containing only the keys it saw
 * referenced literally, so an indexed read finds nothing and the app fails at
 * runtime with a "missing variable" error even though the variable is set.
 */

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

/**
 * A Supabase sub-API path, pasted onto the end of the project URL.
 *
 * The single most common way to get this variable wrong, because those are the
 * URLs that appear in documentation and in the dashboard's own examples. The
 * client appends its own `/auth/v1/...`, so the request goes to
 * `/auth/v1/auth/v1/token` and the project answers 404 - which the sign-in
 * form then reports as a wrong password, since a 404 carries no hint that the
 * account was never looked for.
 */
const SUB_API = /\/(auth|rest|storage|realtime|functions)\/v\d+$/;

/**
 * The project URL, with a pasted sub-API path or trailing slashes removed.
 *
 * Normalising rather than rejecting: every one of these values names the right
 * project, and the alternative is a site that will not sign anybody in until
 * somebody edits an environment variable they have no reason to suspect.
 */
export function supabaseUrl(): string {
  const raw = required(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_URL",
  ).trim();

  const normalised = raw.replace(/\/+$/, "").replace(SUB_API, "");

  if (normalised !== raw.replace(/\/+$/, "")) {
    console.warn(
      `[env] NEXT_PUBLIC_SUPABASE_URL is set to "${raw}", which has a Supabase sub-API path on the end. The client appends its own, so requests would 404. Using "${normalised}". Set the bare project URL to silence this.`,
    );
  }

  return normalised;
}

export function supabaseAnonKey(): string {
  return required(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
}

export function supabaseServiceRoleKey(): string {
  return required(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    "SUPABASE_SERVICE_ROLE_KEY",
  );
}

/** True when Supabase is configured. Lets the marketing site run without it. */
export function hasSupabaseConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
