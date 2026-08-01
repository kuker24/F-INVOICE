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
      show_signature: true,
      status: "ACTIVE",
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError(
      "TEMPLATE_SEED_FAILED",
      error?.message ?? "Gagal seed template",
    );
  }
  return data as InvoiceTemplate;
}

export type TemplateUpsertInput = {
  id?: string;
  name: string;
  slug: string;
  layout_type: TemplateLayout;
  footer_text?: string | null;
  show_signature?: boolean;
  is_default?: boolean;
};

function normalizeSlug(slug: string) {
  return slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export async function upsertTemplate(
  profile: Profile,
  input: TemplateUpsertInput,
) {
  if (profile.role !== "DEVELOPER") {
    throw new AppError("FORBIDDEN", "Hanya Developer.");
  }
  const admin = createAdminClient();
  const ownerId = ownerIdOf(profile);
  const slug = normalizeSlug(input.slug);
  if (!slug) {
    throw new AppError("VALIDATION_ERROR", "Slug tidak valid.");
  }

  const showSignature = input.show_signature ?? true;
  const isDefault = input.is_default ?? false;
  const footer =
    typeof input.footer_text === "string" && input.footer_text.trim()
      ? input.footer_text.trim()
      : null;

  // Resolve existing row: explicit id, else owner+slug (true upsert).
  let existingId = input.id?.trim() || null;
  if (!existingId) {
    const { data: bySlug } = await admin
      .from("invoice_templates")
      .select("id")
      .eq("owner_id", ownerId)
      .eq("slug", slug)
      .maybeSingle();
    existingId = (bySlug?.id as string) ?? null;
  } else {
    const { data: byId } = await admin
      .from("invoice_templates")
      .select("id")
      .eq("id", existingId)
      .eq("owner_id", ownerId)
      .maybeSingle();
    if (!byId) {
      throw new AppError("NOT_FOUND", "Template tidak ditemukan.");
    }
  }

  const patch = {
    name: input.name.trim(),
    slug,
    layout_type: input.layout_type,
    footer_text: footer,
    show_signature: showSignature,
    is_default: isDefault,
    status: "ACTIVE" as const,
  };

  let saved: InvoiceTemplate;

  if (existingId) {
    const { data, error } = await admin
      .from("invoice_templates")
      .update(patch)
      .eq("id", existingId)
      .eq("owner_id", ownerId)
      .select("*")
      .single();
    if (error || !data) {
      const msg = error?.message ?? "Gagal update";
      if (msg.includes("invoice_templates_owner_id_slug_key")) {
        throw new AppError(
          "DUPLICATE_SLUG",
          "Slug sudah dipakai template lain. Ganti slug atau edit template yang ada.",
        );
      }
      throw new AppError("UPDATE_FAILED", msg);
    }
    saved = data as InvoiceTemplate;
    await logActivity({
      profile,
      action: "template.update",
      entityType: "invoice_template",
      entityId: saved.id,
      description: `Update template ${saved.name} (signature=${showSignature})`,
    });
  } else {
    const { data, error } = await admin
      .from("invoice_templates")
      .insert({
        owner_id: ownerId,
        ...patch,
      })
      .select("*")
      .single();
    if (error || !data) {
      const msg = error?.message ?? "Gagal buat";
      if (msg.includes("invoice_templates_owner_id_slug_key")) {
        throw new AppError(
          "DUPLICATE_SLUG",
          "Slug sudah dipakai. Simpan lagi akan memperbarui template yang ada.",
        );
      }
      throw new AppError("CREATE_FAILED", msg);
    }
    saved = data as InvoiceTemplate;
    await logActivity({
      profile,
      action: "template.create",
      entityType: "invoice_template",
      entityId: saved.id,
      description: `Buat template ${saved.name}`,
    });
  }

  // Only clear other defaults after a successful write (avoid empty-default state).
  if (isDefault) {
    await admin
      .from("invoice_templates")
      .update({ is_default: false })
      .eq("owner_id", ownerId)
      .neq("id", saved.id);
  }

  return saved;
}
