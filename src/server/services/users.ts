import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types/database";
import { ownerIdOf } from "@/lib/auth/owner";
import { assertStaff } from "@/lib/permissions/assert";
import { AppError } from "@/server/errors";
import { logActivity } from "@/server/services/activity";
import { getPublicEnv } from "@/config/public-env";

export async function listUsers(profile: Profile) {
  assertStaff(profile);
  const admin = createAdminClient();
  const ownerId = ownerIdOf(profile);
  let query = admin
    .from("profiles")
    .select("id,full_name,email,phone,role,status,customer_id,owner_id,created_at,last_login_at")
    .order("created_at", { ascending: false });
  if (profile.role === "ADMIN") {
    query = query.eq("role", "USER").eq("owner_id", ownerId);
  } else {
    query = query.or(`id.eq.${ownerId},owner_id.eq.${ownerId}`);
  }
  const { data, error } = await query;
  if (error) throw new AppError("LIST_FAILED", error.message);
  return data ?? [];
}

export async function inviteUser(
  profile: Profile,
  input: {
    email: string;
    full_name: string;
    role: "ADMIN" | "USER";
    customer_id?: string | null;
    phone?: string | null;
  },
) {
  assertStaff(profile);
  if (profile.role === "ADMIN" && input.role !== "USER") {
    throw new AppError("FORBIDDEN", "Admin hanya invite USER.");
  }
  if (input.role === "USER" && !input.customer_id) {
    throw new AppError("CUSTOMER_REQUIRED", "USER butuh customer_id.");
  }
  const ownerId = ownerIdOf(profile);
  const admin = createAdminClient();
  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;

  const { data: created, error: authErr } =
    await admin.auth.admin.inviteUserByEmail(input.email, {
      redirectTo: `${appUrl}/reset-password`,
      data: { full_name: input.full_name },
    });

  // fallback createUser if invite not configured
  let userId = created?.user?.id;
  if (authErr || !userId) {
    const { data: cu, error: cErr } = await admin.auth.admin.createUser({
      email: input.email,
      email_confirm: true,
      password: crypto.randomUUID().slice(0, 16) + "Aa1!",
      user_metadata: { full_name: input.full_name },
    });
    if (cErr || !cu.user) {
      throw new AppError(
        "INVITE_FAILED",
        authErr?.message ?? cErr?.message ?? "Gagal invite.",
      );
    }
    userId = cu.user.id;
  }

  const { error: pErr } = await admin.from("profiles").insert({
    id: userId,
    full_name: input.full_name,
    email: input.email.toLowerCase(),
    phone: input.phone ?? null,
    role: input.role as UserRole,
    status: "INVITED",
    customer_id: input.role === "USER" ? input.customer_id : null,
    owner_id: ownerId,
    created_by: profile.id,
  });
  if (pErr) {
    throw new AppError("PROFILE_CREATE_FAILED", pErr.message);
  }

  await logActivity({
    profile,
    action: "user.invite",
    entityType: "profile",
    entityId: userId,
    description: `Invite ${input.email} as ${input.role}`,
  });
}

export async function setUserStatus(
  profile: Profile,
  id: string,
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED",
) {
  assertStaff(profile);
  if (id === profile.id) {
    throw new AppError("SELF_STATUS", "Tidak bisa ubah status sendiri.");
  }
  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!target) throw new AppError("NOT_FOUND", "User tidak ditemukan.");
  if ((target as Profile).role === "DEVELOPER") {
    throw new AppError("FORBIDDEN", "Tidak bisa ubah Developer.");
  }
  if (profile.role === "ADMIN" && (target as Profile).role !== "USER") {
    throw new AppError("FORBIDDEN", "Admin hanya kelola USER.");
  }
  const { error } = await admin
    .from("profiles")
    .update({ status })
    .eq("id", id);
  if (error) throw new AppError("UPDATE_FAILED", error.message);
  await logActivity({
    profile,
    action: "user.status_change",
    entityType: "profile",
    entityId: id,
    description: `Status → ${status}`,
  });
}

export async function updateOwnProfile(
  profile: Profile,
  input: { full_name?: string; phone?: string | null },
) {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (input.full_name) patch.full_name = input.full_name.trim();
  if (input.phone !== undefined) patch.phone = input.phone;
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", profile.id)
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("UPDATE_FAILED", error?.message ?? "Gagal update profil.");
  }
  return data as Profile;
}
