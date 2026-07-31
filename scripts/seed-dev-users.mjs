/**
 * Dev-only: auth users + profiles + demo master data via service role.
 * Usage:
 *   node --env-file=.env.local scripts/seed-dev-users.mjs
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL.
 * Do not run against production (NODE_ENV=production).
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

if (url.includes("placeholder")) {
  console.error("Refusing to seed against placeholder Supabase URL");
  process.exit(1);
}

const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const password = process.env.SEED_PASSWORD ?? "password123";

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

const dev = await upsertUser({
  email: "developer@finvoice.local",
  full_name: "Developer Utama",
  role: "DEVELOPER",
});
const adm = await upsertUser({
  email: "admin@finvoice.local",
  full_name: "Admin Ops",
  role: "ADMIN",
});

const { error: devErr } = await admin.from("profiles").upsert(
  {
    id: dev.id,
    full_name: "Developer Utama",
    email: "developer@finvoice.local",
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
    full_name: "Admin Ops",
    email: "admin@finvoice.local",
    role: "ADMIN",
    status: "ACTIVE",
    owner_id: dev.id,
  },
  { onConflict: "id" },
);
if (admErr) throw admErr;

// business settings
const { error: bsErr } = await admin.from("business_settings").upsert(
  {
    owner_id: dev.id,
    business_name: "F-INVOICE Demo",
    legal_name: "PT F-Invoice Demo",
    address: "Jl. Contoh No. 1",
    city: "Jakarta",
    province: "DKI Jakarta",
    phone: "021000000",
    email: "billing@finvoice.local",
    invoice_prefix: "FINV",
    payment_prefix: "PAY",
    default_due_days: 7,
    timezone: "Asia/Jakarta",
    default_currency: "IDR",
    show_revenue_to_admin: true,
  },
  { onConflict: "owner_id" },
);
if (bsErr) throw bsErr;

// customer
let customerId;
{
  const { data: existing } = await admin
    .from("customers")
    .select("id")
    .eq("owner_id", dev.id)
    .eq("code", "CUST-001")
    .maybeSingle();
  if (existing) {
    customerId = existing.id;
    console.log("customer exists", customerId);
  } else {
    const { data, error } = await admin
      .from("customers")
      .insert({
        owner_id: dev.id,
        code: "CUST-001",
        name: "Pelanggan Demo",
        type: "COMPANY",
        email: "customer@finvoice.local",
        phone: "08123456789",
        address: "Jl. Pelanggan 2",
        city: "Bandung",
        status: "ACTIVE",
        created_by: dev.id,
      })
      .select("id")
      .single();
    if (error) throw error;
    customerId = data.id;
    console.log("created customer", customerId);
  }
}

// portal USER
const custUser = await upsertUser({
  email: "customer@finvoice.local",
  full_name: "Pelanggan Portal",
  role: "USER",
});
const { error: userErr } = await admin.from("profiles").upsert(
  {
    id: custUser.id,
    full_name: "Pelanggan Portal",
    email: "customer@finvoice.local",
    role: "USER",
    status: "ACTIVE",
    owner_id: dev.id,
    customer_id: customerId,
  },
  { onConflict: "id" },
);
if (userErr) throw userErr;

// product
let productId;
{
  const { data: existing } = await admin
    .from("products")
    .select("id")
    .eq("owner_id", dev.id)
    .eq("code", "SVC-HOST")
    .maybeSingle();
  if (existing) {
    productId = existing.id;
  } else {
    const { data, error } = await admin
      .from("products")
      .insert({
        owner_id: dev.id,
        code: "SVC-HOST",
        name: "Hosting Bulanan",
        description: "Paket hosting demo",
        default_price: 150000,
        unit: "bulan",
        billing_type: "MONTHLY",
        default_tax_rate: 0,
        status: "ACTIVE",
        created_by: dev.id,
      })
      .select("id")
      .single();
    if (error) throw error;
    productId = data.id;
    console.log("created product", productId);
  }
}

// payment method
{
  const { data: existing } = await admin
    .from("payment_methods")
    .select("id")
    .eq("owner_id", dev.id)
    .limit(1)
    .maybeSingle();
  if (!existing) {
    const { error } = await admin.from("payment_methods").insert({
      owner_id: dev.id,
      type: "BANK_TRANSFER",
      bank_name: "BCA",
      account_number: "1234567890",
      account_holder: "PT F-Invoice Demo",
      is_default: true,
      status: "ACTIVE",
      instructions: "Transfer ke rekening di atas. Cantumkan nomor invoice.",
    });
    if (error) throw error;
    console.log("created payment method");
  }
}

// default template
{
  const { data: existing } = await admin
    .from("invoice_templates")
    .select("id")
    .eq("owner_id", dev.id)
    .eq("slug", "minimal")
    .maybeSingle();
  if (!existing) {
    const { error } = await admin.from("invoice_templates").insert({
      owner_id: dev.id,
      name: "Minimal",
      slug: "minimal",
      layout_type: "MINIMAL",
      is_default: true,
      status: "ACTIVE",
      show_signature: true,
    });
    if (error) throw error;
    console.log("created template");
  }
}

console.log("Seed OK. Password:", password);
console.log("developer@finvoice.local → /dashboard");
console.log("admin@finvoice.local → /dashboard");
console.log("customer@finvoice.local → /portal");
console.log("customer:", customerId, "product:", productId);
