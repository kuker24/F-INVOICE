import "server-only";
import type { Profile } from "@/types/database";

/** Business root id for scoping data. */
export function ownerIdOf(profile: Profile): string {
  if (profile.role === "DEVELOPER") return profile.id;
  if (!profile.owner_id) {
    throw new Error("PROFILE_MISSING_OWNER");
  }
  return profile.owner_id;
}
