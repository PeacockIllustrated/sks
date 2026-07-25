# SKS Construction - build plan

Multi-trade construction business platform. Three divisions under one roof: Construction, Joinery, Roofing. North East UK.

This plan was reconstructed on 25 July 2026 from the recorded project scope, because the original `construction_build_reference.docx` and `BUILD_PLAN.md` were not to hand. Where it states something the original may have settled differently, it is marked **assumption**. Anything marked assumption should be checked against the reference document before it hardens.

**Changed 25 July 2026**: Prisma has been dropped. The original scope said "Supabase Postgres via Prisma"; the build now uses Supabase JS directly with SQL migrations as the source of truth. With three roles and a client portal, RLS is the right enforcement point: a forgotten `where` clause becomes a bug rather than a breach, and the rule holds however the row is reached. It also removes a build dependency and a second schema to keep in step.

Pricing and the commercial relationship sit with Mak. This repository covers the build only.

## What the client is buying

The phases are not arbitrary. Each maps to something SKS wants.

1. **Win more work.** A multi-trade outfit currently reads as three side hustles. The marketing site has to present one credible firm. "Under one roof" is the pitch: one contact, one quote, no subcontractor chain.
2. **Stop losing leads.** Enquiries die in an inbox. An enquiry must carry through to quote, invoice and schedule in one place, with a visible owner and stage.
3. **See the business.** Who is on what next week, which jobs are stalling, what is unbilled.
4. **Look organised to the customer.** The client portal is the trust play and the hook that referrals and maintenance contracts hang off.

Phase 1 is a sales asset. Phase 2 is the phase that changes their working day. Phase 3 is the differentiator.

## Stack

- Next.js App Router, TypeScript strict
- Supabase Postgres, accessed through Supabase JS. No ORM
- Supabase Auth, three roles: owner, staff, client
- Tailwind and shadcn/ui
- Stripe for invoice payment
- Resend for transactional email
- Vercel

Tables carry an `sks_` prefix in line with house convention for shared Supabase organisations, so the schema stays portable if the project is ever moved into a shared instance.

## Brand

- Dark navy `#1A1A2E`, warm gold `#C8973E`
- Plus Jakarta Sans for headings, Inter for body
- Voice: confident, plain English. No jargon, no superlatives, no exclamation marks
- House rules: square corners, no drop shadows

## Phase 0 - foundation (this pass)

- Repository scaffold, TypeScript strict, ESLint
- Design tokens wired into Tailwind v4 theme, fonts loaded via `next/font`
- Layout system: site shell, container, section rhythm, typographic scale
- UI primitives in `src/components/ui` following shadcn conventions, so the shadcn CLI can add to them later
- SQL migrations covering the whole model, all three phases, with RLS written at the same time
- Supabase client helpers for browser, server and middleware
- Role model and route protection helpers
- Environment variable contract in `.env.example`

## Phase 1 - public marketing site

- Home: proposition, the three divisions, proof, call to action
- One page per division: Construction, Joinery, Roofing
- About: the under-one-roof argument, credentials, service area
- Projects: case-study index and detail, seeded from the database once real content exists
- Contact: enquiry form writing to `sks_leads`, notification via Resend
- SEO: metadata, sitemap, robots, `LocalBusiness` and `Service` structured data
- Accessibility: WCAG 2.1 AA, keyboard paths, visible focus, contrast checked against the navy and gold pair

Blocked on the client for real content: logo, founding year, domain, GA4 measurement ID, trade memberships and accreditations, project photography, service-area boundary, company registration and VAT details for the footer. The site ships with clearly marked placeholder content so nothing invented reaches production.

## Phase 2 - internal operations hub

- Auth and role-gated `/admin`
- Leads: inbox, assignment, status pipeline, conversion to project
- Projects: record, division, stage, dates, assigned staff, documents, progress notes
- Quotes: line items, versioning, accept and decline, PDF issue
- Invoices: raise from quote, Stripe payment link, part payment, overdue tracking
- Scheduling: staff assignment across a week view, clash detection
- Dashboard: pipeline value, stalled jobs, unbilled work, week ahead

## Phase 3 - client portal and retention

- Client login scoped to their own projects only
- Progress view, documents, quotes and invoices, pay online
- Referral capture and tracking with attribution back to leads
- Maintenance contracts: recurring schedule, renewal reminders, Stripe subscriptions
- Accounting sync, target package to be confirmed (**assumption**: Xero, since it dominates UK trades)

## Security posture

RLS on every table from the start, not retrofitted, and asserted by `npm run db:test` rather than assumed. The service role key is server-only and never reaches the client bundle. Client-role users must never be able to read another client's rows, which is the single highest-consequence failure mode in this build; that is now tested from a real client session against every table a client can reach, including a second client seeing none of the first client's records. Column-level `REVOKE UPDATE` is a no-op while a table-level UPDATE grant exists, so protected columns are handled by revoking the table grant and granting back all but the protected columns, then verifying.

## Open questions

- Which accounting package, and does Phase 3 need two-way sync or export only
- Does SKS need multi-site or multi-entity, or is it one company with three divisions
- Who administers the account day to day, and does staff mean office only or site teams too
- VAT treatment on quotes, including domestic reverse charge for CIS work, which affects quote and invoice maths
- CIS deductions on subcontractor payments, in or out of scope
