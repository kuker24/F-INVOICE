"use server";

import { revalidatePath } from "next/cache";
import { requireVerifiedProfile } from "@/lib/auth/profile";
import { fail, ok, toActionError, type ActionResult } from "@/server/errors";
import {
  paymentConfirmSchema,
  paymentRecordSchema,
} from "@/lib/validation/invoice";
import * as payments from "@/server/services/payments";

async function requireSession() {
  const s = await requireVerifiedProfile();
  if (!s) throw Object.assign(new Error("Login dulu."), { code: "UNAUTHORIZED" });
  return s.profile;
}

export async function recordPaymentAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const profile = await requireSession();
    const parsed = paymentRecordSchema.safeParse(raw);
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid");
    }
    const p = await payments.recordPayment(profile, parsed.data);
    revalidatePath("/payments");
    revalidatePath("/invoices");
    return ok({ id: p.id });
  } catch (e) {
    return toActionError(e);
  }
}

export async function submitPortalPaymentAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const profile = await requireSession();
    const parsed = paymentConfirmSchema
      .extend({ invoice_id: paymentRecordSchema.shape.invoice_id })
      .safeParse(raw);
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid");
    }
    const p = await payments.submitPortalPayment(profile, {
      ...parsed.data,
      invoice_id: parsed.data.invoice_id!,
    });
    revalidatePath("/portal/payments");
    return ok({ id: p.id });
  } catch (e) {
    return toActionError(e);
  }
}

export async function verifyPaymentAction(id: string): Promise<ActionResult> {
  try {
    const profile = await requireSession();
    await payments.verifyPayment(profile, id);
    revalidatePath("/payments");
    revalidatePath("/invoices");
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

export async function rejectPaymentAction(
  id: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const profile = await requireSession();
    await payments.rejectPayment(profile, id, reason);
    revalidatePath("/payments");
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

export async function cancelPaymentAction(id: string): Promise<ActionResult> {
  try {
    const profile = await requireSession();
    await payments.cancelPayment(profile, id);
    revalidatePath("/payments");
    revalidatePath("/invoices");
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}
