/**
 * API smoke against running app or direct Supabase.
 * Usage: node --env-file=.env.local scripts/smoke-api.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const password = process.env.SEED_PASSWORD ?? "password123";

if (!url || !service || !anon) {
  console.error("Missing env");
  process.exit(1);
}

const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const client = createClient(url, anon);

let fails = 0;
function ok(label) {
  console.log("OK ", label);
}
function fail(label, err) {
  fails++;
  console.error("FAIL", label, err?.message ?? err);
}

// tables exist
{
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
  ];
  for (const t of tables) {
    const { error } = await admin.from(t).select("*").limit(1);
    if (error) fail(`table ${t}`, error);
    else ok(`table ${t}`);
  }
}

// auth roles
for (const email of [
  "developer@finvoice.local",
  "admin@finvoice.local",
  "customer@finvoice.local",
]) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    fail(`login ${email}`, error);
    continue;
  }
  const { data: profile, error: pe } = await client
    .from("profiles")
    .select("role,status")
    .eq("id", data.user.id)
    .single();
  if (pe) fail(`profile ${email}`, pe);
  else ok(`login ${email} → ${profile.role}/${profile.status}`);
  await client.auth.signOut();
}

// RPC next_document_number
{
  const { data: dev } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "DEVELOPER")
    .eq("status", "ACTIVE")
    .single();
  if (!dev) {
    fail("developer profile missing");
  } else {
    const year = new Date().getFullYear();
    const { data, error } = await admin.rpc("next_document_number", {
      p_owner_id: dev.id,
      p_prefix: "SMOKE",
      p_year: year,
    });
    if (error) fail("next_document_number", error);
    else ok(`next_document_number → ${data}`);
  }
}

// storage buckets
{
  const { data, error } = await admin.storage.listBuckets();
  if (error) fail("list buckets", error);
  else {
    const ids = (data ?? []).map((b) => b.id).sort();
    const need = ["avatars", "business-assets", "invoice-pdfs", "payment-proofs"];
    for (const id of need) {
      if (ids.includes(id)) ok(`bucket ${id}`);
      else fail(`bucket ${id}`, new Error("missing"));
    }
  }
}

if (fails) {
  console.error(`\nSMOKE FAILED: ${fails} error(s)`);
  process.exit(1);
}
console.log("\nSMOKE ALL OK");
