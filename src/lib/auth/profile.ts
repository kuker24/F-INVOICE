import "server-only";
import { cache } from "react";
import type { Profile } from "@/types/database";
import { createClient } from "@/lib/supabase/server";

/** One auth+profile round-trip per request (layout + page share). */
export const getSessionProfile = cache(async (): Promise<{
  userId: string;
  profile: Profile;
} | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) return null;
  return { userId: user.id, profile: profile as Profile };
});

export function homePathForRole(role: Profile["role"]): string {
  return role === "USER" ? "/portal" : "/dashboard";
}

export function isStaff(role: Profile["role"]): boolean {
  return role === "DEVELOPER" || role === "ADMIN";
}
