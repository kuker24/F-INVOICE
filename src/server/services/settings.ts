import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BusinessSettings, Profile } from "@/types/database";
import { ownerIdOf } from "@/lib/auth/owner";
import { AppError } from "@/server/errors";

export async function ensureBusinessSettings(
  ownerId: string,
): Promise<BusinessSettings> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("business_settings")
    .select("*")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (existing) return existing as BusinessSettings;

  const { data, error } = await admin
    .from("business_settings")
    .insert({ owner_id: ownerId, business_name: "F-INVOICE" })
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("SETTINGS_CREATE_FAILED", error?.message ?? "Gagal buat settings");
  }
  return data as BusinessSettings;
}

export async function getBusinessSettings(profile: Profile) {
  return ensureBusinessSettings(ownerIdOf(profile));
}

export async function updateBusinessSettings(
  profile: Profile,
  patch: Partial<BusinessSettings>,
) {
  if (profile.role !== "DEVELOPER") {
    throw new AppError("FORBIDDEN", "Hanya Developer yang mengubah pengaturan.");
  }
  const ownerId = ownerIdOf(profile);
  await ensureBusinessSettings(ownerId);
  const admin = createAdminClient();
  const allowed: Record<string, unknown> = {};
  const keys = [
    "business_name",
    "legal_name",
    "address",
    "city",
    "province",
    "postal_code",
    "phone",
    "email",
    "website",
    "tax_id",
    "default_due_days",
    "default_terms",
    "default_notes",
    "timezone",
    "invoice_prefix",
    "payment_prefix",
    "show_revenue_to_admin",
  ] as const;
  for (const k of keys) {
    if (k in patch && patch[k] !== undefined) allowed[k] = patch[k];
  }
  const { data, error } = await admin
    .from("business_settings")
    .update(allowed)
    .eq("owner_id", ownerId)
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("SETTINGS_UPDATE_FAILED", error?.message ?? "Gagal update");
  }
  return data as BusinessSettings;
}
