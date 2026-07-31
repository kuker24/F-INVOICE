import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { checkRateLimit, PUBLIC_VIEW_LIMIT } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/server/services/activity";

export const preferredRegion = ["sin1"];

/** Fire-and-forget VIEWED mark — keeps public HTML ISR/CDN-able. */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  if (!token || token.length < 32) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";
  const rl = await checkRateLimit(
    `public-view:${ip}`,
    PUBLIC_VIEW_LIMIT.limit,
    PUBLIC_VIEW_LIMIT.windowMs,
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  try {
    const admin = createAdminClient();
    const { data: inv } = await admin
      .from("invoices")
      .select("id,owner_id,invoice_number,status,deleted_at")
      .eq("public_token", token)
      .maybeSingle();
    if (!inv || inv.deleted_at || inv.status === "DRAFT") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (inv.status === "SENT") {
      await admin.rpc("rpc_set_invoice_bypass");
      await admin
        .from("invoices")
        .update({
          status: "VIEWED",
          viewed_at: new Date().toISOString(),
        })
        .eq("id", inv.id)
        .eq("status", "SENT");
      await logActivity({
        ownerId: inv.owner_id as string,
        action: "invoice.public_view",
        entityType: "invoice",
        entityId: inv.id as string,
        description: `Public view ${inv.invoice_number}`,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: true }); // best-effort
  }
}
