import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Notification, Profile } from "@/types/database";
import { AppError } from "@/server/errors";

export async function listMyNotifications(profile: Profile, limit = 30) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id,title,message,is_read,created_at,target_type,target_id,type,read_at,user_id")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new AppError("LIST_FAILED", error.message);
  return (data ?? []) as Notification[];
}

export async function markNotificationRead(profile: Profile, id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", profile.id);
  if (error) throw new AppError("UPDATE_FAILED", error.message);
}

export async function markAllNotificationsRead(profile: Profile) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", profile.id)
    .eq("is_read", false);
  if (error) throw new AppError("UPDATE_FAILED", error.message);
}
