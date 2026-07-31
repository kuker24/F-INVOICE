import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { BillingType, Product, ProductStatus, Profile } from "@/types/database";
import { ownerIdOf } from "@/lib/auth/owner";
import { assertStaff } from "@/lib/permissions/assert";
import { AppError } from "@/server/errors";
import { logActivity } from "@/server/services/activity";

export type ProductInput = {
  code: string;
  name: string;
  description?: string | null;
  category?: string | null;
  default_price: number;
  unit?: string | null;
  billing_type?: BillingType;
  default_tax_rate?: number;
  status?: ProductStatus;
};

export async function listProducts(profile: Profile, q?: string) {
  assertStaff(profile);
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select(
      "id,code,name,category,default_price,unit,billing_type,default_tax_rate,status,created_at,updated_at,deleted_at,owner_id",
    )
    .is("deleted_at", null)
    .order("name");
  if (q?.trim()) {
    query = query.or(`name.ilike.%${q.trim()}%,code.ilike.%${q.trim()}%`);
  }
  const { data, error } = await query;
  if (error) throw new AppError("LIST_FAILED", error.message);
  return (data ?? []) as Product[];
}

export async function createProduct(profile: Profile, input: ProductInput) {
  assertStaff(profile);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("products")
    .insert({
      owner_id: ownerIdOf(profile),
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      description: input.description ?? null,
      category: input.category ?? null,
      default_price: input.default_price,
      unit: input.unit ?? null,
      billing_type: input.billing_type ?? "ONE_TIME",
      default_tax_rate: input.default_tax_rate ?? 0,
      status: input.status ?? "ACTIVE",
      created_by: profile.id,
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("CREATE_FAILED", error?.message ?? "Gagal buat produk.");
  }
  await logActivity({
    profile,
    action: "product.create",
    entityType: "product",
    entityId: data.id,
    description: `Buat produk ${data.name}`,
  });
  return data as Product;
}

export async function updateProduct(
  profile: Profile,
  id: string,
  input: Partial<ProductInput>,
) {
  assertStaff(profile);
  const admin = createAdminClient();
  const patch: Record<string, unknown> = { ...input };
  if (typeof patch.code === "string") {
    patch.code = (patch.code as string).trim().toUpperCase();
  }
  const { data, error } = await admin
    .from("products")
    .update(patch)
    .eq("id", id)
    .eq("owner_id", ownerIdOf(profile))
    .is("deleted_at", null)
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("UPDATE_FAILED", error?.message ?? "Gagal update produk.");
  }
  await logActivity({
    profile,
    action: "product.update",
    entityType: "product",
    entityId: id,
    description: `Update produk ${data.name}`,
  });
  return data as Product;
}

export async function archiveProduct(profile: Profile, id: string) {
  assertStaff(profile);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("products")
    .update({ status: "ARCHIVED", deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", ownerIdOf(profile))
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("ARCHIVE_FAILED", error?.message ?? "Gagal arsip.");
  }
  return data as Product;
}

export async function hardDeleteProduct(
  profile: Profile,
  id: string,
  confirm: string,
) {
  if (profile.role !== "DEVELOPER") {
    throw new AppError("FORBIDDEN", "Hanya Developer yang hard-delete.");
  }
  if (confirm !== "HAPUS") {
    throw new AppError("CONFIRM_REQUIRED", "Ketik HAPUS untuk konfirmasi.");
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("products")
    .delete()
    .eq("id", id)
    .eq("owner_id", ownerIdOf(profile));
  if (error) throw new AppError("DELETE_FAILED", error.message);
}
