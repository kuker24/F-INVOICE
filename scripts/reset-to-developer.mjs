/**
 * Wipe all app data + auth users, then create one DEVELOPER from akun/akun.txt.
 *
 * Usage:
 *   node --env-file=.env.local scripts/reset-to-developer.mjs
 *
 * Destructive. Service role required.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !service) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (url.includes("placeholder")) {
  console.error("Refusing placeholder Supabase URL");
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const akunRaw = readFileSync(resolve(root, "akun/akun.txt"), "utf8");
const email = akunRaw.match(/^\s*developer\s*:\s*(\S+)/im)?.[1]?.trim();
const password = akunRaw.match(/^\s*password\s*:\s*(\S+)/im)?.[1]?.trim();
if (!email || !password) {
  console.error("akun/akun.txt needs developer: and password: lines");
  process.exit(1);
}

const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function wipeAll(table) {
  // Match every row: created_at always set on our schema tables that have it;
  // for others use id neq zero-uuid.
  let res = await admin
    .from(table)
    .delete({ count: "exact" })
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (res.error) {
    res = await admin.from(table).delete({ count: "exact" }).gte("created_at", "1970-01-01");
  }
  if (res.error) throw new Error(`${table}: ${res.error.message}`);
  console.log("wiped", table, res.count ?? 0);
}

async function listAuthUsers() {
  const out = [];
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const batch = data?.users ?? [];
    out.push(...batch);
    if (batch.length < 200) break;
    page += 1;
  }
  return out;
}

async function deleteAuth(id, label) {
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    const msg = error.message || error.error || error.msg || JSON.stringify(error);
    throw new Error(`deleteUser ${label}: ${msg}`);
  }
  console.log("deleted auth", label);
}

console.log("=== F-INVOICE hard reset ===");
console.log("target developer:", email);

// 1) domain children first (no profiles/customers yet)
for (const t of [
  "payments",
  "invoice_items",
  "invoices",
  "subscriptions",
  "notifications",
  "activity_logs",
  "invoice_sequences",
  "invoice_templates",
  "payment_methods",
  "products",
  "business_settings",
]) {
  await wipeAll(t);
}

// 2) remove non-DEVELOPER auth users (profiles cascade; frees customers.customer_id)
{
  const users = await listAuthUsers();
  const { data: profs } = await admin.from("profiles").select("id,role,email");
  const roleOf = new Map((profs ?? []).map((p) => [p.id, p.role]));
  for (const u of users) {
    if (roleOf.get(u.id) === "DEVELOPER") continue;
    await deleteAuth(u.id, u.email ?? u.id);
  }
}

// 3) customers (owner_id → developer profile still ok)
await wipeAll("customers");

// 4) developer auth last
{
  const users = await listAuthUsers();
  for (const u of users) {
    await deleteAuth(u.id, u.email ?? u.id);
  }
}

// 5) orphan profiles
{
  const { data } = await admin.from("profiles").select("id,email");
  for (const p of data ?? []) {
    const { error } = await admin.from("profiles").delete().eq("id", p.id);
    if (error) throw new Error(`profile ${p.email}: ${error.message}`);
    console.log("deleted orphan profile", p.email);
  }
}

// 6) new developer
const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: "Developer", role: "DEVELOPER" },
});
if (createErr) throw createErr;
const dev = created.user;
console.log("created auth", email, dev.id);

const { error: profErr } = await admin.from("profiles").upsert(
  {
    id: dev.id,
    full_name: "Developer",
    email,
    role: "DEVELOPER",
    status: "ACTIVE",
    owner_id: null,
    customer_id: null,
  },
  { onConflict: "id" },
);
if (profErr) throw profErr;

const { error: bsErr } = await admin.from("business_settings").upsert(
  {
    owner_id: dev.id,
    business_name: "F-INVOICE",
    email,
    invoice_prefix: "INV",
    payment_prefix: "PAY",
    default_due_days: 7,
    timezone: "Asia/Jakarta",
    default_currency: "IDR",
    show_revenue_to_admin: true,
  },
  { onConflict: "owner_id" },
);
if (bsErr) throw bsErr;

const { error: tplErr } = await admin.from("invoice_templates").insert({
  owner_id: dev.id,
  name: "Minimal",
  slug: "minimal",
  layout_type: "MINIMAL",
  is_default: true,
  status: "ACTIVE",
  show_signature: true,
});
if (tplErr) throw tplErr;

// 7) verify
const tables = [
  "profiles",
  "customers",
  "products",
  "invoices",
  "invoice_items",
  "payments",
  "subscriptions",
  "payment_methods",
  "business_settings",
  "invoice_templates",
  "activity_logs",
  "notifications",
  "invoice_sequences",
];
console.log("--- counts ---");
for (const t of tables) {
  const { count, error } = await admin.from(t).select("*", { count: "exact", head: true });
  console.log(t, error ? `ERR ${error.message}` : count);
}
const left = await listAuthUsers();
console.log(
  "auth_users",
  left.map((u) => u.email).join(", ") || "(none)",
);

const { data: got, error: gErr } = await admin.auth.admin.getUserById(dev.id);
if (gErr || !got?.user) throw gErr ?? new Error("developer missing after create");
console.log("=== RESET OK ===");
console.log("login:", email, "→ /dashboard");
console.log("admin/user: none — create from app");
