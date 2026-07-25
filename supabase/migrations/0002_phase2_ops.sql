-- SKS Construction, Phase 2 operations hub.
--
-- Adds clients, projects, quotes and quote line items, plus the activity log.
-- Mirrors prisma/schema.prisma for these tables. Prisma still owns the model
-- of record; this file is what actually runs until `prisma migrate` takes over.
--
-- Everything is RLS-first. Staff and owners see all rows. Clients see only
-- their own, which is the highest-consequence rule in the build and is tested
-- explicitly rather than assumed.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type sks_project_stage as enum (
    'ENQUIRY', 'SURVEY', 'QUOTED', 'SCHEDULED', 'IN_PROGRESS',
    'SNAGGING', 'COMPLETE', 'ON_HOLD', 'CANCELLED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type sks_quote_status as enum (
    'DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'SUPERSEDED'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Clients
-- ---------------------------------------------------------------------------

create table if not exists public.sks_clients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.sks_profiles (id) on delete set null,
  company_name text,
  contact_name text not null,
  email text not null,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  postcode text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sks_clients_email_idx on public.sks_clients (email);

alter table public.sks_clients enable row level security;

-- Helper: the caller's client row, used by every client-scoped policy.
-- Security definer so policies do not recurse into the tables they guard.
-- Defined after sks_clients exists, because the function body is parsed now.
create or replace function public.sks_current_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.sks_clients where profile_id = auth.uid();
$$;

grant execute on function public.sks_current_client_id() to authenticated;

drop policy if exists "clients: staff all" on public.sks_clients;
create policy "clients: staff all"
  on public.sks_clients for all
  using (public.sks_current_role() in ('OWNER', 'STAFF'))
  with check (public.sks_current_role() in ('OWNER', 'STAFF'));

drop policy if exists "clients: read own" on public.sks_clients;
create policy "clients: read own"
  on public.sks_clients for select
  using (profile_id = auth.uid());

-- Now that clients exist, wire the lead foreign key that Phase 1 left loose.
do $$ begin
  alter table public.sks_leads
    add constraint sks_leads_client_id_fkey
    foreign key (client_id) references public.sks_clients (id) on delete set null;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------

create table if not exists public.sks_projects (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  client_id uuid not null references public.sks_clients (id) on delete restrict,
  lead_id uuid unique references public.sks_leads (id) on delete set null,
  manager_id uuid references public.sks_profiles (id) on delete set null,
  title text not null,
  division sks_division not null,
  stage sks_project_stage not null default 'ENQUIRY',
  description text,
  site_address text,
  site_postcode text,
  start_date timestamptz,
  end_date timestamptz,
  contract_value numeric(12, 2),
  is_published boolean not null default false,
  slug text unique,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sks_projects_stage_start_idx
  on public.sks_projects (stage, start_date);
create index if not exists sks_projects_division_idx
  on public.sks_projects (division);
create index if not exists sks_projects_published_idx
  on public.sks_projects (is_published);

alter table public.sks_projects enable row level security;

drop policy if exists "projects: staff all" on public.sks_projects;
create policy "projects: staff all"
  on public.sks_projects for all
  using (public.sks_current_role() in ('OWNER', 'STAFF'))
  with check (public.sks_current_role() in ('OWNER', 'STAFF'));

drop policy if exists "projects: client read own" on public.sks_projects;
create policy "projects: client read own"
  on public.sks_projects for select
  using (client_id = public.sks_current_client_id());

-- The public marketing site reads published case studies anonymously.
drop policy if exists "projects: public read published" on public.sks_projects;
create policy "projects: public read published"
  on public.sks_projects for select
  to anon, authenticated
  using (is_published = true);

-- ---------------------------------------------------------------------------
-- Quotes
-- ---------------------------------------------------------------------------

create table if not exists public.sks_quotes (
  id uuid primary key default gen_random_uuid(),
  reference text not null,
  version integer not null default 1,
  project_id uuid references public.sks_projects (id) on delete set null,
  client_id uuid not null references public.sks_clients (id) on delete restrict,
  author_id uuid references public.sks_profiles (id) on delete set null,
  status sks_quote_status not null default 'DRAFT',
  title text not null,
  notes text,
  terms text,
  subtotal numeric(12, 2) not null default 0,
  vat_rate numeric(5, 2) not null default 20,
  vat_amount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  valid_until timestamptz,
  sent_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reference, version)
);

create index if not exists sks_quotes_status_idx on public.sks_quotes (status);
create index if not exists sks_quotes_project_idx on public.sks_quotes (project_id);

alter table public.sks_quotes enable row level security;

drop policy if exists "quotes: staff all" on public.sks_quotes;
create policy "quotes: staff all"
  on public.sks_quotes for all
  using (public.sks_current_role() in ('OWNER', 'STAFF'))
  with check (public.sks_current_role() in ('OWNER', 'STAFF'));

-- Clients see their own quotes, but never a draft. A draft is working
-- material and showing it to the customer would be worse than showing nothing.
drop policy if exists "quotes: client read own sent" on public.sks_quotes;
create policy "quotes: client read own sent"
  on public.sks_quotes for select
  using (
    client_id = public.sks_current_client_id()
    and status <> 'DRAFT'
  );

-- ---------------------------------------------------------------------------
-- Quote line items
-- ---------------------------------------------------------------------------

create table if not exists public.sks_quote_line_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.sks_quotes (id) on delete cascade,
  position integer not null default 0,
  description text not null,
  quantity numeric(10, 2) not null default 1,
  unit text not null default 'item',
  unit_price numeric(12, 2) not null,
  line_total numeric(12, 2) not null
);

create index if not exists sks_quote_line_items_quote_idx
  on public.sks_quote_line_items (quote_id, position);

alter table public.sks_quote_line_items enable row level security;

drop policy if exists "quote items: staff all" on public.sks_quote_line_items;
create policy "quote items: staff all"
  on public.sks_quote_line_items for all
  using (public.sks_current_role() in ('OWNER', 'STAFF'))
  with check (public.sks_current_role() in ('OWNER', 'STAFF'));

drop policy if exists "quote items: client read own" on public.sks_quote_line_items;
create policy "quote items: client read own"
  on public.sks_quote_line_items for select
  using (
    exists (
      select 1 from public.sks_quotes q
      where q.id = quote_id
        and q.client_id = public.sks_current_client_id()
        and q.status <> 'DRAFT'
    )
  );

-- ---------------------------------------------------------------------------
-- Activity log
-- ---------------------------------------------------------------------------

create table if not exists public.sks_activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.sks_profiles (id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sks_activity_entity_idx
  on public.sks_activity_log (entity_type, entity_id, created_at desc);

alter table public.sks_activity_log enable row level security;

drop policy if exists "activity: staff read" on public.sks_activity_log;
create policy "activity: staff read"
  on public.sks_activity_log for select
  using (public.sks_current_role() in ('OWNER', 'STAFF'));

drop policy if exists "activity: staff insert" on public.sks_activity_log;
create policy "activity: staff insert"
  on public.sks_activity_log for insert
  with check (public.sks_current_role() in ('OWNER', 'STAFF'));

-- ---------------------------------------------------------------------------
-- Reference number generation
--
-- Sequences rather than counting rows. Counting races under concurrency and
-- reuses references after a delete, which is exactly the kind of bug that
-- surfaces months later on a duplicate quote number.
-- ---------------------------------------------------------------------------

create sequence if not exists public.sks_project_reference_seq start 1000;
create sequence if not exists public.sks_quote_reference_seq start 1000;

create or replace function public.sks_next_project_reference()
returns text
language sql
volatile
as $$
  select 'SKS-P-' || lpad(nextval('public.sks_project_reference_seq')::text, 5, '0');
$$;

create or replace function public.sks_next_quote_reference()
returns text
language sql
volatile
as $$
  select 'SKS-Q-' || lpad(nextval('public.sks_quote_reference_seq')::text, 5, '0');
$$;

grant execute on function public.sks_next_project_reference() to authenticated;
grant execute on function public.sks_next_quote_reference() to authenticated;

-- ---------------------------------------------------------------------------
-- Quote totals
--
-- Totals are computed in the database from the line items, not trusted from
-- the client. A quote total that disagrees with its own lines is the sort of
-- thing that ends up in a dispute.
-- ---------------------------------------------------------------------------

create or replace function public.sks_recalculate_quote(target_quote_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  computed_subtotal numeric(12, 2);
  rate numeric(5, 2);
begin
  select coalesce(sum(line_total), 0)
    into computed_subtotal
    from public.sks_quote_line_items
   where quote_id = target_quote_id;

  select vat_rate into rate from public.sks_quotes where id = target_quote_id;

  update public.sks_quotes
     set subtotal = computed_subtotal,
         vat_amount = round(computed_subtotal * coalesce(rate, 0) / 100, 2),
         total = computed_subtotal
                 + round(computed_subtotal * coalesce(rate, 0) / 100, 2),
         updated_at = now()
   where id = target_quote_id;
end;
$$;

grant execute on function public.sks_recalculate_quote(uuid) to authenticated;

create or replace function public.sks_line_item_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- line_total is derived, never taken on trust from the caller.
  if tg_op in ('INSERT', 'UPDATE') then
    new.line_total := round(new.quantity * new.unit_price, 2);
  end if;

  if tg_op = 'DELETE' then
    perform public.sks_recalculate_quote(old.quote_id);
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists sks_line_item_before on public.sks_quote_line_items;
create trigger sks_line_item_before
  before insert or update on public.sks_quote_line_items
  for each row execute function public.sks_line_item_changed();

drop trigger if exists sks_line_item_delete on public.sks_quote_line_items;
create trigger sks_line_item_delete
  after delete on public.sks_quote_line_items
  for each row execute function public.sks_line_item_changed();

create or replace function public.sks_line_item_after()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sks_recalculate_quote(new.quote_id);
  return new;
end;
$$;

drop trigger if exists sks_line_item_after on public.sks_quote_line_items;
create trigger sks_line_item_after
  after insert or update on public.sks_quote_line_items
  for each row execute function public.sks_line_item_after();

-- ---------------------------------------------------------------------------
-- Touch updated_at
-- ---------------------------------------------------------------------------

drop trigger if exists sks_clients_touch on public.sks_clients;
create trigger sks_clients_touch
  before update on public.sks_clients
  for each row execute function public.sks_touch_updated_at();

drop trigger if exists sks_projects_touch on public.sks_projects;
create trigger sks_projects_touch
  before update on public.sks_projects
  for each row execute function public.sks_touch_updated_at();
