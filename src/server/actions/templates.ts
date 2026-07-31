"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireVerifiedProfile } from "@/lib/auth/profile";
import { fail, ok, toActionError, type ActionResult } from "@/server/errors";
import * as templates from "@/server/services/templates";

const schema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(64),
  layout_type: z.enum(["MINIMAL", "CORPORATE"]),
  footer_text: z.string().max(2000).optional().nullable(),
  show_signature: z.boolean().optional(),
  is_default: z.boolean().optional(),
});

export async function upsertTemplateAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const s = await requireVerifiedProfile();
    if (!s) return fail("UNAUTHORIZED", "Login dulu.");
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid");
    }
    const t = await templates.upsertTemplate(s.profile, parsed.data);
    revalidatePath("/templates");
    return ok({ id: t.id });
  } catch (e) {
    return toActionError(e);
  }
}
