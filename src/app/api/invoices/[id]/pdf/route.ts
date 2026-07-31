import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPdfSig } from "@/lib/pdf/sign";
import { buildInvoicePdfBuffer } from "@/server/services/pdf";
import type { Invoice } from "@/types/database";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const exp = Number(url.searchParams.get("exp") ?? 0);
  const sig = url.searchParams.get("sig") ?? "";
  const token = url.searchParams.get("token") ?? undefined;

  // Auth path: logged-in staff/user OR valid signed URL
  let allowed = false;
  if (sig && exp) {
    allowed = verifyPdfSig({ invoiceId: id, exp, token, sig });
  }

  if (!allowed) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role,customer_id,status")
        .eq("id", user.id)
        .maybeSingle();
      if (profile && profile.status === "ACTIVE") {
        const admin = createAdminClient();
        const { data: inv } = await admin
          .from("invoices")
          .select("customer_id,owner_id,status")
          .eq("id", id)
          .maybeSingle();
        if (inv) {
          if (
            profile.role === "DEVELOPER" ||
            profile.role === "ADMIN" ||
            (profile.role === "USER" &&
              profile.customer_id === (inv as Invoice).customer_id)
          ) {
            allowed = true;
          }
        }
      }
    }
  }

  // public token match
  if (!allowed && token) {
    const admin = createAdminClient();
    const { data: inv } = await admin
      .from("invoices")
      .select("public_token")
      .eq("id", id)
      .maybeSingle();
    if (inv && (inv as { public_token: string }).public_token === token) {
      if (sig && exp && verifyPdfSig({ invoiceId: id, exp, token, sig })) {
        allowed = true;
      }
    }
  }

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { buffer, filename } = await buildInvoicePdfBuffer(id);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "PDF failed" }, { status: 500 });
  }
}
