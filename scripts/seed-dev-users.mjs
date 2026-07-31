/**
 * Dev-only: create auth users + profiles via service role.
 * Usage:
 *   node --env-file=.env.local scripts/seed-dev-users.mjs
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL.
 * Do not run against production.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !service) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed in production");
  process.exit(1);
}

const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const password = process.env.SEED_PASSWORD ?? "password123";

const users = [
  {
    email: "developer@finvoice.local",
    full_name: "Developer Utama",
    role: "DEVELOPER",
  },
  {
    email: "admin@finvoice.local",
    full_name: "Admin Ops",
    role: "ADMIN",
  },
];

async function upsertUser({ email, full_name, role }) {
  const { data: listed } = await admin.auth.admin.listUsers({ perPage: 200 });
  let user = listed?.users?.find((u) => u.email === email);

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    });
    if (error) throw error;
    user = data.user;
    console.log("created auth user", email, user.id);
  } else {
    console.log("auth user exists", email, user.id);
  }

  return user;
}

const dev = await upsertUser(users[0]);
const adm = await upsertUser(users[1]);

const { error: devErr } = await admin.from("profiles").upsert(
  {
    id: dev.id,
    full_name: users[0].full_name,
    email: users[0].email,
    role: "DEVELOPER",
    status: "ACTIVE",
    owner_id: null,
  },
  { onConflict: "id" },
);
if (devErr) throw devErr;

const { error: admErr } = await admin.from("profiles").upsert(
  {
    id: adm.id,
    full_name: users[1].full_name,
    email: users[1].email,
    role: "ADMIN",
    status: "ACTIVE",
    owner_id: dev.id,
  },
  { onConflict: "id" },
);
if (admErr) throw admErr;

console.log("Seed OK. Password:", password);
console.log("developer@finvoice.local → /dashboard");
console.log("admin@finvoice.local → /dashboard");
console.log("USER seed deferred to PR2 (needs customers).");
