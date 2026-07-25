# SKS Construction

Multi-trade construction platform. Construction, joinery and roofing under one roof.

Build plan and phase scope: [`BUILD_PLAN.md`](./BUILD_PLAN.md).

## Status

- **Phase 0 foundation** - done. Design tokens, layout system, UI primitives, Supabase clients, role model, full Prisma schema, Phase 1 SQL migration.
- **Phase 1 marketing site** - done. Home, three division pages, about, projects placeholder, contact with working lead capture, sitemap, robots, structured data, 404.
- **Phase 2 operations hub** - leads through to quotes done. Sign-in, role-gated admin, dashboard, leads pipeline, lead-to-project conversion, projects, quotes with line items and versioning. Invoices, Stripe and scheduling are the next slice.
- **Phase 3 client portal** - not started.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev
```

The marketing site renders without any environment variables. The contact form needs Supabase configured before it can save anything.

## Database

Two things own the schema, and the split is deliberate.

1. `supabase/migrations/0001_phase1_leads.sql` is the Phase 1 bootstrap. It creates `sks_profiles` and `sks_leads` with RLS enabled and the role helper function. Run it in the Supabase SQL editor, or with the Supabase CLI.
2. `supabase/migrations/0002_phase2_ops.sql` adds clients, projects, quotes, quote line items and the activity log.
3. `prisma/schema.prisma` is the complete model for all three phases and stays the model of record.

### Testing the database

The migrations and every RLS policy run against a plain Postgres, no Supabase project needed:

```bash
PGHOST=/tmp PGPORT=5433 PGUSER=postgres ./supabase/test/run.sh
```

`supabase/test/00_supabase_shim.sql` recreates just enough of Supabase (the `auth` schema, `auth.uid()`, the anon and authenticated roles) for the real policies to run unchanged. `01_rls_test.sql` asserts client isolation, draft-quote invisibility, self-promotion being blocked, database-computed quote totals, and non-colliding references. Run it after any schema change.

When Phase 2 starts, baseline Prisma against what the SQL migration already created rather than letting the two drift:

```bash
npx prisma migrate diff \
  --from-url "$DIRECT_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/0002_phase2/migration.sql
```

**Known step, do this first:** `npx prisma generate` has not been run in this repository. It could not be, because the environment the scaffold was built in blocks Prisma's binary host. Run it locally before writing any Prisma-backed code. Nothing in Phase 1 imports the Prisma client, so the build is green without it. The schema has not been through `prisma validate` for the same reason, so expect to fix small things on the first generate.

## Architecture note: Prisma and Supabase

Prisma owns the schema. The application does its reads and writes through Supabase JS, not the Prisma client.

That is deliberate. With three roles and a client portal coming, RLS is the right place for access control: a forgotten `where` clause becomes a bug rather than a breach, and the same rules apply however the data is reached. It also means the runtime does not depend on generating a Prisma client, which the original build environment could not do.

If you later want Prisma at runtime, `src/lib/db/queries.ts` is the single seam to swap. Nothing outside it talks to the database.

## Conventions

- Tables carry an `sks_` prefix, so the schema stays portable into a shared Supabase organisation.
- RLS on from the start, never retrofitted. The service-role key is used in exactly one place, the public enquiry action, and `src/lib/supabase/admin.ts` imports `server-only` so misuse becomes a build error.
- Column-level `REVOKE UPDATE` is a no-op while a table-level UPDATE grant exists. The profiles migration revokes the table grant and grants back all columns except `role`, so users cannot promote themselves.
- Square corners, no drop shadows. Depth comes from borders and surface steps.
- British spelling throughout, including in copy. No em-dashes, no emoji, no exclamation marks.
- Fonts are self-hosted from `src/fonts` rather than fetched from Google Fonts, so there is no third-party request at runtime and builds do not depend on that host.

## Content blocked on the client

Everything unknown is `PLACEHOLDER` in `src/lib/site.ts` and renders as an explicit "to be confirmed" rather than invented detail. Grep for `PLACEHOLDER` before launch.

Outstanding: logo, founding year, phone, email, address, company number, VAT number, domain, GA4 measurement ID, trade memberships and accreditations, project photography, service-area boundary, privacy notice.

## Commands

```bash
npm run dev     # development server
npm run build   # production build, includes typecheck
npm run lint    # eslint
```
