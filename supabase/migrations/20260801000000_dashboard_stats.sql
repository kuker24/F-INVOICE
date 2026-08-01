-- SQL aggregates for dashboard (PostgREST blocks sum() in select).
-- service_role only — app calls via createAdminClient after assertStaff.

create or replace function public.dashboard_stats(
  p_owner_id uuid,
  p_include_revenue boolean default true
)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'customers', (
      select count(*)::int
      from public.customers c
      where c.owner_id = p_owner_id
        and c.deleted_at is null
    ),
    'open_invoices', (
      select count(*)::int
      from public.invoices i
      where i.owner_id = p_owner_id
        and i.deleted_at is null
        and i.status in ('SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE')
    ),
    'overdue_invoices', (
      select count(*)::int
      from public.invoices i
      where i.owner_id = p_owner_id
        and i.deleted_at is null
        and i.status = 'OVERDUE'
    ),
    'pending_payments', (
      select count(*)::int
      from public.payments p
      where p.owner_id = p_owner_id
        and p.status = 'PENDING'
        and p.cancelled_at is null
    ),
    'outstanding', coalesce((
      select sum(i.balance_due)::numeric
      from public.invoices i
      where i.owner_id = p_owner_id
        and i.deleted_at is null
        and i.status in ('SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE')
    ), 0),
    'revenue', case
      when p_include_revenue then coalesce((
        select sum(i.total_amount)::numeric
        from public.invoices i
        where i.owner_id = p_owner_id
          and i.deleted_at is null
          and i.status = 'PAID'
      ), 0)
      else null
    end
  );
$$;

revoke all on function public.dashboard_stats(uuid, boolean) from public;
grant execute on function public.dashboard_stats(uuid, boolean) to service_role;
