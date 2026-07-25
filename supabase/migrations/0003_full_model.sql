-- SKS Construction, remaining model.
--
-- Completes the schema, so `supabase/migrations` is the whole model: invoicing
-- and payments, scheduling, progress notes, documents, and the Phase 3
-- retention tables.
--
-- Nothing in the application reads these yet. They are defined now so the
-- shape of the data is settled and RLS is written once, rather than bolted on
-- when Phase 3 is being rushed.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type sks_invoice_status as enum (
    'DRAFT', 'SENT', 'PART_PAID', 'PAID', 'OVERDUE', 'VOID'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type sks_payment_method as enum (
    'STRIPE', 'BANK_TRANSFER', 'CASH', 'CHEQUE', 'OTHER'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type sks_contract_status as enum (
    'ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type sks_referral_status as enum (
    'RECEIVED', 'CONTACTED', 'CONVERTED', 'REWARDED', 'CLOSED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type sks_document_kind as enum (
    'PHOTO', 'DRAWING', 'CERTIFICATE', 'QUOTE_PDF', 'INVOICE_PDF',
    'CONTRACT', 'OTHER'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Invoices
-- ---------------------------------------------------------------------------

create table if not exists public.sks_invoices (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  project_id uuid references public.sks_projects (id) on delete set null,
  quote_id uuid references public.sks_quotes (id) on delete set null,
  client_id uuid not null references public.sks_clients (id) on delete restrict,
  status sks_invoice_status not null default 'DRAFT',
  subtotal numeric(12, 2) not null default 0,
  vat_rate numeric(5, 2) not null default 20,
  vat_amount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  amount_paid numeric(12, 2) not null default 0,
  issue_date timestamptz,
  due_date timestamptz,
  paid_at timestamptz,
  stripe_payment_intent_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sks_invoices_status_due_idx
  on public.sks_invoices (status, due_date);
create index if not exists sks_invoices_client_idx
  on public.sks_invoices (client_id);

alter table public.sks_invoices enable row level security;

drop policy if exists "invoices: staff all" on public.sks_invoices;
create policy "invoices: staff all"
  on public.sks_invoices for all
  using (public.sks_current_role() in ('OWNER', 'STAFF'))
  with check (public.sks_current_role() in ('OWNER', 'STAFF'));

-- Same reasoning as quotes: a draft invoice is working material.
drop policy if exists "invoices: client read own issued" on public.sks_invoices;
create policy "invoices: client read own issued"
  on public.sks_invoices for select
  using (
    client_id = public.sks_current_client_id()
    and status <> 'DRAFT'
  );

create table if not exists public.sks_invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.sks_invoices (id) on delete cascade,
  position integer not null default 0,
  description text not null,
  quantity numeric(10, 2) not null default 1,
  unit text not null default 'item',
  unit_price numeric(12, 2) not null,
  line_total numeric(12, 2) not null
);

create index if not exists sks_invoice_line_items_invoice_idx
  on public.sks_invoice_line_items (invoice_id, position);

alter table public.sks_invoice_line_items enable row level security;

drop policy if exists "invoice items: staff all" on public.sks_invoice_line_items;
create policy "invoice items: staff all"
  on public.sks_invoice_line_items for all
  using (public.sks_current_role() in ('OWNER', 'STAFF'))
  with check (public.sks_current_role() in ('OWNER', 'STAFF'));

drop policy if exists "invoice items: client read own" on public.sks_invoice_line_items;
create policy "invoice items: client read own"
  on public.sks_invoice_line_items for select
  using (
    exists (
      select 1 from public.sks_invoices i
      where i.id = invoice_id
        and i.client_id = public.sks_current_client_id()
        and i.status <> 'DRAFT'
    )
  );

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------

create table if not exists public.sks_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.sks_invoices (id) on delete cascade,
  amount numeric(12, 2) not null,
  method sks_payment_method not null default 'STRIPE',
  reference text,
  -- Unique so a replayed Stripe webhook cannot record the same payment twice.
  stripe_event_id text unique,
  received_at timestamptz not null default now()
);

create index if not exists sks_payments_invoice_idx
  on public.sks_payments (invoice_id);

alter table public.sks_payments enable row level security;

drop policy if exists "payments: staff all" on public.sks_payments;
create policy "payments: staff all"
  on public.sks_payments for all
  using (public.sks_current_role() in ('OWNER', 'STAFF'))
  with check (public.sks_current_role() in ('OWNER', 'STAFF'));

drop policy if exists "payments: client read own" on public.sks_payments;
create policy "payments: client read own"
  on public.sks_payments for select
  using (
    exists (
      select 1 from public.sks_invoices i
      where i.id = invoice_id
        and i.client_id = public.sks_current_client_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Invoice totals, computed rather than trusted
-- ---------------------------------------------------------------------------

create or replace function public.sks_recalculate_invoice(target_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  computed_subtotal numeric(12, 2);
  rate numeric(5, 2);
  paid numeric(12, 2);
  computed_total numeric(12, 2);
begin
  select coalesce(sum(line_total), 0) into computed_subtotal
    from public.sks_invoice_line_items where invoice_id = target_invoice_id;

  select vat_rate into rate
    from public.sks_invoices where id = target_invoice_id;

  select coalesce(sum(amount), 0) into paid
    from public.sks_payments where invoice_id = target_invoice_id;

  computed_total := computed_subtotal
    + round(computed_subtotal * coalesce(rate, 0) / 100, 2);

  update public.sks_invoices
     set subtotal = computed_subtotal,
         vat_amount = round(computed_subtotal * coalesce(rate, 0) / 100, 2),
         total = computed_total,
         amount_paid = paid,
         -- Only settle an invoice that has actually been issued. A draft that
         -- happens to sum to zero must not mark itself paid.
         status = case
           when status in ('DRAFT', 'VOID') then status
           when paid >= computed_total and computed_total > 0 then 'PAID'
           when paid > 0 then 'PART_PAID'
           else status
         end,
         paid_at = case
           when paid >= computed_total and computed_total > 0 then coalesce(paid_at, now())
           else null
         end,
         updated_at = now()
   where id = target_invoice_id;
end;
$$;

grant execute on function public.sks_recalculate_invoice(uuid) to authenticated;

create or replace function public.sks_invoice_line_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    new.line_total := round(new.quantity * new.unit_price, 2);
    return new;
  end if;
  perform public.sks_recalculate_invoice(old.invoice_id);
  return old;
end;
$$;

drop trigger if exists sks_invoice_line_before on public.sks_invoice_line_items;
create trigger sks_invoice_line_before
  before insert or update on public.sks_invoice_line_items
  for each row execute function public.sks_invoice_line_changed();

drop trigger if exists sks_invoice_line_delete on public.sks_invoice_line_items;
create trigger sks_invoice_line_delete
  after delete on public.sks_invoice_line_items
  for each row execute function public.sks_invoice_line_changed();

create or replace function public.sks_invoice_recalc_after()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sks_recalculate_invoice(
    coalesce(new.invoice_id, old.invoice_id)
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists sks_invoice_line_after on public.sks_invoice_line_items;
create trigger sks_invoice_line_after
  after insert or update on public.sks_invoice_line_items
  for each row execute function public.sks_invoice_recalc_after();

drop trigger if exists sks_payment_after on public.sks_payments;
create trigger sks_payment_after
  after insert or update or delete on public.sks_payments
  for each row execute function public.sks_invoice_recalc_after();

create sequence if not exists public.sks_invoice_reference_seq start 1000;

create or replace function public.sks_next_invoice_reference()
returns text
language sql
volatile
as $$
  select 'SKS-I-' || lpad(nextval('public.sks_invoice_reference_seq')::text, 5, '0');
$$;

grant execute on function public.sks_next_invoice_reference() to authenticated;

-- ---------------------------------------------------------------------------
-- Scheduling
-- ---------------------------------------------------------------------------

create table if not exists public.sks_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.sks_projects (id) on delete cascade,
  staff_id uuid not null references public.sks_profiles (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now(),
  constraint sks_assignments_dates check (ends_at > starts_at)
);

create index if not exists sks_assignments_staff_idx
  on public.sks_assignments (staff_id, starts_at);
create index if not exists sks_assignments_project_idx
  on public.sks_assignments (project_id, starts_at);

alter table public.sks_assignments enable row level security;

-- Scheduling is internal. Clients get no policy at all, deliberately: who is
-- on site and when is not their business, and a portal leak here would be
-- awkward rather than merely embarrassing.
drop policy if exists "assignments: staff all" on public.sks_assignments;
create policy "assignments: staff all"
  on public.sks_assignments for all
  using (public.sks_current_role() in ('OWNER', 'STAFF'))
  with check (public.sks_current_role() in ('OWNER', 'STAFF'));

-- ---------------------------------------------------------------------------
-- Progress notes
-- ---------------------------------------------------------------------------

create table if not exists public.sks_project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.sks_projects (id) on delete cascade,
  author_id uuid references public.sks_profiles (id) on delete set null,
  body text not null,
  is_client_visible boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists sks_project_updates_project_idx
  on public.sks_project_updates (project_id, created_at desc);

alter table public.sks_project_updates enable row level security;

drop policy if exists "updates: staff all" on public.sks_project_updates;
create policy "updates: staff all"
  on public.sks_project_updates for all
  using (public.sks_current_role() in ('OWNER', 'STAFF'))
  with check (public.sks_current_role() in ('OWNER', 'STAFF'));

-- Two conditions, both required: the note is marked visible AND the project
-- belongs to the caller. Internal notes stay internal.
drop policy if exists "updates: client read visible" on public.sks_project_updates;
create policy "updates: client read visible"
  on public.sks_project_updates for select
  using (
    is_client_visible = true
    and exists (
      select 1 from public.sks_projects p
      where p.id = project_id
        and p.client_id = public.sks_current_client_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------------

create table if not exists public.sks_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.sks_projects (id) on delete cascade,
  uploader_id uuid references public.sks_profiles (id) on delete set null,
  kind sks_document_kind not null default 'OTHER',
  title text not null,
  storage_path text not null,
  mime_type text,
  size_bytes integer,
  is_client_visible boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists sks_documents_project_idx
  on public.sks_documents (project_id, kind);

alter table public.sks_documents enable row level security;

drop policy if exists "documents: staff all" on public.sks_documents;
create policy "documents: staff all"
  on public.sks_documents for all
  using (public.sks_current_role() in ('OWNER', 'STAFF'))
  with check (public.sks_current_role() in ('OWNER', 'STAFF'));

drop policy if exists "documents: client read visible" on public.sks_documents;
create policy "documents: client read visible"
  on public.sks_documents for select
  using (
    is_client_visible = true
    and exists (
      select 1 from public.sks_projects p
      where p.id = project_id
        and p.client_id = public.sks_current_client_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Phase 3 retention
-- ---------------------------------------------------------------------------

create table if not exists public.sks_maintenance_contracts (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  client_id uuid not null references public.sks_clients (id) on delete restrict,
  project_id uuid references public.sks_projects (id) on delete set null,
  title text not null,
  division sks_division,
  status sks_contract_status not null default 'ACTIVE',
  interval_months integer not null default 12,
  amount numeric(12, 2) not null,
  start_date timestamptz not null,
  end_date timestamptz,
  next_visit_at timestamptz,
  stripe_subscription_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sks_contracts_interval check (interval_months between 1 and 120)
);

create index if not exists sks_contracts_status_idx
  on public.sks_maintenance_contracts (status, next_visit_at);

alter table public.sks_maintenance_contracts enable row level security;

drop policy if exists "contracts: staff all" on public.sks_maintenance_contracts;
create policy "contracts: staff all"
  on public.sks_maintenance_contracts for all
  using (public.sks_current_role() in ('OWNER', 'STAFF'))
  with check (public.sks_current_role() in ('OWNER', 'STAFF'));

drop policy if exists "contracts: client read own" on public.sks_maintenance_contracts;
create policy "contracts: client read own"
  on public.sks_maintenance_contracts for select
  using (client_id = public.sks_current_client_id());

create table if not exists public.sks_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references public.sks_clients (id) on delete set null,
  referee_name text not null,
  referee_email text,
  referee_phone text,
  note text,
  status sks_referral_status not null default 'RECEIVED',
  reward_amount numeric(12, 2),
  rewarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sks_referrals_status_idx
  on public.sks_referrals (status);

alter table public.sks_referrals enable row level security;

drop policy if exists "referrals: staff all" on public.sks_referrals;
create policy "referrals: staff all"
  on public.sks_referrals for all
  using (public.sks_current_role() in ('OWNER', 'STAFF'))
  with check (public.sks_current_role() in ('OWNER', 'STAFF'));

-- A client may see referrals they made, and make new ones, but may not edit
-- the status or the reward. Those are decisions for SKS.
drop policy if exists "referrals: client read own" on public.sks_referrals;
create policy "referrals: client read own"
  on public.sks_referrals for select
  using (referrer_id = public.sks_current_client_id());

drop policy if exists "referrals: client insert own" on public.sks_referrals;
create policy "referrals: client insert own"
  on public.sks_referrals for insert
  with check (referrer_id = public.sks_current_client_id());

revoke update on public.sks_referrals from authenticated;
grant update (referee_name, referee_email, referee_phone, note, updated_at)
  on public.sks_referrals to authenticated;

-- Wire the lead to referral link that Phase 1 left loose.
do $$ begin
  alter table public.sks_leads
    add constraint sks_leads_referral_id_fkey
    foreign key (referral_id) references public.sks_referrals (id) on delete set null;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Site settings
--
-- Editable copy, so the client can change a phone number without a deploy.
-- Readable by anyone, writable by owners only.
-- ---------------------------------------------------------------------------

create table if not exists public.sks_site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.sks_site_settings enable row level security;

drop policy if exists "settings: public read" on public.sks_site_settings;
create policy "settings: public read"
  on public.sks_site_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "settings: owner write" on public.sks_site_settings;
create policy "settings: owner write"
  on public.sks_site_settings for all
  using (public.sks_current_role() = 'OWNER')
  with check (public.sks_current_role() = 'OWNER');

-- ---------------------------------------------------------------------------
-- Touch updated_at
-- ---------------------------------------------------------------------------

drop trigger if exists sks_invoices_touch on public.sks_invoices;
create trigger sks_invoices_touch
  before update on public.sks_invoices
  for each row execute function public.sks_touch_updated_at();

drop trigger if exists sks_contracts_touch on public.sks_maintenance_contracts;
create trigger sks_contracts_touch
  before update on public.sks_maintenance_contracts
  for each row execute function public.sks_touch_updated_at();

drop trigger if exists sks_referrals_touch on public.sks_referrals;
create trigger sks_referrals_touch
  before update on public.sks_referrals
  for each row execute function public.sks_touch_updated_at();

drop trigger if exists sks_settings_touch on public.sks_site_settings;
create trigger sks_settings_touch
  before update on public.sks_site_settings
  for each row execute function public.sks_touch_updated_at();
