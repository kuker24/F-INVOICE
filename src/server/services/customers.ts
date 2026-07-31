import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Customer, CustomerStatus, CustomerType, Profile } from "@/types/database";
import { ownerIdOf } from "@/lib/auth/owner";
import { assertStaff } from "@/lib/permissions/assert";
import { AppError } from "@/server/errors";
import { logActivity } from "@/server/services/activity";

export type CustomerInput = {
  code: string;
  name: string;
  type?: CustomerType;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  tax_id?: string | null;
  contact_person?: string | null;
  notes?: string | null;
  status?: CustomerStatus;
};

export async function listCustomers(profile: Profile, q?: string) {
  assertStaff(profile);
  const supabase = await createClient();
  let query = supabase
    .from("customers")
    .select("*")
    .is("deleted_at", null)
    .order("name");
  if (q?.trim()) {
    query = query.or(
      `name.ilike.%${q.trim()}%,code.ilike.%${q.trim()}%,email.ilike.%${q.trim()}%`,
    );
  }
  const { data, error } = await query;
  if (error) throw new AppError("LIST_FAILED", error.message);
  return (data ?? []) as Customer[];
}

export async function getCustomer(profile: Profile, id: string) {
  assertStaff(profile);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new AppError("GET_FAILED", error.message);
  if (!data) throw new AppError("NOT_FOUND", "Pelanggan tidak ditemukan.");
  return data as Customer;
}

export async function createCustomer(profile: Profile, input: CustomerInput) {
  assertStaff(profile);
  const ownerId = ownerIdOf(profile);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("customers")
    .insert({
      owner_id: ownerId,
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      type: input.type ?? "INDIVIDUAL",
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      province: input.province ?? null,
      postal_code: input.postal_code ?? null,
      tax_id: input.tax_id ?? null,
      contact_person: input.contact_person ?? null,
      notes: input.notes ?? null,
      status: input.status ?? "ACTIVE",
      created_by: profile.id,
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError(
      "CREATE_FAILED",
      error?.message?.includes("unique")
        ? "Kode pelanggan sudah dipakai."
        : (error?.message ?? "Gagal membuat pelanggan."),
    );
  }
  await logActivity({
    profile,
    action: "customer.create",
    entityType: "customer",
    entityId: data.id,
    description: `Buat pelanggan ${data.name}`,
  });
  return data as Customer;
}

export async function updateCustomer(
  profile: Profile,
  id: string,
  input: Partial<CustomerInput>,
) {
  assertStaff(profile);
  const admin = createAdminClient();
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) {
      patch[k === "code" && typeof v === "string" ? k : k] =
        k === "code" && typeof v === "string" ? v.trim().toUpperCase() : v;
    }
  }
  if (typeof patch.name === "string") patch.name = (patch.name as string).trim();
  const { data, error } = await admin
    .from("customers")
    .update(patch)
    .eq("id", id)
    .eq("owner_id", ownerIdOf(profile))
    .is("deleted_at", null)
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("UPDATE_FAILED", error?.message ?? "Gagal update pelanggan.");
  }
  await logActivity({
    profile,
    action: "customer.update",
    entityType: "customer",
    entityId: id,
    description: `Update pelanggan ${data.name}`,
  });
  return data as Customer;
}

export async function archiveCustomer(profile: Profile, id: string) {
  assertStaff(profile);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("customers")
    .update({
      status: "ARCHIVED",
      deleted_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("owner_id", ownerIdOf(profile))
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("ARCHIVE_FAILED", error?.message ?? "Gagal arsip.");
  }
  await logActivity({
    profile,
    action: "customer.archive",
    entityType: "customer",
    entityId: id,
    description: `Arsip pelanggan ${data.name}`,
  });
  return data as Customer;
}

export async function hardDeleteCustomer(profile: Profile, id: string, confirm: string) {
  if (profile.role !== "DEVELOPER") {
    throw new AppError("FORBIDDEN", "Hanya Developer yang hard-delete.");
  }
  if (confirm !== "HAPUS") {
    throw new AppError("CONFIRM_REQUIRED", "Ketik HAPUS untuk konfirmasi.");
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("owner_id", ownerIdOf(profile));
  if (error) throw new AppError("DELETE_FAILED", error.message);
  await logActivity({
    profile,
    action: "customer.hard_delete",
    entityType: "customer",
    entityId: id,
    description: `Hard delete pelanggan ${id}`,
  });
}
