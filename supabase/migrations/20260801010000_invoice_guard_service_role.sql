-- PostgREST issues each .rpc() / .from().update() as a separate transaction.
-- set_config(..., is_local := true) from rpc_set_invoice_bypass therefore never
-- applies to the following UPDATE, so send/cancel/recompute always hit the guard.
-- Service-role is only used server-side (createAdminClient); user JWTs stay blocked.

create or replace function public.enforce_invoice_update_guard()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.bypass_invoice_guard', true) = 'on' then
    return new;
  end if;

  -- Service role (server actions / admin client) may mutate protected fields.
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if new.subtotal is distinct from old.subtotal
    or new.discount_amount is distinct from old.discount_amount
    or new.tax_amount is distinct from old.tax_amount
    or new.additional_fee is distinct from old.additional_fee
    or new.total_amount is distinct from old.total_amount
    or new.amount_paid is distinct from old.amount_paid
    or new.balance_due is distinct from old.balance_due
    or new.invoice_number is distinct from old.invoice_number
    or new.status is distinct from old.status
    or new.sent_at is distinct from old.sent_at
    or new.viewed_at is distinct from old.viewed_at
    or new.paid_at is distinct from old.paid_at
    or new.cancelled_at is distinct from old.cancelled_at
    or new.public_token is distinct from old.public_token
  then
    raise exception 'INVOICE_PROTECTED_FIELDS_CLIENT_UPDATE_FORBIDDEN';
  end if;
  return new;
end;
$$;

-- Single-statement protected patch (bypass + update in one txn). Prefer this for
-- future callers; existing admin.from('invoices').update works via service_role.
create or replace function public.rpc_invoice_update_protected(
  p_invoice_id uuid,
  p_patch jsonb
)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.invoices;
  patch jsonb := coalesce(p_patch, '{}'::jsonb);
begin
  perform set_config('app.bypass_invoice_guard', 'on', true);

  update public.invoices i
  set
    status = case
      when patch ? 'status' then (patch->>'status')::public.invoice_status
      else i.status
    end,
    sent_at = case
      when patch ? 'sent_at' then (patch->>'sent_at')::timestamptz
      else i.sent_at
    end,
    viewed_at = case
      when patch ? 'viewed_at' then (patch->>'viewed_at')::timestamptz
      else i.viewed_at
    end,
    paid_at = case
      when patch ? 'paid_at' then
        case
          when patch->'paid_at' = 'null'::jsonb then null
          else (patch->>'paid_at')::timestamptz
        end
      else i.paid_at
    end,
    cancelled_at = case
      when patch ? 'cancelled_at' then (patch->>'cancelled_at')::timestamptz
      else i.cancelled_at
    end,
    amount_paid = case
      when patch ? 'amount_paid' then (patch->>'amount_paid')::numeric
      else i.amount_paid
    end,
    balance_due = case
      when patch ? 'balance_due' then (patch->>'balance_due')::numeric
      else i.balance_due
    end,
    subtotal = case
      when patch ? 'subtotal' then (patch->>'subtotal')::numeric
      else i.subtotal
    end,
    discount_amount = case
      when patch ? 'discount_amount' then (patch->>'discount_amount')::numeric
      else i.discount_amount
    end,
    tax_amount = case
      when patch ? 'tax_amount' then (patch->>'tax_amount')::numeric
      else i.tax_amount
    end,
    additional_fee = case
      when patch ? 'additional_fee' then (patch->>'additional_fee')::numeric
      else i.additional_fee
    end,
    total_amount = case
      when patch ? 'total_amount' then (patch->>'total_amount')::numeric
      else i.total_amount
    end,
    invoice_number = case
      when patch ? 'invoice_number' then patch->>'invoice_number'
      else i.invoice_number
    end,
    public_token = case
      when patch ? 'public_token' then patch->>'public_token'
      else i.public_token
    end,
    updated_by = case
      when patch ? 'updated_by' then (patch->>'updated_by')::uuid
      else i.updated_by
    end,
    updated_at = now()
  where i.id = p_invoice_id
  returning * into r;

  if r.id is null then
    raise exception 'INVOICE_NOT_FOUND';
  end if;

  return r;
end;
$$;

revoke all on function public.rpc_invoice_update_protected(uuid, jsonb) from public;
grant execute on function public.rpc_invoice_update_protected(uuid, jsonb) to service_role;
