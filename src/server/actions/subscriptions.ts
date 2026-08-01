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

function emptyToNull(v: unknown) {
  if (v === "" || v === undefined) return null;
  return v;
}

export async function createSubscriptionAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const profile = await staff();
    const body =
      raw && typeof raw === "object"
        ? {
            ...(raw as Record<string, unknown>),
            product_id: emptyToNull((raw as Record<string, unknown>).product_id),
            description: emptyToNull((raw as Record<string, unknown>).description),
            template_id: emptyToNull((raw as Record<string, unknown>).template_id),
            payment_method_id: emptyToNull(
              (raw as Record<string, unknown>).payment_method_id,
            ),
            end_date: emptyToNull((raw as Record<string, unknown>).end_date),
            next_invoice_date: emptyToNull(
              (raw as Record<string, unknown>).next_invoice_date,
            ),
            custom_interval_days: emptyToNull(
              (raw as Record<string, unknown>).custom_interval_days,
            ),
          }
        : raw;
    const parsed = subscriptionSchema.safeParse(body);
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
