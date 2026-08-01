"use server";

import { revalidatePath } from "next/cache";
import { requireVerifiedProfile } from "@/lib/auth/profile";
import { fail, ok, toActionError, type ActionResult } from "@/server/errors";
import { subscriptionSchema } from "@/lib/validation/invoice";
import * as subs from "@/server/services/subscriptions";

async function staff() {
  const s = await requireVerifiedProfile();
  if (!s) throw Object.assign(new Error("Login dulu."), { code: "UNAUTHORIZED" });
  return s.profile;
}

export async function createSubscriptionAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const profile = await staff();
    const parsed = subscriptionSchema.safeParse(raw);
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid");
    }
    const s = await subs.createSubscription(profile, parsed.data);
    revalidatePath("/subscriptions");
    return ok({ id: s.id });
  } catch (e) {
    return toActionError(e);
  }
}

export async function pauseSubscriptionAction(id: string): Promise<ActionResult> {
  try {
    const profile = await staff();
    await subs.updateSubscriptionStatus(profile, id, "PAUSED");
    revalidatePath("/subscriptions");
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

export async function resumeSubscriptionAction(id: string): Promise<ActionResult> {
  try {
    const profile = await staff();
    await subs.updateSubscriptionStatus(profile, id, "ACTIVE");
    revalidatePath("/subscriptions");
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

export async function cancelSubscriptionAction(id: string): Promise<ActionResult> {
  try {
    const profile = await staff();
    await subs.updateSubscriptionStatus(profile, id, "CANCELLED");
    revalidatePath("/subscriptions");
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

export async function generateSubscriptionInvoiceAction(
  id: string,
): Promise<
  ActionResult<{
    invoiceId: string;
    invoiceNumber?: string;
    status?: string;
    skipped: boolean;
  }>
> {
  try {
    const profile = await staff();
    const r = await subs.generateSubscriptionInvoice(profile, id);
    revalidatePath("/subscriptions");
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${r.invoiceId}`);
    revalidatePath("/portal/invoices");
    return ok(r);
  } catch (e) {
    return toActionError(e);
  }
}
