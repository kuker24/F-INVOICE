import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ActivityLog, Profile } from "@/types/database";
import { assertStaff } from "@/lib/permissions/assert";
import { AppError } from "@/server/errors";

export async function listActivityLogs(profile: Profile, limit = 100) {
  assertStaff(profile);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new AppError("LIST_FAILED", error.message);
  return (data ?? []) as ActivityLog[];
}
