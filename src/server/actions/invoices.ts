"use server";

import { revalidatePath } from "next/cache";
import { requireVerifiedProfile } from "@/lib/auth/profile";
import { fail, ok, toActionError, type ActionResult } from "@/server/errors";
import {
  createInvoiceSchema,
  updateInvoiceDraftSchema,
} from "@/lib/validation/invoice";
import * as invoices from "@/server/services/invoices";

async function staff() {
  const s = await requireVerifiedProfile();
  if (!s) throw Object.assign(new Error("Login dulu."), { code: "UNAUTHORIZED" });
  return s.profile;
}

export async function createInvoiceAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const profile = await staff();
    const parsed = createInvoiceSchema.safeParse(raw);
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid");
    }
    const inv = await invoices.createInvoice(profile, parsed.data);
    revalidatePath("/invoices");
    return ok({ id: inv.id });
  } catch (e) {
    return toActionError(e);
  }
}

export async function updateInvoiceDraftAction(
  id: string,
  raw: unknown,
): Promise<ActionResult> {
  try {
    const profile = await staff();
    const parsed = updateInvoiceDraftSchema.safeParse(raw);
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid");
    }
    await invoices.updateInvoiceDraft(profile, id, parsed.data);
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

export async function sendInvoiceAction(id: string): Promise<ActionResult> {
  try {
    const profile = await staff();
    await invoices.sendInvoice(profile, id);
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

export async function cancelInvoiceAction(id: string): Promise<ActionResult> {
  try {
    const profile = await staff();
    await invoices.cancelInvoice(profile, id);
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

export async function exportInvoicesCsvAction(): Promise<
  ActionResult<{ csv: string }>
> {
  try {
    const profile = await staff();
    const csv = await invoices.exportInvoicesCsv(profile);
    return ok({ csv });
  } catch (e) {
    return toActionError(e);
  }
}
