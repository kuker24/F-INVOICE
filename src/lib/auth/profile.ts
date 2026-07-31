import "server-only";
import { cache } from "react";
import type { Profile } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import {
  identityToProfile,
  readMiddlewareIdentity,
} from "@/lib/auth/request-identity";

/**
 * One profile per request.
 * Layout/page: prefer middleware identity headers (0 extra Supabase RTT).
 * Server actions / no middleware headers: full getUser + profiles.
 */
export const getSessionProfile = cache(async (): Promise<{
  userId: string;
  profile: Profile;
} | null> => {
  const fromMw = await readMiddlewareIdentity();
  if (fromMw && fromMw.status === "ACTIVE") {
    return {
      userId: fromMw.userId,
      profile: identityToProfile(fromMw),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id,full_name,email,phone,avatar_url,role,status,customer_id,owner_id,last_login_at,created_by,created_at,updated_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) return null;
  return { userId: user.id, profile: profile as Profile };
});

/** Mutations: always re-verify JWT (never trust middleware headers alone). */
export async function requireVerifiedProfile(): Promise<{
  userId: string;
  profile: Profile;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id,full_name,email,phone,avatar_url,role,status,customer_id,owner_id,last_login_at,created_by,created_at,updated_at",
    )
    .eq("id", user.id)
    .maybeSingle();
  if (error || !profile || (profile as Profile).status !== "ACTIVE") {
    throw new Error("UNAUTHENTICATED");
  }
  return { userId: user.id, profile: profile as Profile };
}

export function homePathForRole(role: Profile["role"]): string {
  return role === "USER" ? "/portal" : "/dashboard";
}

export function isStaff(role: Profile["role"]): boolean {
  return role === "DEVELOPER" || role === "ADMIN";
}
