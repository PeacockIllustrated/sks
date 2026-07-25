-- Assertions for the invoicing, scheduling, document and retention tables.
--
-- Runs after 01_rls_test.sql, and reuses the clients and projects it seeded.
-- The point of this file is the client-isolation checks: every table a client
-- can reach is tested from the client's own session, not reasoned about.

\set ON_ERROR_STOP on

-- ---------------------------------------------------------------------------
-- Seed
-- ---------------------------------------------------------------------------

insert into public.sks_invoices
  (id, reference, project_id, client_id, status, vat_rate, due_date)
values
  ('aa000000-0000-0000-0000-000000000001', 'SKS-I-00001',
   '33333333-3333-3333-3333-333333333333',
   '11111111-1111-1111-1111-111111111111', 'SENT', 20, now() + interval '30 days'),
  ('aa000000-0000-0000-0000-000000000002', 'SKS-I-00002',
   '33333333-3333-3333-3333-333333333333',
   '11111111-1111-1111-1111-111111111111', 'DRAFT', 20, null),
  ('aa000000-0000-0000-0000-000000000003', 'SKS-I-00003',
   '44444444-4444-4444-4444-444444444444',
   '22222222-2222-2222-2222-222222222222', 'SENT', 20, null);

insert into public.sks_invoice_line_items
  (invoice_id, position, description, quantity, unit, unit_price)
values
  ('aa000000-0000-0000-0000-000000000001', 0, 'Stage one', 1, 'sum', 1000.00),
  ('aa000000-0000-0000-0000-000000000001', 1, 'Stage two', 2, 'day', 250.00);

-- ---------------------------------------------------------------------------
-- Invoice totals
-- ---------------------------------------------------------------------------

do $$
declare s numeric; v numeric; t numeric; st sks_invoice_status;
begin
  select subtotal, vat_amount, total, status into s, v, t, st
    from public.sks_invoices
   where id = 'aa000000-0000-0000-0000-000000000001';

  if s <> 1500.00 then raise exception 'invoice subtotal wrong: %', s; end if;
  if v <> 300.00 then raise exception 'invoice vat wrong: %', v; end if;
  if t <> 1800.00 then raise exception 'invoice total wrong: %', t; end if;
  if st <> 'SENT' then raise exception 'unpaid invoice changed status to %', st; end if;

  raise notice 'PASS invoice totals computed from line items';
end $$;

-- ---------------------------------------------------------------------------
-- Payments settle the invoice
-- ---------------------------------------------------------------------------

do $$
declare st sks_invoice_status; paid numeric;
begin
  insert into public.sks_payments (invoice_id, amount, method)
  values ('aa000000-0000-0000-0000-000000000001', 800.00, 'BANK_TRANSFER');

  select status, amount_paid into st, paid
    from public.sks_invoices where id = 'aa000000-0000-0000-0000-000000000001';

  if st <> 'PART_PAID' then raise exception 'expected PART_PAID, got %', st; end if;
  if paid <> 800.00 then raise exception 'amount_paid wrong: %', paid; end if;
  raise notice 'PASS part payment moves invoice to part paid';

  insert into public.sks_payments (invoice_id, amount, method)
  values ('aa000000-0000-0000-0000-000000000001', 1000.00, 'STRIPE');

  select status, amount_paid into st, paid
    from public.sks_invoices where id = 'aa000000-0000-0000-0000-000000000001';

  if st <> 'PAID' then raise exception 'expected PAID, got %', st; end if;
  if paid <> 1800.00 then raise exception 'amount_paid wrong: %', paid; end if;
  raise notice 'PASS settling payment marks invoice paid';
end $$;

-- A draft invoice with no lines must not settle itself.
do $$
declare st sks_invoice_status;
begin
  perform public.sks_recalculate_invoice('aa000000-0000-0000-0000-000000000002');
  select status into st from public.sks_invoices
   where id = 'aa000000-0000-0000-0000-000000000002';
  if st <> 'DRAFT' then
    raise exception 'empty draft invoice changed status to %', st;
  end if;
  raise notice 'PASS empty draft invoice does not settle itself';
end $$;

-- A replayed Stripe webhook must not record the payment twice.
do $$
begin
  insert into public.sks_payments (invoice_id, amount, method, stripe_event_id)
  values ('aa000000-0000-0000-0000-000000000003', 100.00, 'STRIPE', 'evt_test_1');
  begin
    insert into public.sks_payments (invoice_id, amount, method, stripe_event_id)
    values ('aa000000-0000-0000-0000-000000000003', 100.00, 'STRIPE', 'evt_test_1');
    raise exception 'FAIL duplicate stripe event was accepted';
  exception
    when unique_violation then
      raise notice 'PASS duplicate stripe event rejected';
  end;
end $$;

-- ---------------------------------------------------------------------------
-- Progress notes and documents
-- ---------------------------------------------------------------------------

insert into public.sks_project_updates (project_id, body, is_client_visible)
values
  ('33333333-3333-3333-3333-333333333333', 'Scaffold up, first fix starts Monday.', true),
  ('33333333-3333-3333-3333-333333333333', 'Client is slow paying, watch this one.', false);

insert into public.sks_documents
  (project_id, kind, title, storage_path, is_client_visible)
values
  ('33333333-3333-3333-3333-333333333333', 'CERTIFICATE',
   'Building control completion', 'projects/one/completion.pdf', true),
  ('33333333-3333-3333-3333-333333333333', 'OTHER',
   'Internal margin working', 'projects/one/margin.xlsx', false);

insert into public.sks_assignments (project_id, staff_id, starts_at, ends_at)
values ('33333333-3333-3333-3333-333333333333',
        '00000000-0000-0000-0000-00000000000b',
        now(), now() + interval '5 days');

insert into public.sks_maintenance_contracts
  (reference, client_id, title, amount, start_date)
values ('SKS-M-00001', '11111111-1111-1111-1111-111111111111',
        'Annual roof check', 240.00, now());

insert into public.sks_referrals (referrer_id, referee_name)
values ('11111111-1111-1111-1111-111111111111', 'Neighbour at number 14');

-- An assignment must not end before it starts.
do $$
begin
  begin
    insert into public.sks_assignments (project_id, staff_id, starts_at, ends_at)
    values ('33333333-3333-3333-3333-333333333333',
            '00000000-0000-0000-0000-00000000000b',
            now(), now() - interval '1 day');
    raise exception 'FAIL backwards assignment accepted';
  exception
    when check_violation then
      raise notice 'PASS assignment rejects an end before its start';
  end;
end $$;

-- ---------------------------------------------------------------------------
-- Client isolation across the new tables
-- ---------------------------------------------------------------------------

set role authenticated;
set "request.jwt.claim.sub" = '00000000-0000-0000-0000-00000000000c';

do $$
declare n integer;
begin
  select count(*) into n from public.sks_invoices;
  if n <> 1 then
    raise exception 'client should see 1 issued invoice of their own, saw %', n;
  end if;
  raise notice 'PASS client sees only their own issued invoices';

  select count(*) into n from public.sks_invoices where status = 'DRAFT';
  if n <> 0 then raise exception 'client can see draft invoices (%)', n; end if;
  raise notice 'PASS client cannot read draft invoices';

  select count(*) into n from public.sks_invoice_line_items;
  if n <> 2 then
    raise exception 'client should see only their own invoice lines, saw %', n;
  end if;
  raise notice 'PASS invoice lines scoped to the client';

  select count(*) into n from public.sks_payments;
  if n <> 2 then
    raise exception 'client should see their own 2 payments, saw %', n;
  end if;
  raise notice 'PASS payments scoped to the client';

  select count(*) into n from public.sks_project_updates;
  if n <> 1 then
    raise exception 'client should see 1 visible update, saw %', n;
  end if;
  raise notice 'PASS client sees only client-visible progress notes';

  select count(*) into n from public.sks_documents;
  if n <> 1 then
    raise exception 'client should see 1 visible document, saw %', n;
  end if;
  raise notice 'PASS client sees only client-visible documents';

  select count(*) into n from public.sks_assignments;
  if n <> 0 then
    raise exception 'client can see the schedule (%)', n;
  end if;
  raise notice 'PASS client cannot read the schedule at all';

  select count(*) into n from public.sks_maintenance_contracts;
  if n <> 1 then
    raise exception 'client should see their own contract, saw %', n;
  end if;
  raise notice 'PASS client sees their own maintenance contract';

  select count(*) into n from public.sks_referrals;
  if n <> 1 then
    raise exception 'client should see their own referral, saw %', n;
  end if;
  raise notice 'PASS client sees their own referrals';
end $$;

-- A client must not be able to award themselves a referral reward.
do $$
begin
  begin
    update public.sks_referrals set reward_amount = 5000
     where referrer_id = '11111111-1111-1111-1111-111111111111';
    raise exception 'FAIL client set their own referral reward';
  exception
    when insufficient_privilege then
      raise notice 'PASS client cannot set their own referral reward';
  end;
end $$;

-- Site settings are readable but not writable by a client.
do $$
begin
  begin
    insert into public.sks_site_settings (key, value)
    values ('phone', '0000 000 0000');
    raise exception 'FAIL client wrote a site setting';
  exception
    when insufficient_privilege or check_violation then
      raise notice 'PASS client cannot write site settings';
  end;
end $$;

reset role;
reset "request.jwt.claim.sub";

-- ---------------------------------------------------------------------------
-- Client two sees none of client one's records
-- ---------------------------------------------------------------------------

set role authenticated;
set "request.jwt.claim.sub" = '00000000-0000-0000-0000-00000000000d';

do $$
declare n integer;
begin
  select count(*) into n from public.sks_project_updates;
  if n <> 0 then raise exception 'client two saw client one updates (%)', n; end if;

  select count(*) into n from public.sks_documents;
  if n <> 0 then raise exception 'client two saw client one documents (%)', n; end if;

  select count(*) into n from public.sks_maintenance_contracts;
  if n <> 0 then raise exception 'client two saw client one contracts (%)', n; end if;

  select count(*) into n from public.sks_referrals;
  if n <> 0 then raise exception 'client two saw client one referrals (%)', n; end if;

  raise notice 'PASS a second client sees none of the first client records';
end $$;

reset role;
reset "request.jwt.claim.sub";

-- ---------------------------------------------------------------------------
-- Anonymous reaches nothing but published projects and settings
-- ---------------------------------------------------------------------------

set role anon;

do $$
declare n integer;
begin
  select count(*) into n from public.sks_invoices;
  if n <> 0 then raise exception 'anon can read invoices (%)', n; end if;

  select count(*) into n from public.sks_documents;
  if n <> 0 then raise exception 'anon can read documents (%)', n; end if;

  select count(*) into n from public.sks_assignments;
  if n <> 0 then raise exception 'anon can read the schedule (%)', n; end if;

  raise notice 'PASS anon cannot read invoices, documents or the schedule';
end $$;

reset role;
