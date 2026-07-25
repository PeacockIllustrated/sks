# SKS Construction

Multi-trade construction platform. Construction, joinery and roofing under one roof.

Build plan and phase scope: [`BUILD_PLAN.md`](./BUILD_PLAN.md).

## Status

- **Phase 0 foundation** - done. Design tokens, layout system, UI primitives, Supabase clients, role model, SQL migrations covering the whole model.
- **Phase 1 marketing site** - done. Home, three division pages, about, projects placeholder, contact with working lead capture, sitemap, robots, structured data, 404.
- **Phase 2 operations hub** - leads through to quotes done. Sign-in, role-gated admin, dashboard, leads pipeline, lead-to-project conversion, projects, quotes with line items and versioning. Invoices, Stripe and scheduling are the next slice.
- **Phase 3 client portal** - not started, but its tables and policies exist and are tested.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev
```

The marketing site renders without any environment variables. The contact form needs Supabase configured before it can save anything.

## Database

`supabase/migrations` is the single source of truth for the schema. There is no ORM: the application talks to Postgres through Supabase JS, and RLS does the access control.

| Migration | What it adds |
| --- | --- |
| `0001_phase1_leads.sql` | Profiles and leads, roles, the role helper, RLS |
| `0002_phase2_ops.sql` | Clients, projects, quotes, quote line items, activity log |
| `0003_full_model.sql` | Invoices, invoice lines, payments, assignments, progress notes, documents, maintenance contracts, referrals, site settings |

Apply them in order in the Supabase SQL editor, or with the CLI:

```bash
supabase link --project-ref <ref>
supabase db push
```

Migrations 0001 and 0002 are what the application currently reads. 0003 defines the rest of the model, including everything Phase 3 needs, so the shape is settled and the policies are written once rather than bolted on later.

### Testing the database

Every migration and every policy runs against a plain Postgres, no Supabase project needed:

```bash
PGHOST=/tmp PGPORT=5433 PGUSER=postgres npm run db:test
```

`supabase/test/00_supabase_shim.sql` recreates just enough of Supabase (the `auth` schema, `auth.uid()`, the anon and authenticated roles) for the real policies to run unchanged. The assertions then check, among other things:

- a client sees only their own records, and a second client sees none of the first client's
- draft quotes and draft invoices stay invisible to clients
- internal progress notes and documents stay internal
- clients cannot read the schedule at all, promote themselves, or set their own referral reward
- quote and invoice totals are computed by the database, not trusted from the caller
- a replayed Stripe event cannot record the same payment twice
- references come from sequences, so they cannot collide or be reused after a delete

Run it after any schema change. 33 assertions, and a failure raises rather than warns.

### Types

`src/lib/db/types.ts` is hand-written and must be kept in step with the migrations. Once a hosted project exists:

```bash
SUPABASE_PROJECT_ID=<ref> npm run db:types
```

That writes `src/lib/db/database.types.ts` from the live schema. Move the row types onto those and keep `types.ts` for the enums, labels and transition maps, which are domain knowledge rather than schema.

## Conventions

- Tables carry an `sks_` prefix, so the schema stays portable into a shared Supabase organisation.
- No ORM. `src/lib/db/queries.ts` is the only module that touches the database, so there is one place to look and one place to change.
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
