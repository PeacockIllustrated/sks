-- RLS behaviour tests.
--
-- Run against a throwaway database seeded by the shim plus both migrations.
-- Every assertion raises on failure, so a clean run means the policies do what
-- the build claims. The client isolation checks are the point of this file.

\set ON_ERROR_STOP on

-- ---------------------------------------------------------------------------
-- Seed
-- ---------------------------------------------------------------------------

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'owner@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'staff@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'clientone@example.com'),
  ('00000000-0000-0000-0000-00000000000d', 'clienttwo@example.com');

update public.sks_profiles set role = 'OWNER'
  where id = '00000000-0000-0000-0000-00000000000a';
update public.sks_profiles set role = 'STAFF'
  where id = '00000000-0000-0000-0000-00000000000b';

insert into public.sks_clients (id, profile_id, contact_name, email) values
  ('11111111-1111-1111-1111-111111111111',
   '00000000-0000-0000-0000-00000000000c', 'Client One', 'clientone@example.com'),
  ('22222222-2222-2222-2222-222222222222',
   '00000000-0000-0000-0000-00000000000d', 'Client Two', 'clienttwo@example.com');

insert into public.sks_projects (id, reference, client_id, title, division, is_published) values
  ('33333333-3333-3333-3333-333333333333', 'SKS-P-00001',
   '11111111-1111-1111-1111-111111111111', 'One kitchen', 'JOINERY', false),
  ('44444444-4444-4444-4444-444444444444', 'SKS-P-00002',
   '22222222-2222-2222-2222-222222222222', 'Two roof', 'ROOFING', true);

insert into public.sks_quotes (id, reference, client_id, project_id, title, status, vat_rate) values
  ('55555555-5555-5555-5555-555555555555', 'SKS-Q-00001',
   '11111111-1111-1111-1111-111111111111',
   '33333333-3333-3333-3333-333333333333', 'One kitchen quote', 'SENT', 20),
  ('66666666-6666-6666-6666-666666666666', 'SKS-Q-00002',
   '11111111-1111-1111-1111-111111111111',
   '33333333-3333-3333-3333-333333333333', 'One draft', 'DRAFT', 20),
  ('77777777-7777-7777-7777-777777777777', 'SKS-Q-00003',
   '22222222-2222-2222-2222-222222222222',
   '44444444-4444-4444-4444-444444444444', 'Two roof quote', 'SENT', 20);

insert into public.sks_quote_line_items (quote_id, position, description, quantity, unit, unit_price)
values
  ('55555555-5555-5555-5555-555555555555', 0, 'Units', 3, 'item', 250.00),
  ('55555555-5555-5555-5555-555555555555', 1, 'Worktop', 1, 'item', 1250.50);

-- ---------------------------------------------------------------------------
-- Totals are computed in the database
-- ---------------------------------------------------------------------------

do $$
declare
  s numeric; v numeric; t numeric;
begin
  select subtotal, vat_amount, total into s, v, t
    from public.sks_quotes where id = '55555555-5555-5555-5555-555555555555';

  if s <> 2000.50 then
    raise exception 'subtotal wrong: expected 2000.50, got %', s;
  end if;
  if v <> 400.10 then
    raise exception 'vat wrong: expected 400.10, got %', v;
  end if;
  if t <> 2400.60 then
    raise exception 'total wrong: expected 2400.60, got %', t;
  end if;
  raise notice 'PASS quote totals computed from line items';
end $$;

-- line_total is derived, not trusted from the caller
do $$
declare computed numeric;
begin
  update public.sks_quote_line_items
     set line_total = 999999
   where quote_id = '55555555-5555-5555-5555-555555555555' and position = 0;

  select line_total into computed
    from public.sks_quote_line_items
   where quote_id = '55555555-5555-5555-5555-555555555555' and position = 0;

  if computed <> 750.00 then
    raise exception 'line_total should be recomputed to 750.00, got %', computed;
  end if;
  raise notice 'PASS line_total ignores caller-supplied value';
end $$;

-- deleting a line recalculates the parent quote
do $$
declare s numeric;
begin
  delete from public.sks_quote_line_items
   where quote_id = '55555555-5555-5555-5555-555555555555' and position = 1;

  select subtotal into s from public.sks_quotes
   where id = '55555555-5555-5555-5555-555555555555';

  if s <> 750.00 then
    raise exception 'subtotal after delete should be 750.00, got %', s;
  end if;
  raise notice 'PASS delete recalculates quote';
end $$;

-- ---------------------------------------------------------------------------
-- Client isolation. The rule that matters most.
-- ---------------------------------------------------------------------------

set role authenticated;
set "request.jwt.claim.sub" = '00000000-0000-0000-0000-00000000000c';

do $$
declare n integer;
begin
  select count(*) into n from public.sks_projects
   where client_id = '22222222-2222-2222-2222-222222222222'
     and is_published = false;
  if n <> 0 then
    raise exception 'client one can see client two unpublished projects (%)', n;
  end if;
  raise notice 'PASS client cannot read another client unpublished project';

  select count(*) into n from public.sks_quotes
   where client_id = '22222222-2222-2222-2222-222222222222';
  if n <> 0 then
    raise exception 'client one can see client two quotes (%)', n;
  end if;
  raise notice 'PASS client cannot read another client quotes';

  select count(*) into n from public.sks_quotes where status = 'DRAFT';
  if n <> 0 then
    raise exception 'client can see draft quotes (%)', n;
  end if;
  raise notice 'PASS client cannot read draft quotes';

  select count(*) into n from public.sks_quotes;
  if n <> 1 then
    raise exception 'client should see exactly one sent quote, saw %', n;
  end if;
  raise notice 'PASS client sees only their own sent quote';

  select count(*) into n from public.sks_quote_line_items;
  if n <> 1 then
    raise exception 'client should see only their own line items, saw %', n;
  end if;
  raise notice 'PASS client line items scoped to their own quotes';

  select count(*) into n from public.sks_clients;
  if n <> 1 then
    raise exception 'client should see only their own client row, saw %', n;
  end if;
  raise notice 'PASS client sees only their own client record';

  select count(*) into n from public.sks_leads;
  if n <> 0 then
    raise exception 'client can read leads (%)', n;
  end if;
  raise notice 'PASS client cannot read leads';
end $$;

-- A client must not be able to promote themselves.
do $$
begin
  begin
    update public.sks_profiles set role = 'OWNER'
     where id = '00000000-0000-0000-0000-00000000000c';
    raise exception 'FAIL client was able to change their own role';
  exception
    when insufficient_privilege then
      raise notice 'PASS client cannot update their own role column';
  end;
end $$;

reset role;
reset "request.jwt.claim.sub";

-- ---------------------------------------------------------------------------
-- Staff see everything
-- ---------------------------------------------------------------------------

set role authenticated;
set "request.jwt.claim.sub" = '00000000-0000-0000-0000-00000000000b';

do $$
declare n integer;
begin
  select count(*) into n from public.sks_projects;
  if n <> 2 then raise exception 'staff should see 2 projects, saw %', n; end if;

  select count(*) into n from public.sks_quotes;
  if n <> 3 then raise exception 'staff should see 3 quotes, saw %', n; end if;

  select count(*) into n from public.sks_clients;
  if n <> 2 then raise exception 'staff should see 2 clients, saw %', n; end if;

  raise notice 'PASS staff can read all projects, quotes and clients';
end $$;

reset role;
reset "request.jwt.claim.sub";

-- ---------------------------------------------------------------------------
-- Anonymous sees only published projects
-- ---------------------------------------------------------------------------

set role anon;

do $$
declare n integer;
begin
  select count(*) into n from public.sks_projects;
  if n <> 1 then
    raise exception 'anon should see exactly 1 published project, saw %', n;
  end if;
  raise notice 'PASS anon sees only published projects';
end $$;

reset role;
reset "request.jwt.claim.sub";

-- ---------------------------------------------------------------------------
-- References come from sequences, never from row counts
-- ---------------------------------------------------------------------------

do $$
declare a text; b text;
begin
  select public.sks_next_quote_reference() into a;
  select public.sks_next_quote_reference() into b;
  if a = b then raise exception 'quote references collided: % and %', a, b; end if;
  raise notice 'PASS quote references are unique (% then %)', a, b;
end $$;
