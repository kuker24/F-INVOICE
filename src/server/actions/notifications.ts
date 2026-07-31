"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth/profile";
import { fail, ok, toActionError, type ActionResult } from "@/server/errors";
import * as n from "@/server/services/notifications";

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  try {
    const s = await getSessionProfile();
    if (!s) return fail("UNAUTHORIZED", "Login dulu.");
    await n.markNotificationRead(s.profile, id);
    revalidatePath("/dashboard");
    revalidatePath("/portal");
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  try {
    const s = await getSessionProfile();
    if (!s) return fail("UNAUTHORIZED", "Login dulu.");
    await n.markAllNotificationsRead(s.profile);
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}
