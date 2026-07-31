import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/types/database";
import { ownerIdOf } from "@/lib/auth/owner";

export async function logActivity(input: {
  profile?: Profile | null;
  ownerId?: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  description: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const admin = createAdminClient();
  const ownerId =
    input.ownerId ??
    (input.profile ? ownerIdOf(input.profile) : null);
  if (!ownerId) return;

  await admin.from("activity_logs").insert({
    owner_id: ownerId,
    actor_id: input.profile?.id ?? null,
    actor_role: input.profile?.role ?? "SYSTEM",
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    description: input.description,
    old_values: input.oldValues ?? null,
    new_values: input.newValues ?? null,
    ip_address: input.ip ?? null,
    user_agent: input.userAgent ?? null,
  });
}

export async function notifyUsers(input: {
  userIds: string[];
  type: string;
  title: string;
  message: string;
  targetType?: string;
  targetId?: string;
}) {
  if (!input.userIds.length) return;
  const admin = createAdminClient();
  await admin.from("notifications").insert(
    input.userIds.map((user_id) => ({
      user_id,
      type: input.type,
      title: input.title,
      message: input.message,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
    })),
  );
}

export async function staffUserIds(ownerId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id,role,owner_id,status")
    .eq("status", "ACTIVE")
    .in("role", ["DEVELOPER", "ADMIN"]);
  return (data ?? [])
    .filter(
      (p) =>
        p.id === ownerId ||
        p.owner_id === ownerId ||
        (p.role === "DEVELOPER" && p.id === ownerId),
    )
    .map((p) => p.id as string);
}

export async function userIdsForCustomer(customerId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("customer_id", customerId)
    .eq("role", "USER")
    .eq("status", "ACTIVE");
  return (data ?? []).map((p) => p.id as string);
}
