-- Dev seed only — NEVER run on production.
-- Requires auth.users rows created first (see scripts/seed-dev-users.md).
--
-- After creating auth users with these emails via Supabase Admin API / dashboard:
--   developer@finvoice.local
--   admin@finvoice.local
--   customer@finvoice.local
--
-- Then upsert profiles (replace UUIDs with real auth.users.id):

-- example (replace ids):
-- insert into public.profiles (id, full_name, email, role, status, owner_id)
-- values
--   ('DEV_UUID', 'Developer Utama', 'developer@finvoice.local', 'DEVELOPER', 'ACTIVE', null);
--
-- insert into public.profiles (id, full_name, email, role, status, owner_id)
-- values
--   ('ADMIN_UUID', 'Admin Ops', 'admin@finvoice.local', 'ADMIN', 'ACTIVE', 'DEV_UUID');
--
-- customer_id FK lands in PR2; USER seed after customers table exists.

select 1;
