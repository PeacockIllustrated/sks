-- SKS Construction, function hardening.
--
-- Raised by Supabase's own advisors after 0001-0003 were applied. Two separate
-- problems, both about functions rather than tables:
--
-- 1. Four functions had a mutable search_path. Every SECURITY DEFINER function
--    already pinned one; these did not, because they are not SECURITY DEFINER
--    and it felt unnecessary. It is not: `sks_touch_updated_at` runs on tables
--    an attacker may be able to write to, and a function that resolves its own
--    names at call time can be pointed somewhere else.
--
-- 2. Every function in `public` is executable by `anon` and `authenticated` by
--    default, because Postgres grants EXECUTE to PUBLIC on creation. For a
--    SECURITY DEFINER function that is an RLS bypass reachable over
--    `/rest/v1/rpc/...`, without ever touching the application.
--
-- What stays reachable, and why:
--
--   sks_current_role, sks_current_client_id  - referenced inside RLS policy
--     expressions, which are evaluated as the querying role. Revoking EXECUTE
--     would take every policy on the schema down with it. Both return facts
--     about the caller and nothing about anyone else.
--
--   sks_next_*_reference, sks_recalculate_*  - called by the admin server
--     actions through the signed-in user's own client, not the service role.
--     They stay callable and are guarded on role inside the function instead,
--     so the database enforces what was previously only a route guard.
--
-- Everything else is a trigger body with no reason to be an API endpoint.

-- ---------------------------------------------------------------------------
-- 1. Pin the search_path that was left mutable
-- ---------------------------------------------------------------------------

alter function public.sks_touch_updated_at() set search_path = public;
alter function public.sks_next_project_reference() set search_path = public;
alter function public.sks_next_quote_reference() set search_path = public;
alter function public.sks_next_invoice_reference() set search_path = public;

-- ---------------------------------------------------------------------------
-- 2. Guard the recalculation functions on role
--
-- Both are SECURITY DEFINER, so without this a signed-in CLIENT could call
-- them against any quote or invoice id. Neither returns data, so nothing leaks,
-- but a client should not be able to reach into another customer's records at
-- all, and "it only writes a total you cannot read" is not a security argument.
--
-- A null role means there is no JWT: the service role, or the trigger bodies
-- below, which call these from a SECURITY DEFINER context of their own. Those
-- are allowed through.
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
  caller sks_role;
begin
  caller := public.sks_current_role();
  if caller is not null and caller not in ('OWNER', 'STAFF') then
    raise exception 'sks_recalculate_quote: not permitted'
      using errcode = '42501';
  end if;

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
  caller sks_role;
begin
  caller := public.sks_current_role();
  if caller is not null and caller not in ('OWNER', 'STAFF') then
    raise exception 'sks_recalculate_invoice: not permitted'
      using errcode = '42501';
  end if;

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

-- ---------------------------------------------------------------------------
-- 3. Take the trigger bodies off the REST surface
--
-- Postgres checks EXECUTE on a trigger function when the trigger is created,
-- not each time it fires, so revoking here does not stop any trigger working.
--
-- `sks_handle_new_user` is deliberately left alone. It fires from GoTrue on
-- `auth.users` for every new account in this project, not only ours, and the
-- cost of being wrong about it is every sign-up in the organisation failing.
-- Called directly it dereferences a trigger record that is not there and errors
-- immediately, so leaving it reachable gives an attacker an exception.
-- ---------------------------------------------------------------------------

revoke execute on function public.sks_touch_updated_at() from public, anon, authenticated;
revoke execute on function public.sks_line_item_changed() from public, anon, authenticated;
revoke execute on function public.sks_line_item_after() from public, anon, authenticated;
revoke execute on function public.sks_invoice_line_changed() from public, anon, authenticated;
revoke execute on function public.sks_invoice_recalc_after() from public, anon, authenticated;

-- The recalculation functions are for signed-in staff. Nothing anonymous has
-- any business recomputing a total, and the role guard inside them cannot help
-- against `anon`, which has no role to check.
revoke execute on function public.sks_recalculate_quote(uuid) from public, anon;
revoke execute on function public.sks_recalculate_invoice(uuid) from public, anon;

-- Same for the reference generators. They are not SECURITY DEFINER and leak
-- nothing, but each call burns a sequence value, and an anonymous visitor
-- being able to advance the next quote number is a nuisance with no upside.
revoke execute on function public.sks_next_project_reference() from public, anon;
revoke execute on function public.sks_next_quote_reference() from public, anon;
revoke execute on function public.sks_next_invoice_reference() from public, anon;

-- ---------------------------------------------------------------------------
-- 4. Re-assert the grants the application actually needs
--
-- CREATE OR REPLACE above preserves existing grants, but stating them keeps
-- this migration honest about what is reachable when it has finished.
-- ---------------------------------------------------------------------------

grant execute on function public.sks_current_role() to anon, authenticated;
grant execute on function public.sks_current_client_id() to anon, authenticated;
grant execute on function public.sks_next_project_reference() to authenticated;
grant execute on function public.sks_next_quote_reference() to authenticated;
grant execute on function public.sks_next_invoice_reference() to authenticated;
grant execute on function public.sks_recalculate_quote(uuid) to authenticated;
grant execute on function public.sks_recalculate_invoice(uuid) to authenticated;
