import "server-only";
import type { Profile, UserRole } from "@/types/database";

export class PermissionError extends Error {
  code = "FORBIDDEN" as const;
  constructor(message = "Akses ditolak.") {
    super(message);
    this.name = "PermissionError";
  }
}

export function assertRole(profile: Profile, roles: UserRole[]) {
  if (!roles.includes(profile.role)) {
    throw new PermissionError();
  }
  if (profile.status !== "ACTIVE") {
    throw new PermissionError("Akun tidak aktif.");
  }
}

export function assertStaff(profile: Profile) {
  assertRole(profile, ["DEVELOPER", "ADMIN"]);
}

export function assertActive(profile: Profile) {
  if (profile.status !== "ACTIVE") {
    throw new PermissionError("Akun tidak aktif.");
  }
}
