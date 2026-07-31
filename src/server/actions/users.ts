"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireVerifiedProfile } from "@/lib/auth/profile";
import { fail, ok, toActionError, type ActionResult } from "@/server/errors";
import * as users from "@/server/services/users";

async function requireSession() {
  const s = await requireVerifiedProfile();
  if (!s) throw Object.assign(new Error("Login dulu."), { code: "UNAUTHORIZED" });
  return s.profile;
}

const inviteSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1).max(200),
  role: z.enum(["ADMIN", "USER"]),
  customer_id: z.string().uuid().optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
});

export async function inviteUserAction(raw: unknown): Promise<ActionResult> {
  try {
    const profile = await requireSession();
    const parsed = inviteSchema.safeParse(raw);
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid");
    }
    await users.inviteUser(profile, parsed.data);
    revalidatePath("/users");
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

export async function setUserStatusAction(
  id: string,
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED",
): Promise<ActionResult> {
  try {
    const profile = await requireSession();
    await users.setUserStatus(profile, id, status);
    revalidatePath("/users");
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

export async function updateOwnProfileAction(raw: unknown): Promise<ActionResult> {
  try {
    const profile = await requireSession();
    const parsed = z
      .object({
        full_name: z.string().min(1).max(200).optional(),
        phone: z.string().max(40).optional().nullable(),
      })
      .safeParse(raw);
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid");
    }
    await users.updateOwnProfile(profile, parsed.data);
    revalidatePath("/portal/profile");
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}
