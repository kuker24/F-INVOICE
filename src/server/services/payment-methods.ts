import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { PaymentMethod, PaymentMethodType, Profile, RecordStatus } from "@/types/database";
import { ownerIdOf } from "@/lib/auth/owner";
import { assertStaff } from "@/lib/permissions/assert";
import { AppError } from "@/server/errors";
import { logActivity } from "@/server/services/activity";

export type PaymentMethodInput = {
  type: PaymentMethodType;
  bank_name?: string | null;
  account_number?: string | null;
  account_holder?: string | null;
  branch?: string | null;
  instructions?: string | null;
  is_default?: boolean;
  status?: RecordStatus;
};

export async function listPaymentMethods(profile: Profile) {
  assertStaff(profile);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .order("is_default", { ascending: false });
  if (error) throw new AppError("LIST_FAILED", error.message);
  return (data ?? []) as PaymentMethod[];
}

export async function createPaymentMethod(
  profile: Profile,
  input: PaymentMethodInput,
) {
  if (profile.role !== "DEVELOPER") {
    throw new AppError("FORBIDDEN", "Hanya Developer yang mengelola metode bayar.");
  }
  const admin = createAdminClient();
  const ownerId = ownerIdOf(profile);
  if (input.is_default) {
    await admin
      .from("payment_methods")
      .update({ is_default: false })
      .eq("owner_id", ownerId);
  }
  const { data, error } = await admin
    .from("payment_methods")
    .insert({
      owner_id: ownerId,
      type: input.type,
      bank_name: input.bank_name ?? null,
      account_number: input.account_number ?? null,
      account_holder: input.account_holder ?? null,
      branch: input.branch ?? null,
      instructions: input.instructions ?? null,
      is_default: input.is_default ?? false,
      status: input.status ?? "ACTIVE",
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("CREATE_FAILED", error?.message ?? "Gagal buat metode.");
  }
  await logActivity({
    profile,
    action: "settings.payment_method.create",
    entityType: "payment_method",
    entityId: data.id,
    description: "Buat metode pembayaran",
  });
  return data as PaymentMethod;
}

export async function updatePaymentMethod(
  profile: Profile,
  id: string,
  input: Partial<PaymentMethodInput>,
) {
  if (profile.role !== "DEVELOPER") {
    throw new AppError("FORBIDDEN", "Hanya Developer yang mengelola metode bayar.");
  }
  const admin = createAdminClient();
  const ownerId = ownerIdOf(profile);
  if (input.is_default) {
    await admin
      .from("payment_methods")
      .update({ is_default: false })
      .eq("owner_id", ownerId);
  }
  const { data, error } = await admin
    .from("payment_methods")
    .update(input)
    .eq("id", id)
    .eq("owner_id", ownerId)
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("UPDATE_FAILED", error?.message ?? "Gagal update metode.");
  }
  await logActivity({
    profile,
    action: "settings.payment_method.update",
    entityType: "payment_method",
    entityId: id,
    description: "Update metode pembayaran",
  });
  return data as PaymentMethod;
}
