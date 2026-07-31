-- F-INVOICE PR1 Foundation
-- enums, profiles, RLS helpers, baseline policies

create extension if not exists "pgcrypto";

-- Enums (full set from design — tables for later PRs use these)
create type public.user_role as enum ('DEVELOPER', 'ADMIN', 'USER');
create type public.account_status as enum ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'INVITED');
create type public.customer_type as enum ('INDIVIDUAL', 'COMPANY', 'SCHOOL', 'OTHER');
create type public.customer_status as enum ('ACTIVE', 'INACTIVE', 'ARCHIVED');
create type public.product_status as enum ('ACTIVE', 'INACTIVE', 'ARCHIVED');
create type public.billing_type as enum (
  'ONE_TIME', 'MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'YEARLY', 'CUSTOM'
);
create type public.invoice_status as enum (
  'DRAFT', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'
);
create type public.invoice_type as enum (
  'PROJECT', 'SUBSCRIPTION', 'MAINTENANCE', 'HOSTING', 'OTHER'
);
create type public.subscription_status as enum ('ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED');
create type public.billing_cycle as enum (
  'MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'YEARLY', 'CUSTOM'
);
create type public.payment_status as enum ('PENDING', 'VERIFIED', 'REJECTED', 'CANCELLED');
create type public.payment_method_type as enum ('BANK_TRANSFER', 'E_WALLET', 'CASH', 'OTHER');
create type public.record_status as enum ('ACTIVE', 'INACTIVE');
create type public.template_layout as enum ('MINIMAL', 'CORPORATE');

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  avatar_url text,
  role public.user_role not null,
  status public.account_status not null default 'INVITED',
  customer_id uuid,
  owner_id uuid references public.profiles (id),
  last_login_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_owner_binding check (
    (role = 'DEVELOPER' and (owner_id is null or owner_id = id))
    or (role in ('ADMIN', 'USER') and owner_id is not null)
  ),
  constraint profiles_user_customer check (
    (role = 'USER' and customer_id is not null)
    or (role in ('DEVELOPER', 'ADMIN'))
  )
);

create index profiles_role_idx on public.profiles (role);
create index profiles_status_idx on public.profiles (status);
create index profiles_customer_id_idx on public.profiles (customer_id);
create index profiles_owner_id_idx on public.profiles (owner_id);

-- at most one ACTIVE developer
create unique index profiles_one_active_developer
  on public.profiles (role)
  where role = 'DEVELOPER' and status = 'ACTIVE';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- RLS helpers
create or replace function public.app_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_owner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case
    when role = 'DEVELOPER' then id
    else owner_id
  end
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.current_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select customer_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('DEVELOPER', 'ADMIN')
      and status = 'ACTIVE'
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'ACTIVE'
  );
$$;

alter table public.profiles enable row level security;

-- own profile read
create policy profiles_select_self on public.profiles
  for select
  using (id = auth.uid() or is_staff());

-- staff can read profiles under same owner root
create policy profiles_select_staff_scope on public.profiles
  for select
  using (
    is_staff()
    and (
      id = current_owner_id()
      or owner_id = current_owner_id()
    )
  );

-- users update own limited fields (name/phone/avatar) via client; role/status via service
create policy profiles_update_self on public.profiles
  for update
  using (id = auth.uid() and is_active_user())
  with check (id = auth.uid());

-- inserts via service role / trigger only (no open insert policy for anon)

-- auto profile optional: disabled — invites create profile via service role
-- Document: disable public signup in Supabase Auth dashboard (Authentication → Providers → Email → Confirm email / disable signups)

comment on table public.profiles is 'F-INVOICE user profiles bound 1:1 to auth.users';
comment on column public.profiles.owner_id is 'ADMIN/USER: developer root id; DEVELOPER: null';
