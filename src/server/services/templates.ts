import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { InvoiceTemplate, Profile, TemplateLayout } from "@/types/database";
import { ownerIdOf } from "@/lib/auth/owner";
import { assertStaff } from "@/lib/permissions/assert";
import { AppError } from "@/server/errors";
import { logActivity } from "@/server/services/activity";

export async function listTemplates(profile: Profile) {
  assertStaff(profile);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoice_templates")
    .select("*")
    .order("name");
  if (error) throw new AppError("LIST_FAILED", error.message);
  return (data ?? []) as InvoiceTemplate[];
}

export async function ensureDefaultTemplate(ownerId: string) {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("invoice_templates")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("slug", "minimal")
    .maybeSingle();
  if (existing) return existing as InvoiceTemplate;
  const { data, error } = await admin
    .from("invoice_templates")
    .insert({
      owner_id: ownerId,
      name: "Minimal",
      slug: "minimal",
      layout_type: "MINIMAL" as TemplateLayout,
      is_default: true,
      status: "ACTIVE",
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("TEMPLATE_SEED_FAILED", error?.message ?? "Gagal seed template");
  }
  return data as InvoiceTemplate;
}

export async function upsertTemplate(
  profile: Profile,
  input: {
    id?: string;
    name: string;
    slug: string;
    layout_type: TemplateLayout;
    footer_text?: string | null;
    show_signature?: boolean;
    is_default?: boolean;
  },
) {
  if (profile.role !== "DEVELOPER") {
    throw new AppError("FORBIDDEN", "Hanya Developer.");
  }
  const admin = createAdminClient();
  const ownerId = ownerIdOf(profile);
  if (input.is_default) {
    await admin
      .from("invoice_templates")
      .update({ is_default: false })
      .eq("owner_id", ownerId);
  }
  if (input.id) {
    const { data, error } = await admin
      .from("invoice_templates")
      .update({
        name: input.name,
        slug: input.slug,
        layout_type: input.layout_type,
        footer_text: input.footer_text ?? null,
        show_signature: input.show_signature ?? true,
        is_default: input.is_default ?? false,
      })
      .eq("id", input.id)
      .eq("owner_id", ownerId)
      .select("*")
      .single();
    if (error || !data) {
      throw new AppError("UPDATE_FAILED", error?.message ?? "Gagal update");
    }
    return data as InvoiceTemplate;
  }
  const { data, error } = await admin
    .from("invoice_templates")
    .insert({
      owner_id: ownerId,
      name: input.name,
      slug: input.slug,
      layout_type: input.layout_type,
      footer_text: input.footer_text ?? null,
      show_signature: input.show_signature ?? true,
      is_default: input.is_default ?? false,
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("CREATE_FAILED", error?.message ?? "Gagal buat");
  }
  await logActivity({
    profile,
    action: "template.upsert",
    entityType: "invoice_template",
    entityId: data.id,
    description: `Template ${data.name}`,
  });
  return data as InvoiceTemplate;
}
