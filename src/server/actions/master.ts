"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth/profile";
import { fail, ok, toActionError, type ActionResult } from "@/server/errors";
import {
  businessSettingsSchema,
  customerSchema,
  paymentMethodSchema,
  productSchema,
} from "@/lib/validation/master";
import * as customers from "@/server/services/customers";
import * as products from "@/server/services/products";
import * as pmethods from "@/server/services/payment-methods";
import * as settings from "@/server/services/settings";

async function staff() {
  const s = await getSessionProfile();
  if (!s) throw Object.assign(new Error("Login dulu."), { code: "UNAUTHORIZED" });
  return s.profile;
}

export async function createCustomerAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const profile = await staff();
    const parsed = customerSchema.safeParse(raw);
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid");
    }
    const c = await customers.createCustomer(profile, {
      ...parsed.data,
      email: parsed.data.email || null,
    });
    revalidatePath("/customers");
    return ok({ id: c.id });
  } catch (e) {
    return toActionError(e);
  }
}

export async function updateCustomerAction(
  id: string,
  raw: unknown,
): Promise<ActionResult> {
  try {
    const profile = await staff();
    const parsed = customerSchema.partial().safeParse(raw);
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid");
    }
    await customers.updateCustomer(profile, id, parsed.data);
    revalidatePath("/customers");
    revalidatePath(`/customers/${id}`);
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

export async function archiveCustomerAction(id: string): Promise<ActionResult> {
  try {
    const profile = await staff();
    await customers.archiveCustomer(profile, id);
    revalidatePath("/customers");
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

export async function hardDeleteCustomerAction(
  id: string,
  confirm: string,
): Promise<ActionResult> {
  try {
    const profile = await staff();
    await customers.hardDeleteCustomer(profile, id, confirm);
    revalidatePath("/customers");
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

export async function createProductAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const profile = await staff();
    const parsed = productSchema.safeParse(raw);
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid");
    }
    const p = await products.createProduct(profile, parsed.data);
    revalidatePath("/products");
    return ok({ id: p.id });
  } catch (e) {
    return toActionError(e);
  }
}

export async function updateProductAction(
  id: string,
  raw: unknown,
): Promise<ActionResult> {
  try {
    const profile = await staff();
    const parsed = productSchema.partial().safeParse(raw);
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid");
    }
    await products.updateProduct(profile, id, parsed.data);
    revalidatePath("/products");
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

export async function archiveProductAction(id: string): Promise<ActionResult> {
  try {
    const profile = await staff();
    await products.archiveProduct(profile, id);
    revalidatePath("/products");
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

export async function createPaymentMethodAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const profile = await staff();
    const parsed = paymentMethodSchema.safeParse(raw);
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid");
    }
    const m = await pmethods.createPaymentMethod(profile, parsed.data);
    revalidatePath("/settings/payment-methods");
    return ok({ id: m.id });
  } catch (e) {
    return toActionError(e);
  }
}

export async function updateBusinessSettingsAction(
  raw: unknown,
): Promise<ActionResult> {
  try {
    const profile = await staff();
    const parsed = businessSettingsSchema.safeParse(raw);
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid");
    }
    await settings.updateBusinessSettings(profile, {
      ...parsed.data,
      email: parsed.data.email || null,
    });
    revalidatePath("/settings/business");
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}
