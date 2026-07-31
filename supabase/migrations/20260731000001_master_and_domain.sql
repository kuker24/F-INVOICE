-- F-INVOICE PR2–PR6 schema: master data + invoices + payments + subscriptions + templates
-- Depends on 20260731000000_foundation.sql

-- ========== master ==========
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id),
  code text not null,
  name text not null,
  type public.customer_type not null default 'INDIVIDUAL',
  email text,
  phone text,
  address text,
  city text,
  province text,
  postal_code text,
  tax_id text,
  contact_person text,
  notes text,
  status public.customer_status not null default 'ACTIVE',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (owner_id, code)
);
create index customers_owner_idx on public.customers (owner_id) where deleted_at is null;
create index customers_name_idx on public.customers (owner_id, name);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id),
  code text not null,
  name text not null,
  description text,
  category text,
  default_price bigint not null check (default_price >= 0),
  unit text,
  billing_type public.billing_type not null default 'ONE_TIME',
  default_tax_rate integer not null default 0 check (default_tax_rate >= 0),
  status public.product_status not null default 'ACTIVE',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (owner_id, code)
);
create index products_owner_idx on public.products (owner_id) where deleted_at is null;

create table public.business_settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id),
  business_name text not null default 'F-INVOICE',
  legal_name text,
  address text,
  city text,
  province text,
  postal_code text,
  phone text,
  email text,
  website text,
  tax_id text,
  logo_url text,
  signature_url text,
  default_currency text not null default 'IDR',
  timezone text not null default 'Asia/Jakarta',
  invoice_prefix text not null default 'FINV',
  payment_prefix text not null default 'PAY',
  default_due_days integer not null default 7,
  default_terms text,
  default_notes text,
  show_revenue_to_admin boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id),
  type public.payment_method_type not null default 'BANK_TRANSFER',
  bank_name text,
  account_number text,
  account_holder text,
  branch text,
  instructions text,
  is_default boolean not null default false,
  status public.record_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index payment_methods_one_default
  on public.payment_methods (owner_id)
  where is_default = true and status = 'ACTIVE';

create table public.invoice_sequences (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id),
  year integer not null,
  prefix text not null default 'FINV',
  last_number integer not null default 0 check (last_number >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, year, prefix)
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id),
  actor_id uuid references public.profiles (id),
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  description text not null,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index activity_logs_owner_created_idx
  on public.activity_logs (owner_id, created_at desc);
create index activity_logs_entity_idx
  on public.activity_logs (entity_type, entity_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  target_type text,
  target_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_user_idx
  on public.notifications (user_id, is_read, created_at desc);

-- FK customers on profiles (after customers exists)
alter table public.profiles
  add constraint profiles_customer_id_fkey
  foreign key (customer_id) references public.customers (id);

-- ========== templates ==========
create table public.invoice_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id),
  name text not null,
  slug text not null,
  layout_type public.template_layout not null default 'MINIMAL',
  accent_color text,
  logo_position text default 'left',
  footer_text text,
  show_signature boolean not null default true,
  is_default boolean not null default false,
  status public.record_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, slug)
);

-- ========== subscriptions (before invoices FK) ==========
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id),
  customer_id uuid not null references public.customers (id),
  product_id uuid references public.products (id),
  name text not null,
  description text,
  billing_cycle public.billing_cycle not null,
  custom_interval_days integer,
  price bigint not null check (price >= 0),
  currency text not null default 'IDR',
  start_date date not null,
  next_invoice_date date not null,
  end_date date,
  due_days integer not null default 7,
  auto_generate_invoice boolean not null default true,
  template_id uuid references public.invoice_templates (id),
  payment_method_id uuid references public.payment_methods (id),
  status public.subscription_status not null default 'ACTIVE',
  internal_notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz
);
create index subscriptions_cron_idx
  on public.subscriptions (status, next_invoice_date)
  where status = 'ACTIVE' and auto_generate_invoice = true;
create index subscriptions_customer_idx on public.subscriptions (customer_id);

-- ========== invoices ==========
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id),
  customer_id uuid not null references public.customers (id),
  subscription_id uuid references public.subscriptions (id),
  invoice_number text not null,
  invoice_type public.invoice_type not null default 'PROJECT',
  issue_date date not null,
  due_date date not null,
  currency text not null default 'IDR',
  status public.invoice_status not null default 'DRAFT',
  subtotal bigint not null default 0,
  discount_amount bigint not null default 0 check (discount_amount >= 0),
  tax_amount bigint not null default 0,
  additional_fee bigint not null default 0 check (additional_fee >= 0),
  total_amount bigint not null default 0,
  amount_paid bigint not null default 0,
  balance_due bigint not null default 0,
  allow_partial_payment boolean not null default true,
  template_id uuid references public.invoice_templates (id),
  payment_method_id uuid references public.payment_methods (id),
  customer_notes text,
  internal_notes text,
  terms text,
  public_token text not null unique,
  sent_at timestamptz,
  viewed_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  subscription_period_start date,
  subscription_period_end date,
  unique (owner_id, invoice_number)
);
create index invoices_owner_status_idx on public.invoices (owner_id, status) where deleted_at is null;
create index invoices_customer_idx on public.invoices (customer_id) where deleted_at is null;
create index invoices_due_idx on public.invoices (due_date) where deleted_at is null;
create unique index invoices_sub_period_uidx
  on public.invoices (subscription_id, subscription_period_start)
  where subscription_id is not null and subscription_period_start is not null and deleted_at is null;

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  product_id uuid references public.products (id),
  position integer not null default 0,
  name text not null,
  description text,
  quantity integer not null check (quantity > 0),
  unit text,
  unit_price bigint not null check (unit_price >= 0),
  discount_amount bigint not null default 0 check (discount_amount >= 0),
  tax_rate integer not null default 0 check (tax_rate >= 0),
  tax_amount bigint not null default 0,
  line_total bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index invoice_items_invoice_idx on public.invoice_items (invoice_id, position);

-- ========== payments ==========
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id),
  invoice_id uuid not null references public.invoices (id),
  customer_id uuid not null references public.customers (id),
  payment_number text not null,
  amount bigint not null check (amount > 0),
  payment_date date not null,
  method text,
  sender_name text,
  reference_number text,
  proof_url text,
  status public.payment_status not null default 'PENDING',
  notes text,
  submitted_by uuid references public.profiles (id),
  verified_by uuid references public.profiles (id),
  verified_at timestamptz,
  rejection_reason text,
  source text not null default 'staff' check (source in ('staff', 'portal', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  unique (owner_id, payment_number)
);
create index payments_invoice_status_idx on public.payments (invoice_id, status);

-- updated_at triggers
do $$
declare
  t text;
begin
  foreach t in array array[
    'customers','products','business_settings','payment_methods','invoice_sequences',
    'invoice_templates','subscriptions','invoices','invoice_items','payments'
  ]
  loop
    execute format(
      'create trigger %I_set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end $$;

-- sequence RPC (row lock)
create or replace function public.next_document_number(
  p_owner_id uuid,
  p_prefix text,
  p_year integer
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last integer;
  v_next integer;
begin
  insert into public.invoice_sequences (owner_id, year, prefix, last_number)
  values (p_owner_id, p_year, p_prefix, 0)
  on conflict (owner_id, year, prefix) do nothing;

  select last_number into v_last
  from public.invoice_sequences
  where owner_id = p_owner_id and year = p_year and prefix = p_prefix
  for update;

  v_next := v_last + 1;
  update public.invoice_sequences
  set last_number = v_next, updated_at = now()
  where owner_id = p_owner_id and year = p_year and prefix = p_prefix;

  return p_prefix || '-' || p_year::text || '-' || lpad(v_next::text, 4, '0');
end;
$$;

-- invoice protected-field guard (service role bypass via set_config)
create or replace function public.enforce_invoice_update_guard()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.bypass_invoice_guard', true) = 'on' then
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

create trigger trg_invoice_update_guard
  before update on public.invoices
  for each row execute function public.enforce_invoice_update_guard();

-- service helper: set bypass for a single statement chain (used from security definer RPCs)
create or replace function public.rpc_set_invoice_bypass()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.bypass_invoice_guard', 'on', true);
end;
$$;

-- ========== RLS ==========
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.business_settings enable row level security;
alter table public.payment_methods enable row level security;
alter table public.invoice_sequences enable row level security;
alter table public.activity_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.invoice_templates enable row level security;
alter table public.subscriptions enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;

-- customers
create policy customers_staff_select on public.customers for select
  using (is_staff() and owner_id = current_owner_id());
create policy customers_staff_insert on public.customers for insert
  with check (is_staff() and owner_id = current_owner_id());
create policy customers_staff_update on public.customers for update
  using (is_staff() and owner_id = current_owner_id());
create policy customers_developer_delete on public.customers for delete
  using (app_role() = 'DEVELOPER' and owner_id = current_owner_id());
create policy customers_user_select on public.customers for select
  using (app_role() = 'USER' and id = current_customer_id());

-- products
create policy products_staff_select on public.products for select
  using (is_staff() and owner_id = current_owner_id());
create policy products_staff_insert on public.products for insert
  with check (is_staff() and owner_id = current_owner_id());
create policy products_staff_update on public.products for update
  using (is_staff() and owner_id = current_owner_id());
create policy products_developer_delete on public.products for delete
  using (app_role() = 'DEVELOPER' and owner_id = current_owner_id());

-- business_settings: staff read; write via service (Developer) — allow developer update
create policy business_settings_staff_select on public.business_settings for select
  using (is_staff() and owner_id = current_owner_id());
create policy business_settings_dev_insert on public.business_settings for insert
  with check (app_role() = 'DEVELOPER' and owner_id = current_owner_id());
create policy business_settings_dev_update on public.business_settings for update
  using (app_role() = 'DEVELOPER' and owner_id = current_owner_id());

-- payment_methods: staff read; developer write
create policy payment_methods_staff_select on public.payment_methods for select
  using (is_staff() and owner_id = current_owner_id());
create policy payment_methods_dev_all on public.payment_methods for all
  using (app_role() = 'DEVELOPER' and owner_id = current_owner_id())
  with check (app_role() = 'DEVELOPER' and owner_id = current_owner_id());

-- sequences: staff read only
create policy invoice_sequences_staff_select on public.invoice_sequences for select
  using (is_staff() and owner_id = current_owner_id());

-- activity_logs
create policy activity_logs_developer_select on public.activity_logs for select
  using (app_role() = 'DEVELOPER' and owner_id = current_owner_id());
create policy activity_logs_admin_select on public.activity_logs for select
  using (
    app_role() = 'ADMIN' and owner_id = current_owner_id()
    and action not in (
      'settings.business.update',
      'settings.payment_method.update',
      'settings.payment_method.create',
      'user.role_change',
      'user.developer_action',
      'secrets.access'
    )
    and entity_type not in ('business_settings', 'invoice_sequences')
  );

-- notifications
create policy notifications_select_own on public.notifications for select
  using (user_id = auth.uid());
create policy notifications_update_own on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- templates
create policy templates_staff_select on public.invoice_templates for select
  using (is_staff() and owner_id = current_owner_id());
create policy templates_dev_all on public.invoice_templates for all
  using (app_role() = 'DEVELOPER' and owner_id = current_owner_id())
  with check (app_role() = 'DEVELOPER' and owner_id = current_owner_id());

-- subscriptions
create policy subscriptions_staff_select on public.subscriptions for select
  using (is_staff() and owner_id = current_owner_id());
create policy subscriptions_staff_insert on public.subscriptions for insert
  with check (is_staff() and owner_id = current_owner_id());
create policy subscriptions_staff_update on public.subscriptions for update
  using (is_staff() and owner_id = current_owner_id());
create policy subscriptions_developer_delete on public.subscriptions for delete
  using (app_role() = 'DEVELOPER' and owner_id = current_owner_id());
create policy subscriptions_user_select on public.subscriptions for select
  using (app_role() = 'USER' and customer_id = current_customer_id());

-- invoices
create policy invoices_staff_select on public.invoices for select
  using (is_staff() and owner_id = current_owner_id() and deleted_at is null);
create policy invoices_staff_insert on public.invoices for insert
  with check (is_staff() and owner_id = current_owner_id());
create policy invoices_staff_update on public.invoices for update
  using (is_staff() and owner_id = current_owner_id());
create policy invoices_developer_delete on public.invoices for delete
  using (app_role() = 'DEVELOPER' and owner_id = current_owner_id());
create policy invoices_user_select on public.invoices for select
  using (
    app_role() = 'USER'
    and customer_id = current_customer_id()
    and deleted_at is null
  );

-- invoice_items via parent
create policy invoice_items_staff_select on public.invoice_items for select
  using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_id and is_staff() and i.owner_id = current_owner_id()
    )
  );
create policy invoice_items_staff_write on public.invoice_items for all
  using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_id and is_staff() and i.owner_id = current_owner_id()
    )
  )
  with check (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_id and is_staff() and i.owner_id = current_owner_id()
    )
  );
create policy invoice_items_user_select on public.invoice_items for select
  using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_id
        and app_role() = 'USER'
        and i.customer_id = current_customer_id()
        and i.deleted_at is null
    )
  );

-- payments
create policy payments_staff_select on public.payments for select
  using (is_staff() and owner_id = current_owner_id());
create policy payments_staff_insert on public.payments for insert
  with check (is_staff() and owner_id = current_owner_id());
create policy payments_user_select on public.payments for select
  using (app_role() = 'USER' and customer_id = current_customer_id());
create policy payments_user_insert on public.payments for insert
  with check (
    app_role() = 'USER'
    and customer_id = current_customer_id()
    and status = 'PENDING'
    and source = 'portal'
    and submitted_by = auth.uid()
    and invoice_id in (
      select id from public.invoices
      where customer_id = current_customer_id()
        and status in ('SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE')
        and deleted_at is null
    )
  );

-- storage buckets (idempotent)
insert into storage.buckets (id, name, public)
values
  ('business-assets', 'business-assets', false),
  ('payment-proofs', 'payment-proofs', false),
  ('invoice-pdfs', 'invoice-pdfs', false),
  ('avatars', 'avatars', false)
on conflict (id) do nothing;

-- storage: staff read business assets under owner folder
create policy business_assets_staff_select on storage.objects for select
  using (
    bucket_id = 'business-assets'
    and is_staff()
    and (storage.foldername(name))[1] = current_owner_id()::text
  );
create policy business_assets_dev_write on storage.objects for insert
  with check (
    bucket_id = 'business-assets'
    and app_role() = 'DEVELOPER'
    and (storage.foldername(name))[1] = current_owner_id()::text
  );

create policy payment_proofs_staff_select on storage.objects for select
  using (
    bucket_id = 'payment-proofs'
    and is_staff()
    and (storage.foldername(name))[1] = current_owner_id()::text
  );
create policy payment_proofs_user_select on storage.objects for select
  using (
    bucket_id = 'payment-proofs'
    and app_role() = 'USER'
    and exists (
      select 1 from public.invoices i
      where i.customer_id = current_customer_id()
        and (storage.foldername(name))[2] = i.id::text
    )
  );
create policy payment_proofs_user_insert on storage.objects for insert
  with check (
    bucket_id = 'payment-proofs'
    and app_role() = 'USER'
    and exists (
      select 1 from public.invoices i
      where i.customer_id = current_customer_id()
        and (storage.foldername(name))[2] = i.id::text
    )
  );

create policy avatars_own on storage.objects for all
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy invoice_pdfs_staff_select on storage.objects for select
  using (
    bucket_id = 'invoice-pdfs'
    and is_staff()
    and (storage.foldername(name))[1] = current_owner_id()::text
  );

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.next_document_number(uuid, text, integer) to authenticated, service_role;
grant execute on function public.rpc_set_invoice_bypass() to service_role;
