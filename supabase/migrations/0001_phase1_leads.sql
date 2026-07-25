-- SKS Construction, Phase 1 bootstrap.
--
-- Creates only what the public website needs: profiles (so roles exist from
-- day one) and leads. The full model lives in prisma/schema.prisma and is
-- applied from Phase 2 onwards; when Prisma takes over, baseline it against
-- this migration with `prisma migrate diff` rather than letting the two drift.
--
-- RLS is on from the start. The public enquiry form writes through the service
-- role in a server action, so no anonymous insert policy is needed and none is
-- granted.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type sks_role as enum ('OWNER', 'STAFF', 'CLIENT');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sks_division as enum ('CONSTRUCTION', 'JOINERY', 'ROOFING');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sks_lead_status as enum ('NEW', 'CONTACTED', 'QUALIFIED', 'QUOTED', 'WON', 'LOST');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sks_lead_source as enum ('WEBSITE', 'PHONE', 'EMAIL', 'REFERRAL', 'REPEAT', 'OTHER');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table if not exists public.sks_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  phone text,
  role sks_role not null default 'CLIENT',
  job_title text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sks_profiles_role_idx on public.sks_profiles (role);

alter table public.sks_profiles enable row level security;

-- A user can always read their own profile.
drop policy if exists "profiles: read own" on public.sks_profiles;
create policy "profiles: read own"
  on public.sks_profiles for select
  using (auth.uid() = id);

-- Staff and owners can read everyone. Defined against a security-definer
-- helper to avoid the policy recursing into the same table.
create or replace function public.sks_current_role()
returns sks_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.sks_profiles where id = auth.uid();
$$;

drop policy if exists "profiles: staff read all" on public.sks_profiles;
create policy "profiles: staff read all"
  on public.sks_profiles for select
  using (public.sks_current_role() in ('OWNER', 'STAFF'));

-- A user may update their own profile, but must not be able to promote
-- themselves. Column-level REVOKE is a no-op while a table-level UPDATE grant
-- exists, so the table grant is revoked and granted back minus `role`.
drop policy if exists "profiles: update own" on public.sks_profiles;
create policy "profiles: update own"
  on public.sks_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

revoke update on public.sks_profiles from authenticated;
grant update (email, full_name, phone, job_title, updated_at)
  on public.sks_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Leads
-- ---------------------------------------------------------------------------

create table if not exists public.sks_leads (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  client_id uuid,
  owner_id uuid references public.sks_profiles (id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  postcode text,
  division sks_division,
  message text not null,
  status sks_lead_status not null default 'NEW',
  source sks_lead_source not null default 'WEBSITE',
  referral_id uuid unique,
  lost_reason text,
  contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sks_leads_status_created_idx
  on public.sks_leads (status, created_at desc);
create index if not exists sks_leads_division_idx
  on public.sks_leads (division);

alter table public.sks_leads enable row level security;

-- No anonymous policy on purpose. The website writes via the service role in a
-- server action, which bypasses RLS. Anonymous clients get nothing.
drop policy if exists "leads: staff read" on public.sks_leads;
create policy "leads: staff read"
  on public.sks_leads for select
  using (public.sks_current_role() in ('OWNER', 'STAFF'));

drop policy if exists "leads: staff write" on public.sks_leads;
create policy "leads: staff write"
  on public.sks_leads for all
  using (public.sks_current_role() in ('OWNER', 'STAFF'))
  with check (public.sks_current_role() in ('OWNER', 'STAFF'));

-- ---------------------------------------------------------------------------
-- Touch updated_at
-- ---------------------------------------------------------------------------

create or replace function public.sks_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sks_profiles_touch on public.sks_profiles;
create trigger sks_profiles_touch
  before update on public.sks_profiles
  for each row execute function public.sks_touch_updated_at();

drop trigger if exists sks_leads_touch on public.sks_leads;
create trigger sks_leads_touch
  before update on public.sks_leads
  for each row execute function public.sks_touch_updated_at();

-- ---------------------------------------------------------------------------
-- New auth users get a profile
-- ---------------------------------------------------------------------------

create or replace function public.sks_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.sks_profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists sks_on_auth_user_created on auth.users;
create trigger sks_on_auth_user_created
  after insert on auth.users
  for each row execute function public.sks_handle_new_user();
